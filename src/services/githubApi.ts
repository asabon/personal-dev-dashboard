import type {
  ActionCheck,
  ActionsUsage,
  CheckConclusion,
  CheckStatus,
  OverallCiState,
  PullRequestItem,
  RepositoryDashboardData,
  UserRepositoryOption,
  SelfHostedRunner,
  WorkflowRunItem,
  WorkflowRunStatus,
  WorkflowRunConclusion,
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

function parseActionsUsageResponse(
  data: any,
  accountName?: string,
  accountType?: 'user' | 'org'
): ActionsUsage {
  const includedMinutes = data.included_minutes || 2000;

  let totalMinutes = 0;
  let ubuntuMinutes = 0;
  let macMinutes = 0;
  let windowsMinutes = 0;

  if (Array.isArray(data.usageItems)) {
    for (const item of data.usageItems) {
      if (item.unitType && item.unitType !== 'minutes') {
        continue;
      }
      const sku = (item.sku || '').toLowerCase();
      const qty = item.grossQuantity ?? item.quantity ?? 0;

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
    // OS ごとの消費倍率（Ubuntu x1, macOS x10, Windows x2）を適用して無料枠換算値を算出
    totalMinutes = (ubuntuMinutes * 1) + (macMinutes * 10) + (windowsMinutes * 2);
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
    accountName,
    accountType,
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
  return parseActionsUsageResponse(data, username, 'user');
}

/**
 * Organization の Actions 無料枠使用量を取得する
 */
export async function fetchOrgActionsUsage(pat: string, orgName: string): Promise<ActionsUsage> {
  const res = await fetch(
    `https://api.github.com/organizations/${encodeURIComponent(orgName)}/settings/billing/usage/summary?product=actions`,
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
        `Organization (${orgName}) の Actions 使用量を取得できませんでした。Classic PAT に \`admin:org\` スコープが付与されているか、または管理者権限があるかご確認ください。${errorDetail}`
      );
    }
    throw new Error(`Organization (${orgName}) の Actions 使用量取得失敗 (${res.status}${errorDetail})`);
  }

  const data = await res.json();
  return parseActionsUsageResponse(data, orgName, 'org');
}

const PR_NODES_FRAGMENT = `
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
`;

const REPO_PRS_QUERY = `
  query GetRepositoryPRsAndChecks($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      isPrivate
      isFork
      pushedAt
      updatedAt
      ${PR_NODES_FRAGMENT}
    }
  }
`;

const VIEWER_OWNED_REPOS_PRS_QUERY = `
  query GetViewerOwnedRepositoriesAndPRs {
    viewer {
      repositories(
        affiliations: [OWNER]
        isArchived: false
        first: 100
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        nodes {
          name
          nameWithOwner
          isPrivate
          isFork
          pushedAt
          updatedAt
          owner {
            login
          }
          ${PR_NODES_FRAGMENT}
        }
      }
    }
  }
`;

/**
 * リポジトリごとの最新活動日時（pushedAt / updatedAt / PR状態）を記録するキャッシュ（スマート差分ポーリング用）
 */
const repoActivityTimestamps = new Map<
  string,
  { pat: string; activityAt: string; hasPendingPrCi: boolean }
>();

/**
 * リポジトリの最新活動日時および Open PR 状態の指紋をキャッシュに記録する
 */
export function recordRepositoryActivity(
  pat: string,
  repoFullName: string,
  pushedAt?: string | null,
  updatedAt?: string | null,
  pullRequests: PullRequestItem[] = []
): void {
  const trimmedPat = pat.trim();
  const prFingerprint = pullRequests
    .map((pr) => `${pr.number}:${pr.headSha}:${pr.updatedAt}:${pr.overallCiState}`)
    .join(',');
  const activityAt = [pushedAt, updatedAt, prFingerprint].filter(Boolean).join('|');
  if (!trimmedPat || !repoFullName || !activityAt) return;
  const hasPendingPrCi = pullRequests.some((pr) => pr.overallCiState === 'PENDING');
  repoActivityTimestamps.set(repoFullName.toLowerCase(), {
    pat: trimmedPat,
    activityAt,
    hasPendingPrCi,
  });
}

/**
 * GraphQL の pullRequests.nodes 配列を PullRequestItem 配列へ変換する
 */
function parseGraphqlPullRequests(prNodes: any[]): PullRequestItem[] {
  if (!Array.isArray(prNodes)) return [];

  return prNodes.map((pr: any) => {
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
}

/**
 * ログインユーザーが所有する全リポジトリ（非アーカイブ・最大100件）と各 Open PR / CI 状況を 1 回の GraphQL リクエストで一括取得する
 */
export async function fetchViewerOwnedRepositoriesAndPRs(
  pat: string
): Promise<RepositoryDashboardData[]> {
  const trimmedPat = pat.trim();
  if (!trimmedPat) return [];

  const cacheGeneration = workflowRunsCacheGeneration;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${trimmedPat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: VIEWER_OWNED_REPOS_PRS_QUERY,
    }),
  });

  updateRateLimitFromHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`GraphQL API エラー (${res.status}): ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors && json.errors.length > 0 && !json.data?.viewer?.repositories) {
    const message = json.errors[0]?.message || 'GraphQL エラーが発生しました';
    throw new Error(message);
  }

  const repoNodes = json.data?.viewer?.repositories?.nodes;
  if (!Array.isArray(repoNodes)) {
    return [];
  }

  return repoNodes
    .filter((repo: any) => Boolean(repo && repo.name))
    .map((repo: any) => {
      const owner = repo.owner?.login || String(repo.nameWithOwner || '').split('/')[0] || '';
      const name = repo.name;
      const fullName = repo.nameWithOwner || `${owner}/${name}`;
      const pushedAt = typeof repo.pushedAt === 'string' ? repo.pushedAt : undefined;
      const updatedAt = typeof repo.updatedAt === 'string' ? repo.updatedAt : undefined;
      const pullRequests = parseGraphqlPullRequests(repo.pullRequests?.nodes || []);

      if (cacheGeneration === workflowRunsCacheGeneration) {
        recordRepositoryActivity(trimmedPat, fullName, pushedAt, updatedAt, pullRequests);
      }

      return {
        owner,
        name,
        fullName,
        isPrivate: Boolean(repo.isPrivate),
        isFork: Boolean(repo.isFork),
        pushedAt,
        updatedAt,
        pullRequests,
      };
    });
}

/**
 * リポジトリの Open PR および紐づく CI 実行結果を取得する
 */
export async function fetchRepositoryPRs(
  pat: string,
  owner: string,
  name: string
): Promise<RepositoryDashboardData> {
  const trimmedPat = pat.trim();
  const cacheGeneration = workflowRunsCacheGeneration;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${trimmedPat}`,
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

  const fullName = repo.nameWithOwner || `${owner}/${name}`;
  const pushedAt = typeof repo.pushedAt === 'string' ? repo.pushedAt : undefined;
  const updatedAt = typeof repo.updatedAt === 'string' ? repo.updatedAt : undefined;
  const pullRequests = parseGraphqlPullRequests(repo.pullRequests?.nodes || []);

  if (cacheGeneration === workflowRunsCacheGeneration) {
    recordRepositoryActivity(trimmedPat, fullName, pushedAt, updatedAt, pullRequests);
  }

  return {
    owner,
    name,
    fullName,
    isPrivate: Boolean(repo.isPrivate),
    isFork: Boolean(repo.isFork),
    pushedAt,
    updatedAt,
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

const EMPTY_RUNNERS_CACHE_TTL_MS = 10 * 60 * 1000;
const repoRunnersCache = new Map<
  string,
  {
    pat: string;
    runners: SelfHostedRunner[];
    fetchedAt: number;
    lastKnownActivityAt?: string;
  }
>();

/**
 * リポジトリ単位のセルフホステッドランナー一覧を取得する（ランナー0台のリポジトリは10分間ポーリングを抑制）
 */
async function fetchRepositoryRunners(
  pat: string,
  owner: string,
  repo: string
): Promise<SelfHostedRunner[]> {
  const trimmedPat = pat.trim();
  const repoFullName = `${owner}/${repo}`;
  const cacheKey = repoFullName.toLowerCase();
  const now = Date.now();
  const cached = repoRunnersCache.get(cacheKey);
  const recordedActivity = repoActivityTimestamps.get(cacheKey);
  const currentActivityAt =
    recordedActivity && recordedActivity.pat === trimmedPat
      ? recordedActivity.activityAt
      : undefined;
  const cacheGeneration = workflowRunsCacheGeneration;

  // 前回ランナーが 0 台だったリポジトリは、10分以内（またはリポジトリ更新がない間）再ポーリングをスキップ
  if (
    cached &&
    cached.pat === trimmedPat &&
    cached.runners.length === 0 &&
    now - cached.fetchedAt < EMPTY_RUNNERS_CACHE_TTL_MS &&
    (!currentActivityAt || !cached.lastKnownActivityAt || cached.lastKnownActivityAt === currentActivityAt)
  ) {
    return [];
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runners`,
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
      // 権限がない場合(403/404)は空リストとしてキャッシュし、毎分の無駄な再試行を防止
      if ((res.status === 403 || res.status === 404) && cacheGeneration === workflowRunsCacheGeneration) {
        repoRunnersCache.set(cacheKey, {
          pat: trimmedPat,
          runners: [],
          fetchedAt: Date.now(),
          lastKnownActivityAt: currentActivityAt,
        });
      }
      return [];
    }

    const data = await res.json();
    if (!data.runners || !Array.isArray(data.runners)) return [];

    const runners: SelfHostedRunner[] = data.runners.map((r: any) => ({
      id: r.id,
      name: r.name,
      os: r.os || 'Unknown',
      status: r.status === 'online' ? 'online' : 'offline',
      busy: Boolean(r.busy),
      labels: Array.isArray(r.labels) ? r.labels.map((l: any) => l.name) : [],
      scopeType: 'repo',
      scopeName: repoFullName,
    }));

    if (cacheGeneration === workflowRunsCacheGeneration) {
      repoRunnersCache.set(cacheKey, {
        pat: trimmedPat,
        runners,
        fetchedAt: Date.now(),
        lastKnownActivityAt: currentActivityAt,
      });
    }

    return runners;
  } catch (err) {
    console.warn(`Failed to fetch repo runners for ${repoFullName}:`, err);
    return [];
  }
}

/**
 * Organization 単位のセルフホステッドランナー一覧を取得する
 */
async function fetchOrgRunners(
  pat: string,
  org: string
): Promise<{ runners: SelfHostedRunner[]; warning?: string }> {
  try {
    const res = await fetch(`https://api.github.com/orgs/${encodeURIComponent(org)}/actions/runners`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    updateRateLimitFromHeaders(res.headers);

    if (res.status === 403) {
      return {
        runners: [],
        warning: `Organization「${org}」のランナー一覧を取得できませんでした。PAT に admin:org スコープが付与されているかご確認ください。`,
      };
    }

    if (!res.ok) {
      // 404 (個人アカウント等) の場合は無視
      return { runners: [] };
    }

    const data = await res.json();
    if (!data.runners || !Array.isArray(data.runners)) return { runners: [] };

    const runners: SelfHostedRunner[] = data.runners.map((r: any) => ({
      id: r.id,
      name: r.name,
      os: r.os || 'Unknown',
      status: r.status === 'online' ? 'online' : 'offline',
      busy: Boolean(r.busy),
      labels: Array.isArray(r.labels) ? r.labels.map((l: any) => l.name) : [],
      scopeType: 'org',
      scopeName: org,
    }));

    return { runners };
  } catch (err) {
    console.warn(`Failed to fetch org runners for ${org}:`, err);
    return { runners: [] };
  }
}

let userOrgsCache: { pat: string; data: string[]; fetchedAt: number } | null = null;

/**
 * ログインユーザーが所属する Organization 一覧を取得する
 */
export async function fetchUserOrganizations(
  pat: string,
  forceRefresh = false
): Promise<string[]> {
  const trimmedPat = pat.trim();
  if (!trimmedPat) return [];

  const now = Date.now();
  const CACHE_TTL_MS = 60 * 1000;

  if (!forceRefresh && userOrgsCache && userOrgsCache.pat === trimmedPat && now - userOrgsCache.fetchedAt < CACHE_TTL_MS) {
    return userOrgsCache.data;
  }

  try {
    const res = await fetch('https://api.github.com/user/orgs', {
      headers: {
        Authorization: `Bearer ${trimmedPat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    updateRateLimitFromHeaders(res.headers);

    if (!res.ok) {
      return [];
    }

    const list = await res.json();
    if (!Array.isArray(list)) return [];

    const orgs = list.map((item: any) => item.login).filter(Boolean);

    userOrgsCache = {
      pat: trimmedPat,
      data: orgs,
      fetchedAt: now,
    };

    return orgs;
  } catch (err) {
    console.warn('Failed to fetch user orgs:', err);
    return [];
  }
}

/**
 * 監視対象リポジトリ群および指定 Organization に関連するすべてのセルフホステッドランナーを取得する
 */
export async function fetchAllSelfHostedRunners(
  pat: string,
  repositories: string[],
  monitoredOrgs: string[] = [],
  currentUsername?: string
): Promise<{ runners: SelfHostedRunner[]; warning?: string }> {
  const trimmedPat = pat.trim();
  if (!trimmedPat && repositories.length === 0 && monitoredOrgs.length === 0) {
    return { runners: [] };
  }

  // ユニークな owner (Org候補) を抽出 (個人アカウント自身はスキップ)
  const extractedOwners = repositories
    .map((r) => r.split('/')[0])
    .filter((owner) => owner && (!currentUsername || owner.toLowerCase() !== currentUsername.toLowerCase()));

  // 監視対象 Org (リポジトリから抽出された Org + 明示的に監視指定された Org)
  const allOrgTargets = Array.from(new Set([...extractedOwners, ...monitoredOrgs]));

  // 1. 各リポジトリの専用ランナー取得
  const repoPromises = repositories.map(async (repoFullName) => {
    const [owner, name] = repoFullName.split('/');
    if (!owner || !name) return [];
    return fetchRepositoryRunners(trimmedPat, owner, name);
  });

  // 2. 各 Org の共有ランナー取得
  const orgPromises = allOrgTargets.map(async (org) => {
    return fetchOrgRunners(trimmedPat, org);
  });

  const [repoRunnersNested, orgResults] = await Promise.all([
    Promise.all(repoPromises),
    Promise.all(orgPromises),
  ]);

  const orgRunners = orgResults.flatMap((r) => r.runners);
  const warnings = orgResults.map((r) => r.warning).filter(Boolean) as string[];

  const allRunners: SelfHostedRunner[] = [
    ...orgRunners,
    ...repoRunnersNested.flat(),
  ];

  // 重複ランナー（同じ scopeType & id）の除去
  const seen = new Set<string>();
  const uniqueRunners: SelfHostedRunner[] = [];

  for (const runner of allRunners) {
    const key = `${runner.scopeType}-${runner.scopeName}-${runner.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRunners.push(runner);
    }
  }

  // ソート順: 状態（busy -> online -> offline）、次に名前順
  uniqueRunners.sort((a, b) => {
    const scoreA = a.busy ? 3 : a.status === 'online' ? 2 : 1;
    const scoreB = b.busy ? 3 : b.status === 'online' ? 2 : 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  });

  return {
    runners: uniqueRunners,
    warning: warnings.length > 0 ? warnings.join('\n') : undefined,
  };
}

const WORKFLOW_RUNS_CACHE_TTL_MS = 20 * 1000;
const MAX_UNCHANGED_WORKFLOW_RUNS_TTL_MS = 10 * 60 * 1000;
const MAX_WORKFLOW_RUN_REPOS = 20;
const MIN_RATE_LIMIT_RESERVE = 100;

const workflowRunsCache = new Map<
  string,
  {
    pat: string;
    runs: WorkflowRunItem[];
    warning?: string;
    incompleteCoverage?: boolean;
    fetchedAt: number;
    lastKnownActivityAt?: string;
  }
>();
const workflowAttemptConclusionCache = new Map<
  string,
  {
    pat: string;
    conclusion: WorkflowRunConclusion;
  }
>();
let workflowRunsCacheGeneration = 0;

/**
 * Actions ワークフロー実行履歴およびスマート差分ポーリング用のメモリキャッシュをクリアし、進行中の取得による再格納も無効化する
 */
export function clearWorkflowRunsCache(): void {
  workflowRunsCache.clear();
  workflowAttemptConclusionCache.clear();
  repoActivityTimestamps.clear();
  repoRunnersCache.clear();
  workflowRunsCacheGeneration += 1;
}

/**
 * ワークフロー実行結果が失敗（要対応）かどうかを判定する
 */
function isFailedWorkflowConclusion(conclusion: WorkflowRunConclusion): boolean {
  return (
    conclusion === 'failure' ||
    conclusion === 'timed_out' ||
    conclusion === 'action_required' ||
    conclusion === 'startup_failure'
  );
}

/**
 * 単一リポジトリの直近の Actions ワークフロー実行履歴を取得する
 */
export async function fetchRepositoryWorkflowRuns(
  pat: string,
  owner: string,
  repo: string,
  perPage = 30
): Promise<{ runs: WorkflowRunItem[]; warning?: string; incompleteCoverage?: boolean }> {
  const trimmedPat = pat.trim();
  const repoFullName = `${owner}/${repo}`;
  const cacheKey = `${repoFullName}::${perPage}`;
  const now = Date.now();
  const cached = workflowRunsCache.get(cacheKey);
  const recordedActivity = repoActivityTimestamps.get(repoFullName.toLowerCase());
  const currentActivityAt =
    recordedActivity && recordedActivity.pat === trimmedPat
      ? recordedActivity.activityAt
      : undefined;
  const cacheGeneration = workflowRunsCacheGeneration;

  if (cached && cached.pat === trimmedPat) {
    // 1. 短時間 TTL（20秒）以内の場合は無条件にキャッシュを返す
    if (now - cached.fetchedAt < WORKFLOW_RUNS_CACHE_TTL_MS) {
      return {
        runs: cached.runs,
        warning: cached.warning,
        incompleteCoverage: cached.incompleteCoverage,
      };
    }

    // 2. スマート差分スキップ: リポジトリの pushedAt/updatedAt/PR状態 が前回取得時から変化しておらず、
    //    進行中（in_progress / queued 等）や失敗中の Run もない平常時は無駄なポーリングをスキップ（最大10分間）
    //    ※失敗 Run がある場合は GitHub 上での Re-run 解消を即座に検知するためスキップしない
    const hasPendingPrCi = Boolean(
      recordedActivity && recordedActivity.pat === trimmedPat && recordedActivity.hasPendingPrCi
    );
    if (
      now - cached.fetchedAt < MAX_UNCHANGED_WORKFLOW_RUNS_TTL_MS &&
      currentActivityAt &&
      cached.lastKnownActivityAt === currentActivityAt &&
      !hasPendingPrCi &&
      !cached.incompleteCoverage &&
      !cached.warning &&
      cached.runs.every(
        (r) => r.status === 'completed' && !isFailedWorkflowConclusion(r.conclusion)
      )
    ) {
      return {
        runs: cached.runs,
        warning: cached.warning,
        incompleteCoverage: cached.incompleteCoverage,
      };
    }
  }

  // レート制限残数が少ない場合はキャッシュを返して通信を抑制
  if (
    latestRateLimit &&
    latestRateLimit.remaining < MIN_RATE_LIMIT_RESERVE &&
    latestRateLimit.resetAt.getTime() > now
  ) {
    return {
      runs: cached && cached.pat === trimmedPat ? cached.runs : [],
      warning: `${repoFullName}: GitHub API レート制限残数が少ないため (${latestRateLimit.remaining}/${latestRateLimit.limit})、Actions 実行履歴の取得を一時停止しています`,
      incompleteCoverage: true,
    };
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${perPage}`,
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
      return {
        runs: cached && cached.pat === trimmedPat ? cached.runs : [],
        warning: `${repoFullName}: Actions 実行履歴の取得に失敗しました (${res.status})`,
        incompleteCoverage: true,
      };
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.workflow_runs)) {
      return {
        runs: [],
        warning: `${repoFullName}: Actions 実行履歴のレスポンス形式が不正です`,
        incompleteCoverage: true,
      };
    }

    const runs: WorkflowRunItem[] = data.workflow_runs.map((r: any) => ({
      id: r.id,
      workflowId: typeof r.workflow_id === 'number' ? r.workflow_id : undefined,
      pullRequestNumber:
        typeof r.pull_requests?.[0]?.number === 'number'
          ? r.pull_requests[0].number
          : undefined,
      headRepositoryFullName:
        typeof r.head_repository?.full_name === 'string'
          ? r.head_repository.full_name
          : undefined,
      runAttempt: typeof r.run_attempt === 'number' ? r.run_attempt : undefined,
      runStartedAt: r.run_started_at || r.created_at || new Date().toISOString(),
      repoFullName,
      workflowName: r.name || 'Workflow',
      displayTitle: r.display_title || r.head_commit?.message?.split('\n')[0] || r.name || 'Run',
      runNumber: r.run_number || 0,
      event: r.event || 'unknown',
      status: (r.status || 'completed') as WorkflowRunStatus,
      conclusion: (r.conclusion ?? null) as WorkflowRunConclusion,
      htmlUrl: r.html_url || `https://github.com/${repoFullName}/actions`,
      headBranch: r.head_branch || '',
      shortSha: typeof r.head_sha === 'string' ? r.head_sha.slice(0, 7) : '',
      actor: {
        login: r.actor?.login || r.triggering_actor?.login || 'github-actions',
        avatarUrl: r.actor?.avatar_url || r.triggering_actor?.avatar_url || '',
      },
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
    }));

    // 再実行（run_attempt > 1）が cancelled / skipped / neutral / stale で終わった場合、
    // 直前の試行から未解決の失敗ステータスを復元する（キャッシュ再利用＋レート制限保護）
    let attemptLookupIncomplete = false;
    let attemptWarning: string | undefined;

    for (const run of runs) {
      if (
        run.status === 'completed' &&
        run.conclusion !== 'success' &&
        !isFailedWorkflowConclusion(run.conclusion) &&
        typeof run.runAttempt === 'number' &&
        run.runAttempt > 1
      ) {
        for (let attempt = run.runAttempt - 1; attempt >= 1; attempt -= 1) {
          const attemptCacheKey = `${repoFullName}::${run.id}::${attempt}`;
          const cachedAttempt = workflowAttemptConclusionCache.get(attemptCacheKey);
          if (cachedAttempt && cachedAttempt.pat === trimmedPat) {
            if (
              cachedAttempt.conclusion === 'success' ||
              isFailedWorkflowConclusion(cachedAttempt.conclusion)
            ) {
              run.conclusion = cachedAttempt.conclusion;
              break;
            }
            continue;
          }

          if (
            latestRateLimit &&
            latestRateLimit.remaining < MIN_RATE_LIMIT_RESERVE &&
            latestRateLimit.resetAt.getTime() > Date.now()
          ) {
            attemptLookupIncomplete = true;
            attemptWarning = `${repoFullName}: GitHub API レート制限残数が少ないため、再実行前の試行履歴の確認を一部スキップしました`;
            break;
          }
          try {
            const attemptRes = await fetch(
              `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${encodeURIComponent(String(run.id))}/attempts/${attempt}`,
              {
                headers: {
                  Authorization: `Bearer ${trimmedPat}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              }
            );
            updateRateLimitFromHeaders(attemptRes.headers);
            if (!attemptRes.ok) {
              attemptLookupIncomplete = true;
              attemptWarning = `${repoFullName}: 再実行前の試行履歴の取得に失敗しました (${attemptRes.status})`;
              break;
            }
            const attemptData = await attemptRes.json();
            const priorConclusion = (attemptData?.conclusion ?? null) as WorkflowRunConclusion;
            if (cacheGeneration === workflowRunsCacheGeneration) {
              workflowAttemptConclusionCache.set(attemptCacheKey, {
                pat: trimmedPat,
                conclusion: priorConclusion,
              });
            }
            if (priorConclusion === 'success' || isFailedWorkflowConclusion(priorConclusion)) {
              run.conclusion = priorConclusion;
              break;
            }
          } catch {
            attemptLookupIncomplete = true;
            attemptWarning = `${repoFullName}: 再実行前の試行履歴の取得中に通信エラーが発生しました`;
            break;
          }
        }
      }
    }

    if (cacheGeneration === workflowRunsCacheGeneration) {
      const latestActivity = repoActivityTimestamps.get(repoFullName.toLowerCase());
      workflowRunsCache.set(cacheKey, {
        pat: trimmedPat,
        runs,
        warning: attemptWarning,
        incompleteCoverage: attemptLookupIncomplete,
        fetchedAt: Date.now(),
        lastKnownActivityAt:
          latestActivity && latestActivity.pat === trimmedPat
            ? latestActivity.activityAt
            : currentActivityAt,
      });
    }

    return {
      runs,
      warning: attemptWarning,
      incompleteCoverage: attemptLookupIncomplete,
    };
  } catch (err) {
    console.warn(`Failed to fetch workflow runs for ${repoFullName}:`, err);
    return {
      runs: cached && cached.pat === trimmedPat ? cached.runs : [],
      warning: `${repoFullName}: Actions 実行履歴の取得中に通信エラーが発生しました`,
      incompleteCoverage: true,
    };
  }
}

/**
 * 監視対象リポジトリ群の直近 Actions ワークフロー実行履歴を横断取得・ソートする
 */
export async function fetchAllWorkflowRuns(
  pat: string,
  repositories: string[],
  perRepoLimit = 30
): Promise<{ runs: WorkflowRunItem[]; warning?: string; incompleteCoverage?: boolean }> {
  const trimmedPat = pat.trim();
  if (!trimmedPat || repositories.length === 0) {
    return { runs: [] };
  }

  const targetRepositories = repositories.slice(0, MAX_WORKFLOW_RUN_REPOS);
  const skippedCount = repositories.length - targetRepositories.length;

  const results = await Promise.all(
    targetRepositories.map(async (repoFullName) => {
      const [owner, name] = repoFullName.split('/');
      if (!owner || !name) {
        return {
          runs: [] as WorkflowRunItem[],
          warning: `${repoFullName}: リポジトリ名が不正です`,
          incompleteCoverage: true,
        };
      }
      return fetchRepositoryWorkflowRuns(trimmedPat, owner, name, perRepoLimit);
    })
  );

  const allRuns = results.flatMap((r) => r.runs);
  const warnings = results.map((r) => r.warning).filter(Boolean) as string[];
  if (skippedCount > 0) {
    warnings.push(
      `API レート制限保護のため、先頭 ${MAX_WORKFLOW_RUN_REPOS} リポジトリのみ Actions 実行履歴を取得しています（残り ${skippedCount} 件をスキップ）`
    );
  }

  const incompleteCoverage =
    skippedCount > 0 ||
    warnings.length > 0 ||
    results.some((r) => Boolean(r.incompleteCoverage));

  // ソート順: 実行中・待機中 (status !== 'completed') を最優先し、次に更新日時の新しい順
  allRuns.sort((a, b) => {
    const aActive = a.status !== 'completed' ? 1 : 0;
    const bActive = b.status !== 'completed' ? 1 : 0;
    if (aActive !== bActive) {
      return bActive - aActive;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return {
    runs: allRuns,
    warning: warnings.length > 0 ? warnings.join('\n') : undefined,
    incompleteCoverage,
  };
}

const HOT_OWNED_REPO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7日
const RECENT_OWNED_REPO_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30日
const RECENT_FORK_REPO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7日
const MIN_INCLUDED_OWNED_NON_FORK_REPOS = 5;

/**
 * キャッシュ内に実行中または失敗状態のワークフローが存在するかどうかを判定する
 */
function hasActiveOrFailedCachedRuns(repoFullName: string): boolean {
  const prefix = `${repoFullName.toLowerCase()}::`;
  for (const [key, entry] of workflowRunsCache.entries()) {
    if (key.toLowerCase().startsWith(prefix)) {
      if (
        entry.runs.some(
          (r) => r.status !== 'completed' || isFailedWorkflowConclusion(r.conclusion)
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 自動取得された自分のリポジトリ群と指定された外部リポジトリ一覧から、
 * 無駄なポーリングを発生させないようアクティブな監視対象リポジトリ名一覧を選出する
 */
export function selectActiveRepositoriesForPolling(
  ownedProjects: RepositoryDashboardData[],
  configuredRepos: string[],
  maxAutoTotal = MAX_WORKFLOW_RUN_REPOS,
  nowMs = Date.now()
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addRepo = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  };

  const getRepoAgeMs = (repo: RepositoryDashboardData): number => {
    const activityIso = repo.pushedAt || repo.updatedAt;
    const activityMs = activityIso ? new Date(activityIso).getTime() : 0;
    return activityMs > 0 ? Math.max(0, nowMs - activityMs) : Number.POSITIVE_INFINITY;
  };

  // 1. ユーザーが明示指定した外部リポジトリは最優先ですべて含める
  for (const repo of configuredRepos) {
    addRepo(repo);
  }

  // 2. 前回取得時点で実行中または失敗中の Actions がある自分のリポジトリを優先追加（解消検知のため）
  for (const repo of ownedProjects) {
    if (result.length >= maxAutoTotal) break;
    if (hasActiveOrFailedCachedRuns(repo.fullName)) {
      addRepo(repo.fullName);
    }
  }

  // 3. 直近 7 日以内に Push された開発中の自分のリポジトリ（非フォーク）を優先追加
  for (const repo of ownedProjects) {
    if (result.length >= maxAutoTotal) break;
    if (!repo.isFork && getRepoAgeMs(repo) <= HOT_OWNED_REPO_WINDOW_MS) {
      addRepo(repo.fullName);
    }
  }

  // 4. Open PR が存在する自分のリポジトリを追加
  for (const repo of ownedProjects) {
    if (result.length >= maxAutoTotal) break;
    if (repo.pullRequests.length > 0) {
      addRepo(repo.fullName);
    }
  }

  // 5. 直近 30 日以内にアクティブな自分のリポジトリ（非フォーク最低上位5件保証、および直近7日以内のフォーク）を追加
  let includedNonForkCount = ownedProjects.filter(
    (r) => !r.isFork && seen.has(r.fullName.toLowerCase())
  ).length;

  for (const repo of ownedProjects) {
    if (result.length >= maxAutoTotal) break;
    if (seen.has(repo.fullName.toLowerCase())) continue;

    const ageMs = getRepoAgeMs(repo);

    if (!repo.isFork) {
      if (ageMs <= RECENT_OWNED_REPO_WINDOW_MS || includedNonForkCount < MIN_INCLUDED_OWNED_NON_FORK_REPOS) {
        addRepo(repo.fullName);
        includedNonForkCount += 1;
      }
    } else if (ageMs <= RECENT_FORK_REPO_WINDOW_MS) {
      addRepo(repo.fullName);
    }
  }

  return result;
}




