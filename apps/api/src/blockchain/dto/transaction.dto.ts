export class TransactionLogDto {
  transaction_log_id: string;
  direction: string;
  network: string;
  asset_symbol: string;
  tx_hash: string;
  from_address: string | null;
  to_address: string;
  amount: string;
  fee_amount: string | null;
  confirmations: number;
  status: string;
  raw_payload_reference: string | null;
  source_system: string | null;
  created_at: string;
  updated_at: string;
}
