import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Game from './Game';
import { Level } from '../types';
import { fetchLevelDetail } from '../api';

const Play: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLevelDetail(parseInt(id, 10));
    }
  }, [id]);

  const loadLevelDetail = async (levelId: number) => {
    setIsLoading(true);
    try {
      const levelData = await fetchLevelDetail(levelId);
      setLevel(levelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load level detail');
      console.error('Error loading level detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleComplete = () => {
    // 可以在这里添加一些完成后的逻辑，比如刷新数据或跳转
    // 目前保持原样，Game 组件可能会处理一些 UI 反馈
    // 如果需要跳转回列表，可以使用 navigate('/')
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !level) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="text-red-500 text-xl">{error || 'Level not found'}</div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return <Game level={level} onBack={handleBack} onComplete={handleComplete} />;
};

export default Play;
