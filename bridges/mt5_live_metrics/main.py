import json
import time
from pathlib import Path

from collector import build_snapshot_payload


def load_config(path="config.json"):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main():
    config = load_config()
    while True:
        _ = build_snapshot_payload(
            trader_id=config["trader_id"],
            investment_period_id=config["investment_period_id"],
            profit_percent=0.0,
            trade_count=0,
            win_rate=0.0,
            captured_at="1970-01-01T00:00:00Z",
            raw_payload={},
        )
        time.sleep(config.get("poll_interval_minutes", 15) * 60)


if __name__ == "__main__":
    main()

