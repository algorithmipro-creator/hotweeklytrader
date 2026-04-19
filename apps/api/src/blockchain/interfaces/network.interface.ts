export interface NetworkConfig {
  name: string;
  chainId?: number;
  rpcUrl: string;
  nativeCurrency: string;
  supportedTokens: string[];
  confirmationsRequired: number;
  pollingIntervalMs: number;
  blockConfirmations: number;
}

export interface OnChainTransaction {
  txHash: string;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
  amount: string;
  memo?: string;
  tokenSymbol: string;
  confirmations: number;
  timestamp: Date;
  network: string;
  rawPayload?: string;
}
