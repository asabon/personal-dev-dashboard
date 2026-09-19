import type {
  ActionCheck,
  ActionsUsage,
  CheckConclusion,
  CheckStatus,
  OverallCiState,
  PullRequestItem,
  RepositoryDashboardData,
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
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/actions/usage`, {
    headers: {
      Authorization: `Bearer ${pat.trim()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  updateRateLimitFromHeaders(res.headers);

  if (!res.ok) {
    // 権限不足の場合（Fine-grained PAT で Plan 権限がない等）のフォールバック
    if (res.status === 403 || res.status === 404) {
      throw new Error(
        'Actions 使用量を取得できませんでした。トークンに `read:user` またはプラン閲覧権限が付与されているかご確認ください。'
      );
    }
    throw new Error(`Actions 使用量取得失敗 (${res.status})`);
  }

  const data = await res.json();
  const totalMinutes = data.total_minutes_used || 0;
  const includedMinutes = data.included_minutes || 2000;
  const percentage = includedMinutes > 0 ? Math.min(100, Math.round((totalMinutes / includedMinutes) * 100)) : 0;

  return {
    totalMinutesUsed: totalMinutes,
    includedMinutes,
    usagePercentage: percentage,
    breakdown: {
      ubuntu: data.minutes_used_breakdown?.UBUNTU || 0,
      macOS: data.minutes_used_breakdown?.MACOS || 0,
      windows: data.minutes_used_breakdown?.WINDOWS || 0,
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
