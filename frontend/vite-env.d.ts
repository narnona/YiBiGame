interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_GITHUB_URL?: string;
  readonly VITE_CREATOR_X?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
