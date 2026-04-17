def build_snapshot_payload(*, trader_id, investment_period_id, profit_percent, trade_count, win_rate, captured_at, raw_payload=None):
    return {
        "trader_id": trader_id,
        "investment_period_id": investment_period_id,
        "source_type": "MT5",
        "profit_percent": f"{profit_percent:.4f}",
        "trade_count": int(trade_count),
        "win_rate": f"{win_rate:.4f}",
        "captured_at": captured_at,
        "raw_payload": raw_payload,
    }
