from datetime import datetime, timezone
from models import SearchHistoryDB


def test_trend_endpoint_not_found(client, db_session):
    db_session.query(SearchHistoryDB).delete()
    db_session.commit()

    response = client.get("/api/ticker/UNKNOWNXYZ/trend")
    assert response.status_code == 404
    assert "No historical records found" in response.json()["detail"]


def test_trend_endpoint_calculates_change_and_average(client, db_session):
    db_session.query(SearchHistoryDB).delete()
    db_session.add_all([
        SearchHistoryDB(
            ticker="MSFT",
            current_price=400.0,
            sentiment="Neutral",
            polarity_score=0.0,
            searched_at=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
        ),
        SearchHistoryDB(
            ticker="MSFT",
            current_price=420.0,
            sentiment="Bullish (Positive)",
            polarity_score=0.4,
            searched_at=datetime(2026, 11, 2, 10, 0, tzinfo=timezone.utc),
        ),
    ])
    db_session.commit()

    response = client.get("/api/ticker/MSFT/trend")
    assert response.status_code == 200

    data = response.json()
    assert data["ticker"] == "MSFT"
    assert data["total_checks"] == 2
    assert data["latest_price"] == 420.0
    assert data["price_change_pct"] == 5.0
    assert data["avg_polarity"] == 0.2
    assert len(data["history"]) == 2