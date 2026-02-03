import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Level, Point } from '../types';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI, PointInput } from '../contract';

// Game 组件属性接口
interface GameProps {
  level: Level;
  onBack: () => void;
  onComplete: () => void;
}

// Game 组件：游戏主界面，处理游戏逻辑和交互
const Game: React.FC<GameProps> = ({ level, onBack, onComplete }) => {
  // 钱包连接状态
  const { address, isConnected } = useAccount();
  // 写入合约相关状态
  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // 用户绘制的路径
  const [userPath, setUserPath] = useState<Point[]>([]);
  // 游戏是否完成
  const [isFinished, setIsFinished] = useState(false);
  // 提交状态
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  // 错误信息
  const [errorMessage, setErrorMessage] = useState('');
  // 交易Hash
  const [transactionHash, setTransactionHash] = useState('');
  // 路径是否有效（匹配提示点数字）
  const [isValidPath, setIsValidPath] = useState(true);
  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);
  // 音频上下文引用
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 计算总格子数
  const totalCells = level.gridSize * level.gridSize;
  // 按提示值排序的提示点数组
  const sortedHints = [...level.hints].sort((a, b) => a.value - b.value);
  const baseCell = Math.round(Math.min(64, Math.max(28, 420 / level.gridSize)));
  const gapPx = Math.round(Math.max(4, baseCell * 0.08));
  const containerSize = baseCell * level.gridSize + gapPx * (level.gridSize - 1);
  const fontSizePx = Math.round(baseCell * 0.45);

  // 关卡切换时重置状态
  useEffect(() => {
    setUserPath([]);
    setIsFinished(false);
    setIsValidPath(true);
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {}
    }
  }, [level]);

  // 坐标转索引
  const coordToIndex = (coord: Point): number => {
    return coord.y * level.gridSize + coord.x;
  };

  // 索引转坐标
  const indexToCoord = (index: number): Point => {
    return {
      x: index % level.gridSize,
      y: Math.floor(index / level.gridSize)
    };
  };

  // 判断两个坐标是否相邻
  const areAdjacent = (p1: Point, p2: Point): boolean => {
    return (
      (Math.abs(p1.x - p2.x) === 1 && p1.y === p2.y) ||
      (Math.abs(p1.y - p2.y) === 1 && p1.x === p2.x)
    );
  };

  // 验证路径是否匹配所有提示点
  const validatePath = (path: Point[]): boolean => {
    for (let i = 0; i < path.length; i++) {
      const coord = path[i];
      const stepNumber = i + 1;
      const hintAtPos = level.hints.find(h => h.coord.x === coord.x && h.coord.y === coord.y);
      if (hintAtPos && hintAtPos.value !== stepNumber) {
        return false;
      }
    }
    return true;
  };

  // 播放音效
  const playTone = (freq: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + time);
  };

  // 添加坐标到路径
  const addCoord = (clickedCoord: Point) => {
    if (isFinished || submitStatus === 'submitting' || submitStatus === 'success') return false;

    const lastCoord = userPath[userPath.length - 1];
    const prevCoord = userPath[userPath.length - 2];
    const stepNumber = userPath.length + 1;

    // 点击最后一个格子，撤销一步
    if (lastCoord && clickedCoord.x === lastCoord.x && clickedCoord.y === lastCoord.y) {
      setUserPath(prev => prev.slice(0, -1));
      const newValidPath = validatePath(userPath.slice(0, -1));
      setIsValidPath(newValidPath);
      playTone(240, 0.08);
      return true;
    }

    // 点击倒数第二个格子，撤销两步
    if (prevCoord && clickedCoord.x === prevCoord.x && clickedCoord.y === prevCoord.y) {
      setUserPath(prev => prev.slice(0, -2));
      const newValidPath = validatePath(userPath.slice(0, -2));
      setIsValidPath(newValidPath);
      playTone(240, 0.08);
      return true;
    }

    // 路径无效时不允许继续添加
    if (!isValidPath) return false;

    // 已在路径中，不允许重复添加
    if (userPath.some(p => p.x === clickedCoord.x && p.y === clickedCoord.y)) return false;

    // 必须与最后一个格子相邻
    if (lastCoord && !areAdjacent(lastCoord, clickedCoord)) return false;

    const newUserPath = [...userPath, clickedCoord];
    setUserPath(newUserPath);

    // 检查是否匹配提示点数字
    const hintAtPos = level.hints.find(h => h.coord.x === clickedCoord.x && h.coord.y === clickedCoord.y);
    if (hintAtPos && hintAtPos.value !== stepNumber) {
      setIsValidPath(false);
      playTone(160, 0.12);
    } else {
      setIsValidPath(true);
      playTone(520, 0.08);
    }

    // 所有格子都已连接，游戏完成
    if (totalCells === newUserPath.length) {
      setIsFinished(true);
      playTone(660, 0.12);
      setTimeout(() => playTone(880, 0.12), 120);
      setTimeout(() => playTone(1040, 0.12), 240);
    }
    return true;
  };

  // 处理格子点击事件
  const handleCellClick = (index: number) => {
    if (isFinished || submitStatus === 'submitting' || submitStatus === 'success') return;

    const clickedCoord = indexToCoord(index);

    // 如果路径为空，可以从任意格子开始
    if (userPath.length === 0) {
      addCoord(clickedCoord);
      return;
    }

    addCoord(clickedCoord);
  };

  // 提交解决方案到区块链
  const handleSubmit = async () => {
    if (!isFinished) return;
    if (!isValidPath) {
      alert("路径不匹配提示点数字，请检查！");
      return;
    }
    if (!isConnected) {
      alert("请先连接钱包");
      return;
    }
    
    setSubmitStatus('submitting');
    setErrorMessage('');

    try {
      // 转换路径格式为合约输入格式
      const pathInput: PointInput[] = userPath.map(p => ({
        x: p.x,
        y: p.y
      }));

      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'submitSolution',
        args: [level.id, pathInput],
        chain: sepolia,
      } as any);
    } catch (error) {
      console.error('Failed to submit solution:', error);
      setSubmitStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit solution';
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
    return level.hints.find(h => h.coord.x === x && h.coord.y === y);
  };

  // 判断指定位置是否在用户路径中
  const isUserPathAt = (x: number, y: number) => {
    return userPath.some(p => p.x === x && p.y === y);
  };

  // 获取指定位置的步数
  const getStepNumber = (x: number, y: number) => {
    return userPath.findIndex(p => p.x === x && p.y === y);
  };

  // 渲染主界面
  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 导航栏：返回按钮 */}
      <nav className="mb-10">
        <button 
          onClick={onBack}
          disabled={submitStatus === 'submitting'}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-icons-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
          返回列表
        </button>
      </nav>

      {/* 关卡信息 */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">{level.name}</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">连接所有方块以完成挑战</p>
        </div>
        <div className="flex gap-8 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">规格</span>
            <span className="font-mono font-semibold">{level.gridSize}x{level.gridSize} | {level.hints.length} 提示</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">通关人数</span>
            <span className="font-mono font-semibold tracking-tighter">{level.completedCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 dark:shadow-none border border-slate-100/50 dark:border-slate-800 relative">
        <div className="relative mx-auto" style={{ width: `${containerSize}px`, height: `${containerSize}px` }}>
          {getPathSVG()}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${level.gridSize}, ${baseCell}px)`,
              gridAutoRows: `${baseCell}px`,
              gap: `${gapPx}px`
            }}
            onPointerUp={() => setIsDragging(false)}
          >
          {Array.from({ length: level.gridSize }).map((_, y) =>
            Array.from({ length: level.gridSize }).map((_, x) => {
              const index = y * level.gridSize + x;
              const hint = getHintAt(x, y);
              const isUserPath = isUserPathAt(x, y);
              const stepNumber = getStepNumber(x, y);
              const isLast = userPath.length > 0 && 
                             userPath[userPath.length - 1].x === x && 
                             userPath[userPath.length - 1].y === y;
              
              const currentStepNumber = stepNumber + 1;
              const hintMismatch = hint && isUserPath && hint.value !== currentStepNumber;
              const lastCoord = userPath[userPath.length - 1];
              const isAdjacentToLast = lastCoord ? areAdjacent(lastCoord, { x, y }) : true;
              
              return (
                <div 
                  key={index}
                  onClick={() => handleCellClick(index)}
                  onPointerDown={() => {
                    setIsDragging(true);
                    addCoord({ x, y });
                  }}
                  onPointerEnter={() => {
                    if (isDragging) addCoord({ x, y });
                  }}
                  className={`rounded-2xl flex items-center justify-center transition-all cursor-pointer select-none relative z-10
                    ${isUserPath 
                      ? hintMismatch 
                        ? 'bg-red-500/80 text-white shadow-xl shadow-red-400/30 scale-[1.05]'
                        : hint
                          ? 'bg-primary/30 dark:bg-primary/40 text-primary dark:text-primary shadow-lg shadow-primary/20 scale-[1.02] border border-primary/30'
                          : 'bg-secondary text-white shadow-xl shadow-sky-400/30 scale-[1.05]'
                      : hint 
                        ? 'bg-primary/30 dark:bg-primary/40 text-primary dark:text-primary border border-primary/30'
                        : `${isAdjacentToLast ? 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500' : 'bg-slate-200 dark:bg-slate-700'}`
                    }`}
                >
                  {/* 显示提示数字或步数 */}
                  {hint ? (
                    <span className="font-bold font-mono" style={{ fontSize: `${fontSizePx}px` }}>
                      {hint.value}
                    </span>
                  ) : isUserPath ? (
                    <span className="font-bold font-mono" style={{ fontSize: `${fontSizePx}px` }}>
                      {currentStepNumber}
                    </span>
                  ) : null}
                  {/* 当前位置的动画提示 */}
                  {isLast && !isFinished && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/50 animate-ping opacity-75"></div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>

      {/* 控制按钮区域 */}
      <div className="mt-8 flex items-stretch gap-4">
        {/* 撤销按钮 */}
        <button 
          onClick={() => {
            if (userPath.length > 1) {
              const newPath = userPath.slice(0, -1);
              setUserPath(newPath);
              setIsValidPath(validatePath(newPath));
              playTone(240, 0.08);
            }
          }}
          disabled={userPath.length <= 1 || submitStatus === 'submitting'}
          className="w-20 sm:w-24 aspect-square flex flex-col items-center justify-center gap-1 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all rounded-3xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-icons-outlined text-2xl">undo</span>
          <span className="text-xs">撤销</span>
        </button>
        {/* 重置按钮 */}
        <button 
          onClick={() => {
            setUserPath([]);
            setIsFinished(false);
            setIsValidPath(true);
          }}
          disabled={submitStatus === 'submitting'}
          className="w-20 sm:w-24 aspect-square flex flex-col items-center justify-center gap-1 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all rounded-3xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-icons-outlined text-2xl">restart_alt</span>
          <span className="text-xs">重置</span>
        </button>
        {/* 提交按钮 */}
        <button 
          disabled={!isFinished || !isValidPath || submitStatus === 'submitting' || submitStatus === 'success'}
          onClick={handleSubmit}
          className={`flex-1 flex items-center justify-center gap-3 py-6 px-8 text-white text-xl font-bold transition-all rounded-[2rem] shadow-xl active:scale-[0.98] ${
            submitStatus === 'success' 
              ? 'bg-green-500 hover:opacity-95 shadow-green-500/30' 
              : submitStatus === 'error'
                ? 'bg-red-500 hover:opacity-95 shadow-red-500/30'
                : submitStatus === 'submitting' || isConfirming
                  ? 'bg-slate-400 shadow-slate-400/30 cursor-wait'
                  : !isValidPath
                    ? 'bg-red-500/80 shadow-red-500/30 cursor-not-allowed'
                    : isFinished 
                      ? 'bg-secondary hover:opacity-95 shadow-sky-400/30' 
                      : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
          }`}
        >
          {submitStatus === 'submitting' || isConfirming ? (
            <>
              <span className="material-icons-outlined text-2xl animate-spin">refresh</span>
              {isConfirming ? '确认中...' : '提交中...'}
            </>
          ) : submitStatus === 'success' ? (
            <>
              <span className="material-icons-outlined text-2xl">check_circle</span>
              提交成功！
            </>
          ) : submitStatus === 'error' ? (
            <>
              <span className="material-icons-outlined text-2xl">error</span>
              重新提交
            </>
          ) : !isValidPath ? (
            <>
              <span className="material-icons-outlined text-2xl">warning</span>
              路径不匹配
            </>
          ) : !isConnected ? (
            <>
              <span className="material-icons-outlined text-2xl">account_balance_wallet</span>
              请连接钱包
            </>
          ) : (
            <>
              <span className="material-icons-outlined text-2xl">send</span>
              提交结果
            </>
          )}
        </button>
      </div>

      {/* 错误消息提示 */}
      {errorMessage && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3">
          <span className="material-icons-outlined text-lg">error_outline</span>
          <div className="flex-1">
            <div className="font-semibold">提交失败</div>
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
    </div>
  );
};

export default Game;
