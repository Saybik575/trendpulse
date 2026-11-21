import {
    SearchHistoryItem,
    SentimentResponse,
    TickerTrendResponse,
} from "@/types/trendpulse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

async function parseErrorDetail(res: Response, fallback: string): Promise<string> {
    try {
        const body = await res.json();
        if (typeof body?.detail === "string") {
            return body.detail;
        }
    } catch {
       // Ignore JSON parse errors on non-JSON responses 
    }
    return fallback;
}

export async function analyzeTicker(ticker: string): Promise<SentimentResponse> {
  const cleanTicker = ticker.trim().toUpperCase();
  const res = await fetch(
    `${API_BASE_URL}/api/analyze/${encodeURIComponent(cleanTicker)}`
  );

  if (!res.ok) {
    const detail = await parseErrorDetail(
      res,
      `Failed to analyze ticker ${cleanTicker}`
    );
    throw new Error(detail);
  }

  return res.json();
}

export async function fetchSearchHistory(
  ticker?: string,
  limit = 15
): Promise<SearchHistoryItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (ticker && ticker.trim()) {
    params.set("ticker", ticker.trim().toUpperCase());
  }

  const res = await fetch(`${API_BASE_URL}/api/history?${params.toString()}`);
  if (!res.ok) {
    const detail = await parseErrorDetail(res, "Failed to load search history");
    throw new Error(detail);
  }

  return res.json();
}

export async function fetchTickerTrend(
  ticker: string,
  limit = 30
): Promise<TickerTrendResponse> {
  const cleanTicker = ticker.trim().toUpperCase();
  const res = await fetch(
    `${API_BASE_URL}/api/ticker/${encodeURIComponent(cleanTicker)}/trend?limit=${limit}`
  );

  if (!res.ok) {
    const detail = await parseErrorDetail(
      res,
      `Failed to load trend data for ${cleanTicker}`
    );
    throw new Error(detail);
  }

  return res.json();
}