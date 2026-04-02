import requests
import json

RPC_URL = 'https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf'
TX = '0x899524b3928ab28d7cc46360ea034149e6c0c549dc353c0f62438a900b432a3c'

data = {
    'jsonrpc': '2.0',
    'method': 'eth_getTransactionReceipt',
    'params': [TX],
    'id': 1
}

resp = requests.post(RPC_URL, json=data)
print(json.dumps(resp.json(), indent=2))

data2 = {
    'jsonrpc': '2.0',
    'method': 'eth_getTransactionByHash',
    'params': [TX],
    'id': 2
}

resp2 = requests.post(RPC_URL, json=data2)
print(json.dumps(resp2.json(), indent=2))