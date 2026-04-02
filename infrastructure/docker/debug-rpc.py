import requests
import json

RPC_URL = 'https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf'
DEPOSIT_ADDRESS = '0x1fffbcda5bb208cbad95882a9e57fa9354533aac'
USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955'

# Test a range that should include the transaction
# from 90045700 to 90045800
data = {
    'jsonrpc': '2.0',
    'method': 'eth_getLogs',
    'params': [{
        'address': USDT_CONTRACT,
        'fromBlock': '0x' + hex(90045700)[2:],
        'toBlock': '0x' + hex(90045800)[2:],
        'topics': [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            None,
            '0x000000000000000000000000' + DEPOSIT_ADDRESS[2:]
        ]
    }],
    'id': 1
}

print('Query:', json.dumps(data, indent=2))
resp = requests.post(RPC_URL, json=data, timeout=30)
result = resp.json()
print('Response:', json.dumps(result, indent=2))