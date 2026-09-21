import type {
  ActionCheck,
  ActionsUsage,
  CheckConclusion,
  CheckStatus,
  OverallCiState,
  PullRequestItem,
  RepositoryDashboardData,
  UserRepositoryOption,
} from '../types';

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

let latestRateLimit: RateLimitInfo | null = null;

export function getLatestRateLimit(): RateLimitInfo | null {
  return latestRateLimit;
}

function updateRateLimitFromHeaders(headers: Headers): void {
  const remaining = headers.get('x-ratelimit-remaining');
  const limit = headers.get('x-ratelimit-limit');
  const reset = headers.get('x-ratelimit-reset');

  if (remaining && limit && reset) {
    latestRateLimit = {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      resetAt: new Date(parseInt(reset, 10) * 1000),
    };
  }
}

/**
 * トークンの妥当性を検証し、ユーザー名を取得する
 */
export async function validateToken(pat: string): Promise<{ username: string; avatarUrl: string }> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${pat.trim()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  updateRateLimitFromHeaders(res.headers);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('トークンが無効または有効期限切れです。');
    }
    throw new Error(`GitHub API エラー (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return {
    username: data.login,
    avatarUrl: data.avatar_url,
  };
}

/**
 * ユーザーの Actions 無料枠使用量を取得する
 */
export async function fetchActionsUsage(pat: string, username: string): Promise<ActionsUsage> {
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/settings/billing/usage/summary?product=actions`,
    {
      headers: {
        Authorization: `Bearer ${pat.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  updateRateLimitFromHeaders(res.headers);

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errorJson = await res.json();
      if (errorJson.message) {
        errorDetail = ` (${errorJson.message})`;
      }
    } catch {
      // JSON パース失敗時は無視
    }

    if (res.status === 403 || res.status === 404) {
      throw new Error(
        `Actions 使用量を取得できませんでした。Classic PAT に \`user\` スコープが付与されているかご確認ください（Fine-grained PAT は GitHub の Billing API に非対応です）。${errorDetail}`
      );
    }
    throw new Error(`Actions 使用量取得失敗 (${res.status}${errorDetail})`);
  }

  const data = await res.json();
  const includedMinutes = data.included_minutes || 2000;

  let totalMinutes = 0;
  let ubuntuMinutes = 0;
  let macMinutes = 0;
  let windowsMinutes = 0;

  if (Array.isArray(data.usageItems)) {
    for (const item of data.usageItems) {
      const sku = (item.sku || '').toLowerCase();
      const qty = item.grossQuantity ?? item.quantity ?? 0;
      totalMinutes += qty;

      if (sku.includes('linux') || sku.includes('ubuntu')) {
        ubuntuMinutes += qty;
      } else if (sku.includes('mac') || sku.includes('darwin')) {
        macMinutes += qty;
      } else if (sku.includes('win')) {
        windowsMinutes += qty;
      } else {
        ubuntuMinutes += qty;
      }
    }
  } else if (typeof data.total_minutes_used === 'number') {
    totalMinutes = data.total_minutes_used;
    ubuntuMinutes = data.minutes_used_breakdown?.UBUNTU || 0;
    macMinutes = data.minutes_used_breakdown?.MACOS || 0;
    windowsMinutes = data.minutes_used_breakdown?.WINDOWS || 0;
  }

  const percentage = includedMinutes > 0 ? Math.min(100, Math.round((totalMinutes / includedMinutes) * 100)) : 0;

  return {
    totalMinutesUsed: Math.round(totalMinutes),
    includedMinutes,
    usagePercentage: percentage,
    breakdown: {
      ubuntu: Math.round(ubuntuMinutes),
      macOS: Math.round(macMinutes),
      windows: Math.round(windowsMinutes),
    },
    lastUpdated: new Date().toISOString(),
  };
}

