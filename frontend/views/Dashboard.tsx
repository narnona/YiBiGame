import React, { useState } from 'react';
import { Level } from '../types';

// 排序字段类型定义
type SortField = 'createdAt' | 'completionCount' | 'size';
// 排序顺序类型定义
type SortOrder = 'asc' | 'desc' | null;

// Dashboard 组件属性接口
interface DashboardProps {
  levels: Level[];
  isLoading?: boolean;
  onPlay: (id: number) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  totalLevels: number;
  sortField: SortField | null;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
  solvedLevelIds?: Set<number>;
}

// Dashboard 组件：显示关卡列表，支持分页和排序
const Dashboard: React.FC<DashboardProps> = ({ 
  levels, 
  isLoading, 
  onPlay, 
  onPageChange, 
  currentPage, 
  totalPages,
  totalLevels,
  sortField,
  sortOrder,
  onSortChange,
  solvedLevelIds = new Set()
}) => {
  // 页码输入框状态
  const [pageInput, setPageInput] = useState(currentPage.toString());

  // 处理排序点击事件
  const handleSortClick = (field: SortField) => {
    onSortChange(field);
  };

  // 获取排序图标
  const getSortIcon = (field: SortField) => {
    if (sortField !== field || sortOrder === null) {
      return <span className="material-icons-outlined text-sm">swap_vert</span>;
    }
    if (sortOrder === 'asc') {
      return <span className="material-icons-outlined text-sm">arrow_upward</span>;
    }
    return <span className="material-icons-outlined text-sm">arrow_downward</span>;
  };

  // 处理页码输入
  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  // 跳转到指定页码
  const handlePageJump = () => {
    const pageNum = parseInt(pageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    }
  };

  // 处理页码输入框的键盘事件
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageJump();
    }
  };

  // 生成页码数组，包含省略号
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    // 如果总页数小于等于最大可见页数，显示所有页码
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 否则显示：第一页、省略号（如果需要）、当前页附近页码、省略号（如果需要）、最后一页
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400">加载关卡中...</p>
        </div>
      </div>
    );
  }

  // 渲染主界面
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          {/* 表头 */}
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-8 py-6 font-semibold text-sm">#ID</th>
              <th className="px-6 py-6 font-semibold text-sm">名称</th>
              <th 
                className="px-6 py-6 font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSortClick('size')}
              >
                <div className="flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">open_in_full</span>
                  规格
                  {getSortIcon('size')}
                </div>
              </th>
              <th 
                className="px-6 py-6 font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSortClick('completionCount')}
              >
                <div className="flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">trending_up</span>
                  通关人数
                  {getSortIcon('completionCount')}
                </div>
              </th>
              <th 
                className="px-8 py-6 font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSortClick('createdAt')}
              >
                <div className="flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">schedule</span>
                  创建时间
                  {getSortIcon('createdAt')}
                </div>
              </th>
              <th className="px-6 py-6 font-semibold text-sm"></th>
            </tr>
          </thead>
          {/* 表体 */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {levels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400">
                  暂无关卡
                </td>
              </tr>
            ) : (
              levels.map((level) => {
                const isSolved = solvedLevelIds.has(level.id);
                return (
                  <tr
                    key={level.id}
                    onClick={() => onPlay(level.id)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer ${
                      isSolved ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-8 py-6">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isSolved 
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {level.id}
                    </div>
                  </td>
                  <td className="px-6 py-6 font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                    {level.name}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="material-icons-outlined text-[18px] text-primary/60">open_in_full</span>
                      {level.gridSize}x{level.gridSize} | {level.hintCount ?? level.hints.length}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="material-icons-outlined text-[18px] text-orange-400">trending_up</span>
                      {level.completedCount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="material-icons-outlined text-[18px]">schedule</span>
                      {level.createdAt}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    {isSolved && (
                      <span className="material-icons-outlined text-green-500 dark:text-green-400" title="已通关">
                        check_circle
                      </span>
                    )}
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* 分页控件 */}
      <div className="px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <p>
          显示 {(currentPage - 1) * 10 + 1} 到 {Math.min(currentPage * 10, totalLevels)} 条，共 {totalLevels} 条记录
        </p>
        <div className="flex items-center space-x-2">
          {/* 上一页按钮 */}
          <button 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-icons-outlined">chevron_left</span>
          </button>
          
          {/* 页码按钮 */}
          {generatePageNumbers().map((pageNum, idx) => (
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center">...</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum as number)}
                className={`w-8 h-8 rounded-lg font-medium transition-all ${
                  currentPage === pageNum 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pageNum}
              </button>
            )
          ))}
          
          {/* 下一页按钮 */}
          <button 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-icons-outlined">chevron_right</span>
          </button>
          
          {/* 页码跳转输入框 */}
          {totalPages > 5 && (
            <div className="flex items-center space-x-2 ml-2">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={handlePageInput}
                onKeyDown={handlePageInputKeyDown}
                className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handlePageJump}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                跳转
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
