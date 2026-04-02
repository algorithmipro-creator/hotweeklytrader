import requests
import json

RPC_URL = 'https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf'
DEPOSIT_ADDRESS = '0x1fffbcda5bb208cbad95882a9e57fa9354533aac'
USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955'

# The transaction was in block 90045788
block = 90045788
from_block = block
to_block = block

data = {
    'jsonrpc': '2.0',
    'method': 'eth_getLogs',
    'params': [{
        'address': USDT_CONTRACT,
        'fromBlock': hex(from_block),
        'toBlock': hex(to_block),
        'topics': [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            None,
            '0x000000000000000000000000' + DEPOSIT_ADDRESS[2:]
        ]
    }],
    'id': 1
}

resp = requests.post(RPC_URL, json=data)
result = resp.json()
logs = result.get('result', [])

print(f'Checking block {from_block}')
print(f'Found {len(logs)} logs')
if logs:
    for log in logs:
        print(f'  TX: {log["transactionHash"]}')
        print(f'  Amount: {int(log["data"], 16) / 1e18} USDT')
else:
    print(f'  Full response: {json.dumps(result, indent=2)}')