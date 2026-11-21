from datetime import datetime
from pydantic import BaseModel
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class HeadlineSentiment(BaseModel):
    title: str
    polarity: float
    label: str

class SentimentResponse(BaseModel):
    ticker: str
    current_price: float | None
    sentiment: str
    polarity_score: float
    has_news: bool
    headlines: list[HeadlineSentiment]

class SearchHistoryItem(BaseModel):
    id: int
    ticker: str
    current_price: float
    sentiment: str
    polarity_score: float
    searched_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TrendPoint(BaseModel):
    searched_at: datetime
    current_price: float
    polarity_score: float
    sentiment: str

class TickerTrendResponse(BaseModel):
    ticker: str
    total_checks: int
    avg_polarity: float
    latest_price: float
    price_change_pct: float
    history: list[TrendPoint]