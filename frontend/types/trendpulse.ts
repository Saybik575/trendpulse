export interface HeadlineSentiment {
  title: string;
  polarity: number;
  label: string;
}

export interface SentimentResponse {
  ticker: string;
  current_price: number | null;
  sentiment: string;
  polarity_score: number;
  has_news: boolean;
  headlines: HeadlineSentiment[];
}

export interface SearchHistoryItem {
  id: number;
  ticker: string;
  current_price: number;
  sentiment: string;
  polarity_score: number;
  searched_at: string;
}

export interface TrendPoint {
  searched_at: string;
  current_price: number;
  polarity_score: number;
  sentiment: string;
}

export interface TickerTrendResponse {
  ticker: string;
  total_checks: number;
  avg_polarity: number;
  latest_price: number;
  price_change_pct: number;
  history: TrendPoint[];
}