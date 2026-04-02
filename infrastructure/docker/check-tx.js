const RPC_URL = 'https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf';
const TX_HASH = '0x899524b3928ab28d7cc46360ea034149e6c0c549dc353c0f62438a900b432a3c';

async function check() {
  // Get transaction receipt
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [TX_HASH],
      id: 1,
    }),
  });
  const data = await res.json();
  console.log('Receipt:', JSON.stringify(data, null, 2));

  // Get transaction details
  const res2 = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [TX_HASH],
      id: 2,
    }),
  });
  const data2 = await res2.json();
  console.log('TX:', JSON.stringify(data2, null, 2));
}

check();
