import requests
import json

# Try different RPC endpoints
RPC_ENDPOINTS = [
    'https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf',
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.binance.org',
]

DEPOSIT_ADDRESS = '0x1fffbcda5bb208cbad95882a9e57fa9354533aac'
USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955'
TX_HASH = '0x899524b3928ab28d7cc46360ea034149e6c0c549dc353c0f62438a900b432a3c'

# First, let's get the transaction to see block number
for rpc_url in RPC_ENDPOINTS:
    print(f'Testing {rpc_url}...')
    try:
        # Get transaction
        data = {
            'jsonrpc': '2.0',
            'method': 'eth_getTransactionByHash',
            'params': [TX_HASH],
            'id': 1
        }
        resp = requests.post(rpc_url, json=data, timeout=10)
        result = resp.json()
        if 'result' in result and result['result']:
            block = int(result['result']['blockNumber'], 16)
            print(f'  TX found in block {block}')
            
            # Now get logs for that block
            log_data = {
                'jsonrpc': '2.0',
                'method': 'eth_getLogs',
                'params': [{
                    'address': USDT_CONTRACT,
                    'fromBlock': hex(block),
                    'toBlock': hex(block),
                    'topics': [
                        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                        None,
                        '0x000000000000000000000000' + DEPOSIT_ADDRESS[2:]
                    ]
                }],
                'id': 2
            }
            log_resp = requests.post(rpc_url, json=log_data, timeout=10)
            log_result = log_resp.json()
            logs = log_result.get('result', [])
            print(f'  Found {len(logs)} USDT logs to {DEPOSIT_ADDRESS}')
            if logs:
                for log in logs:
                    print(f'    TX: {log["transactionHash"]}')
            break
        else:
            print(f'  Error: {result}')
    except Exception as e:
        print(f'  Exception: {e}')