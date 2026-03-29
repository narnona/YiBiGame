interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_DATA_SOURCE?: 'subgraph' | 'backend';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUBGRAPH_URL?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_GITHUB_URL?: string;
  readonly VITE_CREATOR_X?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
