
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

interface HeaderProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleTheme, isDarkMode }) => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const location = useLocation();
  const navigate = useNavigate();

  const currentView = location.pathname === '/create' ? 'editor' : location.pathname.startsWith('/play') ? 'game' : 'dashboard';

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && chainId !== sepolia.id) {
    switchChain({ chainId: sepolia.id });
  }

  return (
    <header className="sticky top-0 z-50 glass-header border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="material-icons-outlined text-white">grid_view</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">YiBi Game</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => navigate('/')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-medium transition-all ${
                currentView === 'dashboard' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-icons-outlined text-xl">dashboard</span>
              <span>关卡列表</span>
            </button>

            <button 
              onClick={() => navigate('/create')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-medium transition-all ${
                currentView === 'editor' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-icons-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">创建关卡</span>
            </button>

            {isConnected ? (
              <button 
                onClick={() => disconnect()}
                className="hidden md:flex ml-2 items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-full font-semibold transition-all shadow-md shadow-green-500/20"
              >
                <span className="material-icons-outlined text-[18px]">check_circle</span>
                <span>{shortenAddress(address || '')}</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (connectors.length > 0) {
                    connect({ connector: connectors[0], chainId: sepolia.id });
                  }
                }}
                disabled={isPending}
                className="hidden md:block ml-2 bg-secondary hover:bg-sky-500 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? '连接中...' : '连接钱包'}
              </button>
            )}

            <button 
              onClick={onToggleTheme}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <span className="material-icons-outlined">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
