import React from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from './Editor';
import { Level } from '../types';

const Create: React.FC = () => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate('/');
  };

  const handleSubmit = (level: Omit<Level, 'id' | 'createdAt' | 'completedCount'>) => {
    // 提交逻辑通常在 Editor 内部处理（调用合约），这里主要是提交成功后的回调
    // 假设 Editor 的 onSubmit 在合约调用成功后触发
    // 我们跳转回主页
    navigate('/');
  };

  return <Editor onSubmit={handleSubmit} onCancel={handleCancel} />;
};

export default Create;
