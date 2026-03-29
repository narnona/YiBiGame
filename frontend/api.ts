import { Level } from './types';

type DataSource = 'subgraph' | 'backend';

const DATA_SOURCE: DataSource = (import.meta.env.VITE_DATA_SOURCE as DataSource | undefined) || 'subgraph';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const SUBGRAPH_URL =
  import.meta.env.VITE_SUBGRAPH_URL ||
  'https://api.studio.thegraph.com/query/1744111/yibigame-sepolia/version/latest';

type GraphQLError = { message: string };

async function subgraphRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload: { data?: T; errors?: GraphQLError[] } = await response.json();

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map(e => e.message).join('\n'));
  }

  if (!payload.data) {
    throw new Error('Subgraph response missing data');
  }

  return payload.data;
}

// 关卡列表项接口，用于显示关卡列表
export interface LevelInfo {
  index: number;
  levelId: number;
  name: string;
  size: number;
  hintCount: number;
  completionCount: number;
  createdAt: string;
}

// 分页信息接口
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 关卡列表响应接口，包含关卡数据和分页信息
export interface LevelsResponse {
  data: LevelInfo[];
  pagination: PaginationInfo;
}

// 关卡详情接口，包含完整的关卡信息
export interface LevelDetail {
  levelId: number;
  name: string;
  size: number;
  hints: Array<{ coord: { x: number; y: number }; value: number }>;
  completionCount: number;
  createdAt: string;
}

type OrderDirection = 'asc' | 'desc';

// 获取关卡列表，支持分页和排序
export async function fetchLevels(
  page: number = 1,
  limit: number = 10,
  sort?: 'levelId' | 'createdAt' | 'completionCount' | 'size',
  order?: 'asc' | 'desc'
): Promise<LevelsResponse> {
  if (DATA_SOURCE === 'backend') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (sort) params.append('sort', sort);
    if (order) params.append('order', order);

    const response = await fetch(`${API_BASE_URL}/levels?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch levels: ${response.statusText}`);
    }
    return response.json();
  }

  const skip = Math.max(0, (page - 1) * limit);
  const orderBy = sort || 'levelId';
  const orderDirection: OrderDirection = order || 'asc';

  const totalQuery = `
    query LevelsTotal {
      levels(first: 1, orderBy: levelId, orderDirection: desc) {
        levelId
      }
    }
  `;

  const listQuery = `
    query Levels($first: Int!, $skip: Int!, $orderBy: Level_orderBy!, $orderDirection: OrderDirection!) {
      levels(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
        levelId
        name
        size
        hintCount
        completionCount
        createdAt
      }
    }
  `;

  const [totalData, listData] = await Promise.all([
    subgraphRequest<{ levels: Array<{ levelId: string }> }>(totalQuery),
    subgraphRequest<{
      levels: Array<{
        levelId: string;
        name: string;
        size: number;
        hintCount: number;
        completionCount: string;
        createdAt: string;
      }>;
    }>(listQuery, {
      first: limit,
      skip,
      orderBy,
      orderDirection,
    }),
  ]);

  const total = Number.parseInt(totalData.levels[0]?.levelId || '0', 10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: listData.levels.map(l => ({
      index: Number.parseInt(l.levelId, 10),
      levelId: Number.parseInt(l.levelId, 10),
      name: l.name,
      size: l.size,
      hintCount: l.hintCount,
      completionCount: Number.parseInt(l.completionCount, 10),
      createdAt: new Date(Number.parseInt(l.createdAt, 10) * 1000).toISOString(),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

// 获取关卡详情
export async function fetchLevelDetail(id: number): Promise<Level> {
  if (DATA_SOURCE === 'backend') {
    const response = await fetch(`${API_BASE_URL}/levels/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch level: ${response.statusText}`);
    }
    const data: LevelDetail = await response.json();

    return {
      id: data.levelId,
      name: data.name,
      gridSize: data.size,
      hints: data.hints.map(h => ({
        coord: h.coord,
        value: h.value,
      })),
      completedCount: data.completionCount,
      createdAt: new Date(data.createdAt).toLocaleDateString(),
    };
  }

  const query = `
    query LevelDetail($id: ID!) {
      level(id: $id) {
        levelId
        name
        size
        completionCount
        createdAt
        hints(orderBy: value, orderDirection: asc) {
          x
          y
          value
        }
      }
    }
  `;

  const data = await subgraphRequest<{
    level: {
      levelId: string;
      name: string;
      size: number;
      completionCount: string;
      createdAt: string;
      hints: Array<{ x: number; y: number; value: number }>;
    } | null;
  }>(query, { id: id.toString() });

  if (!data.level) {
    throw new Error('Level not found');
  }

  return {
    id: Number.parseInt(data.level.levelId, 10),
    name: data.level.name,
    gridSize: data.level.size,
    hints: data.level.hints.map(h => ({
      coord: { x: h.x, y: h.y },
      value: h.value,
    })),
    completedCount: Number.parseInt(data.level.completionCount, 10),
    createdAt: new Date(Number.parseInt(data.level.createdAt, 10) * 1000).toLocaleDateString(),
  };
}

// 获取用户统计数据（创建的关卡和解决的关卡）
export async function fetchStats(address: string): Promise<{
  created: Array<{ levelId: number; name: string; createdAt: string; completionCount: number }>;
  solved: Array<{ levelId: number; solverAddress: string; timestamp: number }>;
}> {
  if (DATA_SOURCE === 'backend') {
    const response = await fetch(`${API_BASE_URL}/stats/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    const data: {
      created: Array<{ levelId: number; name: string; createdAt: string; completionCount: number }>;
      solved: Array<{ levelId: number; solverAddress: string; timestamp: string }>;
    } = await response.json();

    return {
      created: data.created,
      solved: data.solved.map(r => ({
        levelId: r.levelId,
        solverAddress: r.solverAddress,
        timestamp: Number.isFinite(Date.parse(r.timestamp)) ? Math.floor(Date.parse(r.timestamp) / 1000) : 0,
      })),
    };
  }

  const query = `
    query Stats($creator: Bytes!, $solver: Bytes!) {
      created: levels(where: { creator: $creator }, first: 1000, orderBy: createdAt, orderDirection: desc) {
        levelId
        name
        createdAt
        completionCount
      }
      solved: solveRecords(where: { solver: $solver, isFirstCompletion: true }, first: 1000, orderBy: timestamp, orderDirection: desc) {
        levelId
        solver
        timestamp
      }
    }
  `;

  const normalized = address.toLowerCase();

  const data = await subgraphRequest<{
    created: Array<{ levelId: string; name: string; createdAt: string; completionCount: string }>;
    solved: Array<{ levelId: string; solver: string; timestamp: string }>;
  }>(query, { creator: normalized, solver: normalized });

  return {
    created: data.created.map(l => ({
      levelId: Number.parseInt(l.levelId, 10),
      name: l.name,
      createdAt: new Date(Number.parseInt(l.createdAt, 10) * 1000).toISOString(),
      completionCount: Number.parseInt(l.completionCount, 10),
    })),
    solved: data.solved.map(r => ({
      levelId: Number.parseInt(r.levelId, 10),
      solverAddress: r.solver,
      timestamp: Number.parseInt(r.timestamp, 10),
    })),
  };
}
