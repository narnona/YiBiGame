import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Level, Point, Hint } from '../types';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { CONTRACT_ADDRESS, CONTRACT_ABI, HintInput } from '../contract';

// Editor 组件属性接口
interface EditorProps {
  onSubmit: (level: Omit<Level, 'id' | 'createdAt' | 'completedCount'>) => void;
  onCancel: () => void;
}

// Editor 组件：关卡编辑器，支持两阶段编辑模式（绘制路径→设定提示）
  const Editor: React.FC<EditorProps> = ({ onSubmit, onCancel }) => {
    // 钱包连接状态
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  // 写入合约相关状态
  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
    // 等待交易确认
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
      hash,
    });

    // 关卡名称
    const [name, setName] = useState('');
    // 网格尺寸
    const [gridSize, setGridSize] = useState(4);
    // 用户绘制的路径
    const [userPath, setUserPath] = useState<Point[]>([]);
    // 提示点数组
    const [hints, setHints] = useState<Hint[]>([]);
    // 编辑模式：path（绘制路径）或 hints（设置提示）
    const [mode, setMode] = useState<'path' | 'hints'>('path');
    // 提交状态
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  // 错误信息
  const [errorMessage, setErrorMessage] = useState('');
  // 交易Hash
  const [transactionHash, setTransactionHash] = useState('');
  // 路径不完整时的提示信息
  const [pathIncompleteMessage, setPathIncompleteMessage] = useState('');
  // 提示点验证信息
  const [hintValidationMessage, setHintValidationMessage] = useState('');

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 420;
  const maxContainerWidth = screenWidth < 1024 ? screenWidth - 48 : 480;
  const baseCell = Math.round(Math.min(72, Math.max(32, maxContainerWidth / gridSize)));
  const gapPx = Math.round(Math.max(6, baseCell * 0.1));
  const containerSize = baseCell * gridSize + gapPx * (gridSize - 1);
  const fontSizePx = Math.round(baseCell * 0.45);

  // 索引转坐标
  const indexToCoord = (index: number): Point => {
    return {
      x: index % gridSize,
      y: Math.floor(index / gridSize)
    };
  };

  // 坐标转索引
  const coordToIndex = (coord: Point): number => {
    return coord.y * gridSize + coord.x;
  };

  // 判断两个坐标是否相邻
  const areAdjacent = (p1: Point, p2: Point): boolean => {
    return (
      (Math.abs(p1.x - p2.x) === 1 && p1.y === p2.y) ||
      (Math.abs(p1.y - p2.y) === 1 && p1.x === p2.x)
    );
  };

  const [isDragging, setIsDragging] = useState(false);
  const touchTargetRef = useRef<HTMLElement | null>(null);
  const interactionRef = useRef({ isModified: false });

  // 统一处理路径交互（点击或拖拽）
  const handlePathInteraction = (index: number) => {
    const coord = indexToCoord(index);
    const lastCoord = userPath[userPath.length - 1];

    // 如果是第一个点
    if (userPath.length === 0) {
       setUserPath([coord]);
       interactionRef.current.isModified = true;
       return;
    }

    // 如果回到倒数第二个点（撤销最后一步）
    if (userPath.length > 1) {
       const secondLast = userPath[userPath.length - 2];
       if (coord.x === secondLast.x && coord.y === secondLast.y) {
         const lastCoord = userPath[userPath.length - 1];
         setUserPath(prev => prev.slice(0, -1));
         setHints(prev => prev.filter(h => h.coord.x !== lastCoord.x || h.coord.y !== lastCoord.y));
         interactionRef.current.isModified = true;
         return;
       }
    }

    // 如果是新的相邻点，且不在路径中（防止自身循环）
    const isInPath = userPath.some(p => p.x === coord.x && p.y === coord.y);
    if (!isInPath && areAdjacent(lastCoord, coord)) {
      setUserPath(prev => [...prev, coord]);
      interactionRef.current.isModified = true;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault(); // 防止触摸滚动
    if (mode !== 'path') return;
    
    setIsDragging(true);
    interactionRef.current.isModified = false;
    handlePathInteraction(index);
  };

  const handlePointerEnter = (index: number) => {
    if (mode === 'path' && isDragging) {
      handlePathInteraction(index);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (mode !== 'path' || !isDragging) return;

    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element && element.closest('[data-cell-index]')) {
      const cell = element.closest('[data-cell-index]') as HTMLElement;
      const index = parseInt(cell.getAttribute('data-cell-index') || '-1');

      if (index >= 0 && index < gridSize * gridSize) {
        handlePathInteraction(index);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchTargetRef.current = null;
  };

  // 处理格子点击事件
  const handleCellClick = (index: number) => {
    const coord = indexToCoord(index);

    if (mode === 'path') {
      if (interactionRef.current.isModified) return;

      const lastCoord = userPath[userPath.length - 1];

      // 点击最后一个格子，撤销一步
      if (userPath.length > 0 && 
          coord.x === lastCoord.x && 
          coord.y === lastCoord.y) {
        setUserPath(prev => prev.slice(0, -1));
        setHints(prev => prev.filter(h => h.coord.x !== lastCoord.x || h.coord.y !== lastCoord.y));
        return;
      }
    } else if (mode === 'hints') {
      // 检查该点是否在路径中
      const pathIndex = userPath.findIndex(p => p.x === coord.x && p.y === coord.y);
      if (pathIndex === -1) return;

      // 检查该点是否已存在提示
      const existingHintIndex = hints.findIndex(h => h.coord.x === coord.x && h.coord.y === coord.y);
      if (existingHintIndex !== -1) {
        // 移除已存在的提示
        setHints(prev => prev.filter((_, i) => i !== existingHintIndex));
        return;
      }

      // 添加新提示，值为路径索引+1
      setHints(prev => [...prev, { coord, value: pathIndex + 1 }]);
    }
  };

  // 自动生成提示点
  const autoGenerateHints = () => {
    if (userPath.length < 2) return;

    const newHints: Hint[] = [];
    const maxHints = userPath.length - 1;
    const minHints = Math.max(1, Math.floor(userPath.length * 0.15));
    const targetCount = Math.floor(Math.random() * (maxHints - minHints + 1)) + minHints;

    const indices = Array.from({ length: userPath.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    const selectedIndices = shuffled.slice(0, targetCount).sort((a, b) => a - b);

    for (const index of selectedIndices) {
      newHints.push({ coord: userPath[index], value: index + 1 });
    }

    setHints(newHints);
  };

  // 验证路径是否完整
  const validatePath = (): boolean => {
    const totalCells = gridSize * gridSize;
    return userPath.length === totalCells;
  };

  // 处理模式切换
  const handleModeChange = (newMode: 'path' | 'hints') => {
    if (newMode === 'hints' && !validatePath()) {
      setPathIncompleteMessage('！请先完成路径绘制');
      setTimeout(() => setPathIncompleteMessage(''), 3000);
      return;
    }
    setMode(newMode);
  };

  // 重置编辑器
  const reset = () => {
    setUserPath([]);
    setHints([]);
    setMode('path');
  };

  // 提交关卡到区块链
  const submit = async () => {
    console.log('submit called', { isConnected });
    if (!isConnected) {
      console.log('Attempting to connect wallet in Editor...');
      try {
        await connect({ connector: injected() });
      } catch (error) {
        console.error('Failed to connect wallet in Editor:', error);
      }
      return;
    }
    if (!name) {
      alert("请输入关卡名称");
      return;
    }
    if (userPath.length < 2) {
      alert("请至少绘制一个包含2个点的路径");
      return;
    }
    if (hints.length === 0 || hints.length === gridSize * gridSize) {
      setHintValidationMessage('！提示点不能为空或全部');
      setTimeout(() => setHintValidationMessage(''), 3000);
      return;
    }

    setSubmitStatus('submitting');
    setErrorMessage('');
    setHintValidationMessage('');

    try {
      // 转换提示格式为合约输入格式
      const hintsInput: HintInput[] = hints.map(h => ({
        coord: { x: h.coord.x, y: h.coord.y },
        value: h.value
      }));

      // 按 value 从小到大排序，满足合约要求
      hintsInput.sort((a, b) => a.value - b.value);

      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'createLevel',
        args: [name, gridSize, hintsInput],
        chain: sepolia,
      } as any);
    } catch (error) {
      console.error('Failed to submit level:', error);
      setSubmitStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit level';
      setErrorMessage(errorMsg.split('.')[0] + (errorMsg.includes('.') ? '.' : ''));
    }
  };

  // 监听交易确认状态
  useEffect(() => {
    if (isConfirmed) {
      setSubmitStatus('success');
      if (hash) {
        setTransactionHash(hash);
      }
    }
    if (writeError) {
      setSubmitStatus('error');
      const errorMsg = writeError.message;
      setErrorMessage(errorMsg.split('.')[0] + (errorMsg.includes('.') ? '.' : ''));
    }
  }, [isConfirmed, writeError, hash]);

  // 监听写入合约状态
  useEffect(() => {
    if (isWritePending) {
      setSubmitStatus('submitting');
    }
  }, [isWritePending]);

  const getPathSVG = () => {
    if (userPath.length < 2) return null;
    const strokeWidth = Math.max(1.5, baseCell * 0.03);

    let d = "";
    userPath.forEach((coord, i) => {
      const x = coord.x * (baseCell + gapPx) + baseCell / 2;
      const y = coord.y * (baseCell + gapPx) + baseCell / 2;
      d += `${i === 0 ? 'M' : ' L'} ${x} ${y}`;
    });

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox={`0 0 ${containerSize} ${containerSize}`}>
        <path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.6"
          strokeWidth={strokeWidth * 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // 获取指定位置的提示点
  const getHintAt = (x: number, y: number) => {
    return hints.find(h => h.coord.x === x && h.coord.y === y);
  };

  // 获取指定位置的步数
  const getStepAt = (x: number, y: number) => {
    return userPath.findIndex(p => p.x === x && p.y === y);
  };

  // 渲染主界面
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 页面标题 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          创建关卡
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">设计并配置您的益智游戏关卡路径与提示点。</p>
      </header>

      {/* 主内容区域 */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 预览区域 */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                预览
              </h2>
              {pathIncompleteMessage && (
                <div className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full animate-in fade-in slide-in-from-left-2 border border-sky-100">
                  <span>{pathIncompleteMessage}</span>
                </div>
              )}
              {hintValidationMessage && (
                <div className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full animate-in fade-in slide-in-from-left-2 border border-sky-100">
                  <span>{hintValidationMessage}</span>
                </div>
              )}
            </div>
            {/* 模式切换按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleModeChange('path')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  mode === 'path'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                绘制路径
              </button>
              <button
                onClick={() => handleModeChange('hints')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  mode === 'hints'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                设置提示
              </button>
            </div>
          </div>

          {/* 网格预览区域 */}
          <div className="relative aspect-square max-w-[480px] mx-auto bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-10 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="relative" style={{ width: `${containerSize}px`, height: `${containerSize}px` }}>
              {getPathSVG()}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, ${baseCell}px)`,
                  gridAutoRows: `${baseCell}px`,
                  gap: `${gapPx}px`,
                  touchAction: 'none'
                }}
                onPointerLeave={() => setIsDragging(false)}
                onPointerUp={() => setIsDragging(false)}
              >
              {Array.from({ length: gridSize }).map((_, y) =>
                Array.from({ length: gridSize }).map((_, x) => {
                  const index = y * gridSize + x;
                  const step = getStepAt(x, y);
                  const hint = getHintAt(x, y);
                  const isPath = step !== -1;
                  
                  return (
                    <div 
                      key={index}
                      onPointerDown={(e) => handlePointerDown(e, index)}
                      onPointerEnter={() => handlePointerEnter(index)}
                      onClick={() => handleCellClick(index)}
                      className={`rounded-xl flex items-center justify-center font-bold transition-all cursor-pointer select-none relative
                        ${isPath 
                          ? 'bg-blue-500 text-white shadow-lg border-blue-400 z-20 scale-105' 
                          : 'bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-primary text-slate-300 dark:text-slate-500'
                        }`}
                    >
                      {hint ? (
                        <span className="text-yellow-300" style={{ fontSize: `${fontSizePx}px` }}>{hint.value}</span>
                      ) : isPath ? (
                        <span style={{ fontSize: `${fontSizePx}px` }}>{step + 1}</span>
                      ) : ''}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
          {/* 操作提示 */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="material-icons text-sm">info</span>
            {mode === 'path'
              ? '点击方块以绘制路径，再次点击最后一步可撤销。'
              : '点击路径上的方块以添加/移除提示点。'}
          </div>
        </section>

        {/* 配置区域 */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="space-y-6">
                {/* 关卡名称输入 */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="level-name">关卡名称</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    id="level-name"
                    placeholder="输入关卡名称..."
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* 网格尺寸滑块 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">网格尺寸</label>
                    <span className="text-primary font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded">{gridSize}x{gridSize}</span>
                  </div>
                  <input
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    max="16"
                    min="2"
                    step="1"
                    type="range"
                    value={gridSize}
                    onChange={(e) => {
                      setGridSize(parseInt(e.target.value));
                      setUserPath([]);
                      setHints([]);
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>2x2</span>
                    <span>16x16</span>
                  </div>
                </div>

                {/* 提示点设置 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">提示数量</label>
                    <span className="text-primary font-bold">{hints.length}</span>
                  </div>
                  <button
                    onClick={autoGenerateHints}
                    disabled={mode !== 'hints' || userPath.length < 2}
                    className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-icons-outlined text-sm">auto_fix_high</span>
                    自动生成提示点
                  </button>
                </div>
              </div>
            </div>

            {/* 配置详情说明 */}
            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex-grow">
              <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-4">配置详情</h3>
              <div className="space-y-8">
                <div 
                  className={`flex gap-4 cursor-pointer rounded-xl p-2 transition-colors ${mode === 'path' ? 'bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  onClick={() => handleModeChange('path')}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/30">1</div>
                  <div className="pt-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">绘制路径</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">在预览区按顺序连接方块。</p>
                  </div>
                </div>
                <div 
                  className={`flex gap-4 cursor-pointer rounded-xl p-2 transition-colors ${mode === 'hints' ? 'bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  onClick={() => handleModeChange('hints')}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/30">2</div>
                  <div className="pt-1 flex-grow">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">设置提示点</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">切换到"设置提示"模式，在路径上点击以添加提示点。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮区域 */}
            <div className="flex gap-4">
              <button 
                onClick={reset}
                disabled={submitStatus === 'submitting' || isConfirming}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-outlined text-lg">refresh</span>
                重置
              </button>
              <button 
                onClick={submit}
                disabled={submitStatus === 'submitting' || isConfirming || submitStatus === 'success'}
                className={`flex-[2] py-4 font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  submitStatus === 'success'
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/40'
                    : submitStatus === 'error'
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40'
                      : submitStatus === 'submitting' || isConfirming
                        ? 'bg-slate-400 text-white shadow-slate-400/40 cursor-wait'
                        : !isConnected
                          ? 'bg-secondary hover:opacity-95 text-white shadow-sky-400/40'
                          : 'bg-primary hover:bg-indigo-600 text-white shadow-primary/40'
                }`}
              >
                {submitStatus === 'submitting' || isConfirming ? (
                  <>
                    <span className="material-icons-outlined animate-spin text-lg">autorenew</span>
                    {isConfirming ? '确认中...' : '提交中...'}
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <span className="material-icons-outlined text-lg">check_circle</span>
                    发布成功！
                  </>
                ) : submitStatus === 'error' ? (
                  <>
                    <span className="material-icons-outlined text-lg">error</span>
                    重新发布
                  </>
                ) : !isConnected ? (
                  <>
                    <span className="material-icons-outlined text-lg">account_balance_wallet</span>
                    请先连接钱包
                  </>
                ) : (
                  <>
                    <span className="material-icons-outlined text-lg">check_circle</span>
                    提交到区块链
                  </>
                )}
              </button>
            </div>

            {/* 错误消息提示 */}
            {errorMessage && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3">
                <span className="material-icons-outlined text-lg">error_outline</span>
                <div className="flex-1">
                  <div className="font-semibold">发布失败</div>
                  <div className="text-sm mt-1">{errorMessage}</div>
                </div>
                <button onClick={() => setSubmitStatus('idle')} className="material-icons-outlined">close</button>
              </div>
            )}

            {/* 交易Hash提示 */}
            {transactionHash && (
              <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl flex items-start gap-3">
                <span className="material-icons-outlined text-lg">link</span>
                <div className="flex-1">
                  <div className="font-semibold">交易Hash</div>
                  <div className="text-sm mt-1 font-mono break-all">{transactionHash}</div>
                </div>
                <button onClick={() => setTransactionHash('')} className="material-icons-outlined">close</button>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  };

export default Editor;
