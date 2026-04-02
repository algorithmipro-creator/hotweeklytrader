const fetch = require('node-fetch');

const TATUM_URL = 'https://bsc-mainnet.gateway.tatum.io';
const TATUM_API_KEY = 't-69ce40a088cd3f3d43a9285f-caf203bdb4044756b9b27319';
const USDT_BSC_CONTRACT = '0x55d398326f99059ff775485246999027b3197955';
const address = '0xe185f7ea1c6028b57d19ae13cd9ed1f82668dd65';

const fromBlock = '0x55dfd5c';
const toBlock = '0x55dfd5c';

const postData = JSON.stringify({
  jsonrpc: '2.0',
  method: 'eth_getLogs',
  params: [{
    fromBlock: fromBlock,
    toBlock: toBlock,
    address: USDT_BSC_CONTRACT,
    topics: [
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      null,
      '0x000000000000000000000000' + address.slice(2).toLowerCase()
    ]
  }],
  id: 1
});

console.log('Request:', postData);

fetch(TATUM_URL + '/', {
  method: 'POST',
  headers: { 
    'x-api-key': TATUM_API_KEY,
    'Content-Type': 'application/json'
  },
  body: postData
}).then(r => r.json()).then(d => {
  console.log('Response:', JSON.stringify(d, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});