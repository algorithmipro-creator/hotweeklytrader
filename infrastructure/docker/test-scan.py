import requests

RPC_URL = "https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf"
USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955"
DEPOSIT_ADDRESS = "0x1fffbcda5bb208cbad95882a9e57fa9354533aac"

# Test exact params as watcher would use - scanning blocks 90046500-90047000
# (approximately where the transaction should be found)
from_block = 90046500
to_block = 90047000
topic_to = "0x000000000000000000000000" + DEPOSIT_ADDRESS[2:]

data = {
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
        "address": USDT_CONTRACT,
        "fromBlock": "0x" + hex(from_block)[2:],
        "toBlock": "0x" + hex(to_block)[2:],
        "topics": [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            None,
            topic_to
        ]
    }],
    "id": 1
}

print(f"Testing RPC call:")
print(f"  fromBlock: 0x{hex(from_block)[2:]} = {from_block}")
print(f"  toBlock: 0x{hex(to_block)[2:]} = {to_block}")
print(f"  topic_to: {topic_to}")

resp = requests.post(RPC_URL, json=data, timeout=30)
result = resp.json()
print(f"\nResponse:")
print(f"  status: {resp.status_code}")
print(f"  result count: {len(result.get('result', []))}")
print(f"  full result: {result}")