const REPO_PRS_QUERY = `
  query GetRepositoryPRsAndChecks($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      isPrivate
      pullRequests(first: 20, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          url
          updatedAt
          headRefName
          author {
            login
            avatarUrl
          }
          commits(last: 1) {
            nodes {
              commit {
                oid
                abbreviatedOid
                statusCheckRollup {
                  state
                  contexts(first: 25) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * リポジトリの Open PR および紐づく CI 実行結果を取得する
 */
export async function fetchRepositoryPRs(
  pat: string,
  owner: string,
  name: string
): Promise<RepositoryDashboardData> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: REPO_PRS_QUERY,
      variables: { owner, name },
    }),
  });

  updateRateLimitFromHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`GraphQL API エラー (${res.status}): ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors && json.errors.length > 0) {
    const message = json.errors[0]?.message || 'GraphQL エラーが発生しました';
    return {
      owner,
      name,
      fullName: `${owner}/${name}`,
      isPrivate: false,
      pullRequests: [],
      error: message,
    };
  }

  const repo = json.data?.repository;
  if (!repo) {
    return {
      owner,
      name,
      fullName: `${owner}/${name}`,
      isPrivate: false,
      pullRequests: [],
      error: 'リポジトリが見つかりません（アクセス権限または名前をご確認ください）',
    };
  }

  const prNodes = repo.pullRequests?.nodes || [];

  const pullRequests: PullRequestItem[] = prNodes.map((pr: any) => {
    const latestCommit = pr.commits?.nodes?.[0]?.commit;
    const rollup = latestCommit?.statusCheckRollup;
    const contextNodes = rollup?.contexts?.nodes || [];

    const checks: ActionCheck[] = contextNodes.map((c: any) => {
      if (c.__typename === 'CheckRun') {
        return {
          id: c.id,
          name: c.name,
          status: c.status as CheckStatus,
          conclusion: c.conclusion as CheckConclusion,
          detailsUrl: c.detailsUrl || '',
        };
      }
      // StatusContext (コミットステータス) の場合
      const statusMap: Record<string, { status: CheckStatus; conclusion: CheckConclusion }> = {
        SUCCESS: { status: 'COMPLETED', conclusion: 'SUCCESS' },
        FAILURE: { status: 'COMPLETED', conclusion: 'FAILURE' },
        ERROR: { status: 'COMPLETED', conclusion: 'FAILURE' },
        PENDING: { status: 'IN_PROGRESS', conclusion: null },
      };
      const mapped = statusMap[c.state] || { status: 'COMPLETED', conclusion: 'NEUTRAL' };
      return {
        id: c.id,
        name: c.context,
        status: mapped.status,
        conclusion: mapped.conclusion,
        detailsUrl: c.targetUrl || '',
      };
    });

    let overallCiState: OverallCiState = 'NONE';
    if (rollup?.state) {
      if (rollup.state === 'SUCCESS') overallCiState = 'SUCCESS';
      else if (['FAILURE', 'ERROR'].includes(rollup.state)) overallCiState = 'FAILURE';
      else if (['PENDING', 'EXPECTED'].includes(rollup.state)) overallCiState = 'PENDING';
    }

    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      updatedAt: pr.updatedAt,
      author: {
        login: pr.author?.login || 'ghost',
        avatarUrl: pr.author?.avatarUrl || '',
      },
      headBranch: pr.headRefName,
      headSha: latestCommit?.oid || '',
      shortSha: latestCommit?.abbreviatedOid || '',
      overallCiState,
      checks,
    };
  });

  return {
    owner,
    name,
    fullName: repo.nameWithOwner || `${owner}/${name}`,
    isPrivate: repo.isPrivate,
    pullRequests,
  };
}

let userReposCache: { pat: string; data: UserRepositoryOption[]; fetchedAt: number } | null = null;

/**
 * ログインユーザーがアクセス可能なリポジトリ一覧を取得する（直近更新順・最大100件）
 */
export async function fetchUserRepositories(
  pat: string,
  forceRefresh = false
): Promise<UserRepositoryOption[]> {
  const trimmedPat = pat.trim();
  if (!trimmedPat) return [];

  const now = Date.now();
  const CACHE_TTL_MS = 60 * 1000; // 1分キャッシュ

  if (!forceRefresh && userReposCache && userReposCache.pat === trimmedPat && now - userReposCache.fetchedAt < CACHE_TTL_MS) {
    return userReposCache.data;
  }

  const res = await fetch(
    'https://api.github.com/user/repos?sort=updated&direction=desc&per_page=100&affiliation=owner,collaborator,organization_member',
    {
      headers: {
        Authorization: `Bearer ${trimmedPat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  updateRateLimitFromHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`リポジトリ一覧の取得に失敗しました (${res.status}): ${res.statusText}`);
  }

  const list = await res.json();
  if (!Array.isArray(list)) {
    return [];
  }

  const result: UserRepositoryOption[] = list.map((item: any) => ({
    fullName: item.full_name,
    name: item.name,
    owner: item.owner?.login || '',
    isPrivate: item.private || false,
    description: item.description || null,
    updatedAt: item.updated_at,
    stargazersCount: item.stargazers_count || 0,
    fork: item.fork || false,
  }));

  userReposCache = {
    pat: trimmedPat,
    data: result,
    fetchedAt: now,
  };

  return result;
}
