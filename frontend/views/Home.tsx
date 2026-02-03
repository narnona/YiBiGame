import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Dashboard from './Dashboard';
import { Level } from '../types';
import { fetchLevels, fetchStats } from '../api';

// 排序字段类型定义
type SortField = 'createdAt' | 'completionCount' | 'size';
// 排序顺序类型定义
type SortOrder = 'asc' | 'desc' | null;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  // 关卡列表状态
  const [levels, setLevels] = useState<Level[]>([]);
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 错误信息状态
  const [error, setError] = useState<string | null>(null);
  // 当前页码
  const [currentPage, setCurrentPage] = useState(1);
  // 总页数
  const [totalPages, setTotalPages] = useState(1);
  // 总关卡数
  const [totalLevels, setTotalLevels] = useState(0);
  // 排序字段
  const [sortField, setSortField] = useState<SortField | null>(null);
  // 排序顺序
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  // 用户已通关的关卡ID集合
  const [solvedLevelIds, setSolvedLevelIds] = useState<Set<number>>(new Set());

  // 当页码、排序字段或排序顺序变化时，重新加载关卡列表
  useEffect(() => {
    loadLevels();
  }, [currentPage, sortField, sortOrder]);

  // 当用户连接状态或地址变化时，加载用户的通关记录
  useEffect(() => {
    if (isConnected && address) {
      loadSolvedLevels(address);
    } else {
      setSolvedLevelIds(new Set());
    }
  }, [isConnected, address]);

  // 处理排序变更，支持切换排序顺序（无→降序→升序→无）
  const handleSortChange = (field: SortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      if (sortOrder === null) {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 从后端加载关卡列表
  const loadLevels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sortParam = sortField || undefined;
      const orderParam = sortOrder === 'asc' ? 'asc' : sortOrder === 'desc' ? 'desc' : undefined;
      console.log('Loading levels with:', { sortParam, orderParam });
      const response = await fetchLevels(currentPage, 10, sortParam, orderParam);
      setLevels(response.data.map(l => ({
        id: l.levelId,
        name: l.name,
        gridSize: l.size,
        hints: [],
        hintCount: l.hintCount,
        completedCount: l.completionCount,
        createdAt: new Date(l.createdAt).toLocaleDateString()
      })));
      setTotalPages(response.pagination.totalPages);
      setTotalLevels(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load levels');
      console.error('Error loading levels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载用户已通关的关卡
  const loadSolvedLevels = async (userAddress: string) => {
    try {
      const stats = await fetchStats(userAddress);
      const solvedIds = new Set(stats.solved.map(record => record.levelId));
      setSolvedLevelIds(solvedIds);
    } catch (err) {
      console.error('Error loading solved levels:', err);
    }
  };

  const handlePlay = (id: number) => {
    navigate(`/play/${id}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Dashboard
      levels={levels}
      isLoading={isLoading}
      onPlay={handlePlay}
      onPageChange={handlePageChange}
      currentPage={currentPage}
      totalPages={totalPages}
      totalLevels={totalLevels}
      sortField={sortField}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      solvedLevelIds={solvedLevelIds}
    />
  );
};

export default Home;
