from collector import build_snapshot_payload


def test_build_snapshot_payload_normalizes_mt5_metrics():
    payload = build_snapshot_payload(
        trader_id="trader-1",
        investment_period_id="period-1",
        profit_percent=12.5,
        trade_count=14,
        win_rate=71.4286,
        captured_at="2026-04-17T12:00:00Z",
        raw_payload={"account": 1001},
    )

    assert payload == {
        "trader_id": "trader-1",
        "investment_period_id": "period-1",
        "source_type": "MT5",
        "profit_percent": "12.5000",
        "trade_count": 14,
        "win_rate": "71.4286",
        "captured_at": "2026-04-17T12:00:00Z",
        "raw_payload": {"account": 1001},
    }

