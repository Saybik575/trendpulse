from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from database import Base

class SearchHistoryDB(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=False)
    current_price = Column(Float)
    sentiment = Column(String)
    polarity_score = Column(Float)
    searched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))