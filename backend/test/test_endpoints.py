import pandas as pd
from datetime import datetime, timezone
import main
from models import SearchHistoryDB


class FakeTickerWithNews:
    """Fake yfinance Ticker returning valid price history and positive news."""

    def __init__(self, symbol: str):
        self.symbol = symbol
        self.news = [
            {"title": "Company reports record profit and strong growth outlook"},
            {"title": "Analysts upgrade stock after impressive earnings beat"},
        ]

    def history(self, period: str = "1d"):
        return pd.DataFrame({"Close": [195.50]})


class FakeTickerWithoutNews:
    """Fake yfinance Ticker returning price history but an empty news list."""

    def __init__(self, symbol: str):
        self.symbol = symbol
        self.news = []

    def history(self, period: str = "1d"):
        return pd.DataFrame({"Close": [250.00]})


class FakeTickerEmptyHistory:
    """Fake yfinance Ticker simulating an invalid/delisted ticker with no price data."""

    def __init__(self, symbol: str):
        self.symbol = symbol
        self.news = []

    def history(self, period: str = "1d"):
        return pd.DataFrame()


def test_history_endpoint_filters_by_ticker_and_respects_limit(client, db_session):
    db_session.query(SearchHistoryDB).delete()
    db_session.add_all([
        SearchHistoryDB(
            ticker="AAPL",
            current_price=220.0,
            sentiment="Neutral",
            polarity_score=0.0,
            searched_at=datetime(2026, 11, 10, 9, 0, tzinfo=timezone.utc),
        ),
        SearchHistoryDB(
            ticker="AAPL",
            current_price=225.0,
            sentiment="Bullish (Positive)",
            polarity_score=0.3,
            searched_at=datetime(2026, 11, 11, 9, 0, tzinfo=timezone.utc),
        ),
        SearchHistoryDB(
            ticker="MSFT",
            current_price=410.0,
            sentiment="Neutral",
            polarity_score=0.0,
            searched_at=datetime(2026, 11, 12, 9, 0, tzinfo=timezone.utc),
        ),
    ])
    db_session.commit()

    res = client.get("/api/history?ticker=aapl&limit=1")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 1
    assert rows[0]["ticker"] == "AAPL"
    assert rows[0]["current_price"] == 225.0


def test_analyze_endpoint_with_news_persists_and_scores(client, db_session, monkeypatch):
    monkeypatch.setattr(main.yf, "Ticker", FakeTickerWithNews)
    db_session.query(SearchHistoryDB).delete()
    db_session.commit()

    res = client.get("/api/analyze/nvda")
    assert res.status_code == 200

    payload = res.json()
    assert payload["ticker"] == "NVDA"
    assert payload["current_price"] == 195.5
    assert payload["has_news"] is True
    assert len(payload["headlines"]) == 2
    assert payload["polarity_score"] > 0.05
    assert "Bullish" in payload["sentiment"]

    history_res = client.get("/api/history?ticker=NVDA")
    assert history_res.status_code == 200
    assert len(history_res.json()) == 1


def test_analyze_endpoint_without_news_sets_has_news_false(client, monkeypatch):
    monkeypatch.setattr(main.yf, "Ticker", FakeTickerWithoutNews)

    res = client.get("/api/analyze/GOOG")
    assert res.status_code == 200

    payload = res.json()
    assert payload["ticker"] == "GOOG"
    assert payload["current_price"] == 250.0
    assert payload["has_news"] is False
    assert payload["polarity_score"] == 0.0
    assert payload["sentiment"] == "Neutral (No News)"
    assert payload["headlines"][0]["label"] == "No Data"


def test_analyze_endpoint_unknown_ticker_returns_404(client, monkeypatch):
    monkeypatch.setattr(main.yf, "Ticker", FakeTickerEmptyHistory)

    res = client.get("/api/analyze/BADTICKER")
    assert res.status_code == 404
    assert "Ticker not found" in res.json()["detail"]