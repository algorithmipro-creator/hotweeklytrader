import requests
import json

API_URL = 'http://localhost:3000'
TX_HASH = '0x899524b3928ab28d7cc46360ea034149e6c0c549dc353c0f62438a900b432a3c'

resp = requests.get(f'{API_URL}/deposits', headers={'Content-Type': 'application/json'})
print('Status:', resp.status_code)
print(json.dumps(resp.json(), indent=2))