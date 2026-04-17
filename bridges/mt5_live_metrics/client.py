import requests


def push_snapshot(base_url, secret, payload):
    return requests.post(
        f"{base_url}/internal/trader-period-live-metrics",
        json=payload,
        headers={"x-internal-secret": secret},
        timeout=30,
    )
