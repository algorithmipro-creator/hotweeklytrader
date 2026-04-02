import requests
import json

RPC_URL = 'https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf'
DEPOSIT_ADDRESS = '0x1fffbcda5bb208cbad95882a9e57fa9354533aac'
USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955'

# Transaction block: 0x55dfd5c = 90046780
# Let's check this exact block
from_block = 90046780
to_block = 90046780

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
print(f'Found {len(logs)} USDT transfers to {DEPOSIT_ADDRESS} in block {from_block}')
for log in logs:
    from_addr = '0x' + log['topics'][1][26:]
    amount = int(log['data'], 16) / 1e18
    tx_hash = log['transactionHash']
    block = int(log['blockNumber'], 16)
    print(f'  From: {from_addr}')
    print(f'  Amount: {amount} USDT')
    print(f'  TX: {tx_hash}')
    print(f'  Block: {block}')
    print()

# Also check what the watcher is doing - get logs for the block range it's actually checking
# From logs: lastProcessed=90046702, checking from 90046703 onwards
print('---')
print('Checking blocks 90046703-90046780...')
data2 = {
    'jsonrpc': '2.0',
    'method': 'eth_getLogs',
    'params': [{
        'address': USDT_CONTRACT,
        'fromBlock': '0x' + hex(90046703)[2:],
        'toBlock': '0x' + hex(90046780)[2:],
        'topics': [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            None,
            '0x000000000000000000000000' + DEPOSIT_ADDRESS[2:]
        ]
    }],
    'id': 2
}

resp2 = requests.post(RPC_URL, json=data2)
result2 = resp2.json()
logs2 = result2.get('result', [])
print(f'Found {len(logs2)} logs')
for log in logs2:
    print(f'  TX: {log["transactionHash"]}')