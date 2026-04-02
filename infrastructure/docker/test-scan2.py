import requests

RPC_URL = "https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf"
USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955"
DEPOSIT_ADDRESS = "0x1fffbcda5bb208cbad95882a9e57fa9354533aac"

# Test exactly around block 90045788
from_block = 90045700
to_block = 90045800
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
print(f"  fromBlock: {from_block}")
print(f"  toBlock: {to_block}")

resp = requests.post(RPC_URL, json=data, timeout=30)
result = resp.json()
logs = result.get('result', [])
print(f"Found {len(logs)} logs")

# Test with larger range
from_block2 = 90040000
to_block2 = 90050000

data2 = {
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
        "address": USDT_CONTRACT,
        "fromBlock": "0x" + hex(from_block2)[2:],
        "toBlock": "0x" + hex(to_block2)[2:],
        "topics": [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            None,
            topic_to
        ]
    }],
    "id": 2
}

resp2 = requests.post(RPC_URL, json=data2, timeout=60)
result2 = resp2.json()
logs2 = result2.get('result', [])
print(f"\nLarger range {from_block2}-{to_block2}: Found {len(logs2)} logs")