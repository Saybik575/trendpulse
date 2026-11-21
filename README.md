# TrendPulse — Financial Sentiment & Historical Trend Analytics

Full-stack market sentiment and historical price tracking platform built with **FastAPI**, **SQLAlchemy 2.0**, **Pydantic v2**, **PostgreSQL**, and **Next.js (TypeScript + Tailwind CSS)**.

---

## Architecture & Data Flow

1. **Ingestion & Validation (`yfinance` + FastAPI):** Fetches real-time ticker prices and recent news headlines, returning structured `404` responses for unknown symbols and isolating external feed anomalies.
2. **Per-Headline Sentiment & Data Hygiene:** Evaluates headline polarity scores and flags empty news feeds explicitly (`has_news: false`, `"Neutral (No News)"`) so missing external data is never misclassified as neutral market sentiment.
3. **Persistence (`SQLAlchemy 2.0` + `PostgreSQL`):** Stores timestamped lookup snapshots in PostgreSQL using environment-driven credentials (`.env`).
4. **Analytics & Visualization (`Next.js` + `TypeScript`):** Consumes typed REST endpoints to render live snapshots, headline polarity breakdowns, historical price change metrics, an SVG price trend line, and click-to-reanalyze search history.

---

## Project Structure

```text
trendpulse/
├── backend/
│   ├── main.py              # FastAPI routes, CORS middleware, sentiment pipeline
│   ├── database.py          # SQLAlchemy 2.0 DeclarativeBase & PostgreSQL session setup
│   ├── models.py            # ORM models (SearchHistoryDB)
│   ├── schemas.py           # Pydantic v2 response schemas (ConfigDict)
│   ├── .env.example         # Environment variable template
│   └── test/
│       ├── conftest.py      # Shared in-memory SQLite test DB & FastAPI TestClient
│       ├── test_endpoints.py# Tests for /api/analyze & /api/history with mocked yfinance
│       └── test_trend.py    # Tests for /api/ticker/{ticker}/trend calculations & 404s
└── frontend/
    ├── app/page.tsx         # Dashboard UI & SVG price trend visualization
    ├── lib/api.ts           # Typed API client with error-detail parsing
    └── types/trendpulse.ts  # TypeScript interfaces matching Pydantic schemas
```

---

## API Endpoints

| Method | Endpoint                     | Description                                                                                             |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/analyze/{ticker}`      | Fetches latest price & headlines, scores polarity, persists record, returns `SentimentResponse`.        |
| GET    | `/api/history`               | Returns recent persisted lookups; supports optional `?ticker=` filter and `?limit=`.                    |
| GET    | `/api/ticker/{ticker}/trend` | Computes `total_checks`, `price_change_pct`, `avg_polarity`, and chronological price/sentiment history. |

---

## Local Setup & Running

### 1. Backend (FastAPI + PostgreSQL)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-dotenv yfinance textblob pandas pytest httpx
```

Copy `backend/.env.example` to `backend/.env` and fill in your PostgreSQL credentials, then start the server:

```powershell
uvicorn main:app --reload
```

### 2. Automated Tests (pytest)

Runs against an isolated in-memory SQLite database with deterministic mocked market feeds:

```powershell
cd backend
python -m pytest -v
```

### 3. Frontend (Next.js)

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
