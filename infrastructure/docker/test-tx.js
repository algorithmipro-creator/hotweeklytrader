const fetch = require('node-fetch');

const txHash = '0x899524b3928ab28d7cc46360ea034149e6c0c549dc353c0f62438a900b432a3c';
const rpcUrl = 'https://bsc-dataseed.binance.org';

const postData = JSON.stringify({
  jsonrpc: '2.0',
  method: 'eth_getTransactionByHash',
  params: [txHash],
  id: 1
});

fetch(rpcUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: postData
}).then(r => r.json()).then(d => {
  console.log(JSON.stringify(d, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});