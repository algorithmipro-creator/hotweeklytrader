import requests

RPC_URL = "https://go.getblock.io/a7b30a17417f4361b54deb9912a9b5bf"

# Test simple call
data = {
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
}

try:
    resp = requests.post(RPC_URL, json=data, timeout=30)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
except Exception as e:
    print(f"Exception: {e}")
    
# Test getLogs with small range
data2 = {
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
        "address": "0x55d398326f99059ff775485246999027b3197955",
        "fromBlock": "0x55dfd04",
        "toBlock": "0x55dfd14",
        "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", None, "0x0000000000000000000000001fffbcda5bb208cbad95882a9e57fa9354533aac"]
    }],
    "id": 2
}

try:
    resp2 = requests.post(RPC_URL, json=data2, timeout=30)
    print(f"\ngetLogs Status: {resp2.status_code}")
    print(f"getLogs Response: {resp2.text[:500]}")
except Exception as e:
    print(f"getLogs Exception: {e}")