import { registerAs } from '@nestjs/config';

export default registerAs('blockchain', () => ({
  bsc: {
    rpcUrl: process.env.BLOCKCHAIN_BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    confirmationsRequired: parseInt(process.env.BLOCKCHAIN_BSC_CONFIRMATIONS || '12', 10),
    depositAddress: process.env.BLOCKCHAIN_BSC_DEPOSIT_ADDRESS || '',
    scanApiKey: process.env.BLOCKCHAIN_BSCSCAN_API_KEY || '',
  },
  eth: {
    rpcUrl: process.env.BLOCKCHAIN_ETH_RPC_URL || 'https://eth.llamarpc.com',
    confirmationsRequired: parseInt(process.env.BLOCKCHAIN_ETH_CONFIRMATIONS || '12', 10),
  },
  tron: {
    rpcUrl: process.env.BLOCKCHAIN_TRON_RPC_URL || 'https://api.trongrid.io',
    confirmationsRequired: parseInt(process.env.BLOCKCHAIN_TRON_CONFIRMATIONS || '19', 10),
    depositAddress: process.env.BLOCKCHAIN_TRON_DEPOSIT_ADDRESS || '',
  },
  ton: {
    rpcUrl: process.env.BLOCKCHAIN_TON_RPC_URL || 'https://toncenter.com/api/v2',
    confirmationsRequired: parseInt(process.env.BLOCKCHAIN_TON_CONFIRMATIONS || '20', 10),
    depositAddress: process.env.BLOCKCHAIN_TON_DEPOSIT_ADDRESS || '',
  },
}));
