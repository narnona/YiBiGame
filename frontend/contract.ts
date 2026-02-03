import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Wagmi 配置，用于连接钱包和区块链
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '' }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});

// 智能合约地址，从环境变量中读取
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

// 智能合约 ABI，定义了合约的函数接口
export const CONTRACT_ABI = [
  {
    type: 'function',
    name: 'createLevel',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'size', type: 'uint8' },
      {
        name: 'hints',
        type: 'tuple[]',
        components: [
          {
            name: 'coord',
            type: 'tuple',
            components: [
              { name: 'x', type: 'uint8' },
              { name: 'y', type: 'uint8' }
            ]
          },
          { name: 'value', type: 'uint16' }
        ]
      }
    ],
    outputs: [{ name: 'levelId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'submitSolution',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'levelId', type: 'uint256' },
      {
        name: 'path',
        type: 'tuple[]',
        components: [
          { name: 'x', type: 'uint8' },
          { name: 'y', type: 'uint8' }
        ]
      }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getLevel',
    stateMutability: 'view',
    inputs: [{ name: 'levelId', type: 'uint256' }],
    outputs: [
      {
        name: 'level',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'size', type: 'uint8' },
          { name: 'creator', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'completionCount', type: 'uint256' },
          {
            name: 'hints',
            type: 'tuple[]',
            components: [
              {
                name: 'coord',
                type: 'tuple',
                components: [
                  { name: 'x', type: 'uint8' },
                  { name: 'y', type: 'uint8' }
                ]
              },
              { name: 'value', type: 'uint16' }
            ]
          }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'verifySolution',
    stateMutability: 'view',
    inputs: [
      { name: 'levelId', type: 'uint256' },
      {
        name: 'path',
        type: 'tuple[]',
        components: [
          { name: 'x', type: 'uint8' },
          { name: 'y', type: 'uint8' }
        ]
      }
    ],
    outputs: [
      { name: 'valid', type: 'bool' },
      { name: 'reason', type: 'string' }
    ]
  }
] as const;

// 提示点输入类型，用于调用合约
export type HintInput = {
  coord: { x: number; y: number };
  value: number;
};

// 坐标点输入类型，用于调用合约
export type PointInput = {
  x: number;
  y: number;
};
