import json
import time
from datetime import datetime, timezone
from pathlib import Path

from client import push_snapshot
from collector import build_snapshot_payload


def load_config(path="config.json"):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def build_placeholder_snapshot(config):
    return build_snapshot_payload(
        trader_id=config["trader_id"],
        investment_period_id=config["investment_period_id"],
        profit_percent=0.0,
        trade_count=0,
        win_rate=0.0,
        captured_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        raw_payload={"mode": "placeholder"},
    )


def main():
    config = load_config()
    while True:
        payload = build_placeholder_snapshot(config)
        response = push_snapshot(config["backend_base_url"], config["backend_secret"], payload)
        response.raise_for_status()
        time.sleep(config.get("poll_interval_minutes", 15) * 60)


if __name__ == "__main__":
    main()
