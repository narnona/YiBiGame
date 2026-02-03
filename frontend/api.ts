import { Level, Hint } from './types';

// 后端API的基础URL
const API_BASE_URL = 'http://localhost:3001';

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

// 获取关卡列表，支持分页和排序
export async function fetchLevels(
  page: number = 1,
  limit: number = 10,
  sort?: 'levelId' | 'createdAt' | 'completionCount' | 'size',
  order?: 'asc' | 'desc'
): Promise<LevelsResponse> {
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

// 获取关卡详情
export async function fetchLevelDetail(id: number): Promise<Level> {
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
      value: h.value
    })),
    completedCount: data.completionCount,
    createdAt: new Date(data.createdAt).toLocaleDateString()
  };
}

// 获取用户统计数据（创建的关卡和解决的关卡）
export async function fetchStats(address: string): Promise<{
  created: Array<{ levelId: number; name: string; createdAt: string; completionCount: number }>;
  solved: Array<{ levelId: number; solverAddress: string; timestamp: number }>;
}> {
  const response = await fetch(`${API_BASE_URL}/stats/${address}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }
  return response.json();
}
