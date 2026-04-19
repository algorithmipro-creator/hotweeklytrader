export type DepositDetailLayoutInput = {
  status?: string | null;
  network?: string | null;
  asset_symbol?: string | null;
  ton_deposit_memo?: string | null;
};

export function getDepositDetailLayout(input: DepositDetailLayoutInput) {
  const isAwaitingTransfer = input.status === 'AWAITING_TRANSFER';
  const hasTonMemo = input.network === 'TON' && Boolean(input.ton_deposit_memo);
  const showTonMemoInTransferInstructions = isAwaitingTransfer && hasTonMemo;

  return {
    showTransferInstructions: isAwaitingTransfer,
    showTonMemoInTransferInstructions,
    showNetworkSummary: !showTonMemoInTransferInstructions,
    showAssetSummary: !showTonMemoInTransferInstructions,
  };
}


export type DepositReturnAddressPanelInput = {
  network?: string | null;
  asset_symbol?: string | null;
  source_address?: string | null;
  return_address?: string | null;
  return_memo?: string | null;
};

export function getDepositReturnAddressPanel(input: DepositReturnAddressPanelInput) {
  const isExchangeAddress = input.network === 'TON'
    && (!input.source_address || Boolean(input.return_memo) || Boolean(input.return_address));
  const address = isExchangeAddress
    ? input.return_address ?? null
    : input.source_address ?? input.return_address ?? null;

  return {
    visible: isExchangeAddress || Boolean(address),
    address,
    labelKey: 'depositDetail.returnAddressForAsset',
    labelParams: { asset: input.asset_symbol ?? 'USDT' },
    isExchangeAddress,
  };
}
