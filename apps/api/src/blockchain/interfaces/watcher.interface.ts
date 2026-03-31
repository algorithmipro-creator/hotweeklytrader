import { OnChainTransaction } from './network.interface';

export interface BlockchainWatcher {
  getNetworkName(): string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getLatestBlock(): Promise<number>;
  checkTransaction(txHash: string): Promise<OnChainTransaction | null>;
}
