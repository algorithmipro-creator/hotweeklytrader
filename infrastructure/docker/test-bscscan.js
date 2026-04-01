fetch('https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=28NQ27PCP48D8X4YQB9QPBHJETIIZASE7Z')
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d)));
