from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
from textblob import TextBlob
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db, init_db
from models import SearchHistoryDB
from schemas import HeadlineSentiment, SentimentResponse, SearchHistoryItem, TrendPoint, TickerTrendResponse
# Initialize tables on startup if they don't exist
init_db()

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/analyze/{ticker}", response_model=SentimentResponse)
def analyze_ticker(ticker: str, db: Session = Depends(get_db)):
    try:
        stock = yf.Ticker(ticker.upper())
        hist = stock.history(period="1d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Ticker not found or no data available.")

        current_price = float(hist["Close"].iloc[-1])

        # Fetch headlines safely
        news_list = stock.news
        raw_titles = []
        if news_list:
            raw_titles = [item.get("title", "").strip() for item in news_list[:5] if item.get("title")]

        has_news = len(raw_titles) > 0
        if not has_news:
            raw_titles = [f"No recent news headlines found for {ticker.upper()}."]

        # Score each headline individually
        headline_items: list[HeadlineSentiment] = []
        total_polarity = 0.0

        for title in raw_titles:
            polarity = round(TextBlob(title).sentiment.polarity, 3)
            if not has_news:
                label = "No Data"
                polarity = 0.0
            elif polarity > 0.05:
                label = "Bullish"
            elif polarity < -0.05:
                label = "Bearish"
            else:
                label = "Neutral"

            total_polarity += polarity
            headline_items.append(
                HeadlineSentiment(
                    title=title,
                    polarity=polarity,
                    label=label
                )
            )

        avg_polarity = round(total_polarity / len(headline_items), 3) if has_news else 0.0

        if not has_news:
            sentiment_label = "Neutral (No News)"
        elif avg_polarity > 0.05:
            sentiment_label = "Bullish (Positive)"
        elif avg_polarity < -0.05:
            sentiment_label = "Bearish (Negative)"
        else:
            sentiment_label = "Neutral"

        # Save search to PostgreSQL
        new_search = SearchHistoryDB(
            ticker=ticker.upper(),
            current_price=round(current_price, 2),
            sentiment=sentiment_label,
            polarity_score=avg_polarity
        )
        db.add(new_search)
        db.commit()
        db.refresh(new_search)

        return SentimentResponse(
            ticker=ticker.upper(),
            current_price=round(current_price, 2),
            sentiment=sentiment_label,
            polarity_score=avg_polarity,
            has_news=has_news,
            headlines=headline_items
        )

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history", response_model=list[SearchHistoryItem])
def get_search_history(
    ticker: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(SearchHistoryDB)

    if ticker:
        query = query.filter(SearchHistoryDB.ticker == ticker.strip().upper())

    records = (
        query.order_by(SearchHistoryDB.searched_at.desc(), SearchHistoryDB.id.desc())
        .limit(limit)
        .all()
    )
    return records

@app.get("/api/ticker/{ticker}/trend", response_model=TickerTrendResponse)
def get_ticker_trend(ticker: str, limit: int = 30, db: Session = Depends(get_db)):
    clean_ticker = ticker.strip().upper()

    # Fetch the most recent 'limit' records for this ticker
    records = (
        db.query(SearchHistoryDB)
        .filter(SearchHistoryDB.ticker == clean_ticker)
        .order_by(SearchHistoryDB.searched_at.desc(), SearchHistoryDB.id.desc())
        .limit(limit)
        .all()
    )

    if not records:
        raise HTTPException(
            status_code=404,
            detail=f"No historical records found for {clean_ticker}. Analyze it first."
        )

    # Reverse into chronological order (oldest -> newest) for trend calculation & charting
    chronological = list(reversed(records))

    first_price = chronological[0].current_price
    latest_price = chronological[-1].current_price
    price_change_pct = (
        round(((latest_price - first_price) / first_price) * 100, 2)
        if first_price
        else 0.0
    )

    avg_polarity = round(
        sum(r.polarity_score for r in chronological) / len(chronological),
        3
    )

    history_points = [
        TrendPoint(
            searched_at=r.searched_at,
            current_price=r.current_price,
            polarity_score=r.polarity_score,
            sentiment=r.sentiment
        )
        for r in chronological
    ]

    return TickerTrendResponse(
        ticker=clean_ticker,
        total_checks=len(chronological),
        avg_polarity=avg_polarity,
        latest_price=latest_price,
        price_change_pct=price_change_pct,
        history=history_points
    )