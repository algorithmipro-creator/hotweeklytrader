const fetch = require('node-fetch');

const txHash = '0xd6980eaf72fc3f5d9fd77ec87dd03e8bdf9ae3a6463432fb226518ed89f1c9bf';
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
  if (d.result && d.result.blockNumber) {
    const blockNum = parseInt(d.result.blockNumber, 16);
    console.log('Block number:', blockNum);
  }
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});