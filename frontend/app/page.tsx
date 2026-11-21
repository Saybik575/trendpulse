"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  analyzeTicker,
  fetchSearchHistory,
  fetchTickerTrend,
} from "@/lib/api";
import {
  SearchHistoryItem,
  SentimentResponse,
  TickerTrendResponse,
  TrendPoint,
} from "@/types/trendpulse";

function PriceTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-slate-400">
        Analyze this ticker at least twice to plot a price movement line.
      </p>
    );
  }

  const width = 420;
  const height = 110;
  const padX = 12;
  const padY = 14;

  const prices = points.map((p) => p.current_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceSpan = maxPrice - minPrice || 1;

  const coords = points.map((pt, idx) => {
    const x = padX + (idx / (points.length - 1)) * (width - padX * 2);
    const normalizedY = (pt.current_price - minPrice) / priceSpan;
    const y = height - padY - normalizedY * (height - padY * 2);
    return { x, y, pt };
  });

  const polylinePoints = coords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>Low: ${minPrice.toFixed(2)}</span>
        <span>High: ${maxPrice.toFixed(2)}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-28 rounded-lg bg-slate-950/70 border border-slate-800/70"
        role="img"
        aria-label="Historical price trend chart"
      >
        <polyline
          fill="none"
          stroke="#818cf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#c7d2fe" />
        ))}
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [analysis, setAnalysis] = useState<SentimentResponse | null>(null);
  const [trend, setTrend] = useState<TickerTrendResponse | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      const items = await fetchSearchHistory(undefined, 10);
      setHistory(items);
    } catch {
      // Keep existing history if background refresh fails
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSearch(e: FormEvent, overrideTicker?: string) {
    e.preventDefault();
    const target = (overrideTicker ?? tickerInput).trim().toUpperCase();
    if (!target) return;

    setTickerInput(target);
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeTicker(target);
      setAnalysis(result);

      await loadHistory();
      try {
        const trendData = await fetchTickerTrend(target, 20);
        setTrend(trendData);
      } catch {
        setTrend(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            TrendPulse
          </h1>
          <p className="text-sm text-slate-400">
            Market sentiment, headline polarity breakdown, and historical search
            trends powered by FastAPI &amp; PostgreSQL.
          </p>
        </header>

        {/* Search Form */}
        <form
          onSubmit={(e) => handleSearch(e)}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Enter ticker (e.g., AAPL, MSFT, RELIANCE.NS)"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {loading ? "Analyzing..." : "Analyze Ticker"}
          </button>
        </form>

        {/* Error Banner */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Analysis & Trend Cards */}
        {analysis && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Sentiment Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {analysis.ticker} Snapshot
                </h2>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-indigo-300">
                  {analysis.sentiment}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Latest Price</p>
                  <p className="text-xl font-semibold text-white">
                    {analysis.current_price !== null
                      ? `$${analysis.current_price.toFixed(2)}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Avg. Polarity</p>
                  <p className="text-xl font-semibold text-white">
                    {analysis.polarity_score.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* Headlines Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Headlines ({analysis.has_news ? "Live Feed" : "No News Found"})
                </p>
                <ul className="space-y-2">
                  {analysis.headlines.map((h, idx) => (
                    <li
                      key={idx}
                      className="rounded-lg bg-slate-950/70 p-3 text-xs space-y-1 border border-slate-800/70"
                    >
                      <p className="text-slate-200 font-medium">{h.title}</p>
                      <p className="text-slate-400">
                        Label:{" "}
                        <span className="text-slate-200">{h.label}</span> |
                        Polarity:{" "}
                        <span className="text-slate-200">{h.polarity}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Historical Trend Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Historical Trend
              </h2>

              {trend ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Total Checks</p>
                      <p className="text-lg font-semibold text-white">
                        {trend.total_checks}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Price Change</p>
                      <p className="text-lg font-semibold text-white">
                        {trend.price_change_pct > 0 ? "+" : ""}
                        {trend.price_change_pct}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Trend Polarity</p>
                      <p className="text-lg font-semibold text-white">
                        {trend.avg_polarity.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  {/* SVG Price Trend Line */}
                  <PriceTrendChart points={trend.history} />

                  <div className="space-y-2 pt-2 border-t border-slate-800 max-h-64 overflow-y-auto">
                    {trend.history.map((pt, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-slate-950/70 px-3 py-2 text-xs border border-slate-800/70"
                      >
                        <span className="text-slate-400">
                          {new Date(pt.searched_at).toLocaleString()}
                        </span>
                        <span className="text-slate-200 font-medium">
                          ${pt.current_price.toFixed(2)}
                        </span>
                        <span className="text-indigo-300">
                          {pt.sentiment} ({pt.polarity_score})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  No trend history available for this ticker yet.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Recent Search History Table */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Search History
          </h2>

          {history.length === 0 ? (
            <p className="text-sm text-slate-400">
              No searches recorded yet. Run an analysis above to populate
              history.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Ticker</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Sentiment</th>
                    <th className="py-2 pr-4">Polarity</th>
                    <th className="py-2">Searched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {history.map((row) => (
                    <tr
                      key={row.id}
                      onClick={(e) => handleSearch(e, row.ticker)}
                      className="cursor-pointer hover:bg-slate-800/40 transition"
                      title="Click to re-analyze this ticker"
                    >
                      <td className="py-2.5 pr-4 font-semibold text-indigo-300">
                        {row.ticker}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-200">
                        ${row.current_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-200">
                        {row.sentiment}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-300">
                        {row.polarity_score.toFixed(3)}
                      </td>
                      <td className="py-2.5 text-xs text-slate-400">
                        {new Date(row.searched_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}