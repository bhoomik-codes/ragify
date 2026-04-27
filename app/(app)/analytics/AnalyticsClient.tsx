"use client";

import React from "react";
import type { RagDto } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import styles from "./AnalyticsClient.module.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type OverviewResponse = {
  rangeDays: number;
  ragId: string | null;
  totals: {
    assistantMessages: number;
    userMessages: number;
    avgTokens: number;
    avgResponseMs: number;
    p50ResponseMs: number;
    p95ResponseMs: number;
  };
  series: Array<{
    date: string;
    assistantMessages: number;
    avgTokens: number;
    avgResponseMs: number;
  }>;
};

export function AnalyticsClient({ rags }: { rags: RagDto[] }) {
  const [rangeDays, setRangeDays] = React.useState<7 | 30>(7);
  const [ragId, setRagId] = React.useState<string>("all");
  const [data, setData] = React.useState<OverviewResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ rangeDays: String(rangeDays) });
      if (ragId !== "all") qs.set("ragId", ragId);
      const res = await fetch(`/api/analytics/overview?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load analytics");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rangeDays, ragId]);

  React.useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Analytics</h1>
          <p>Usage metrics for token consumption and response latency.</p>
        </div>

        <div className={styles.controls}>
          <label className={styles.control}>
            <span>Range</span>
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays((e.target.value === "30" ? 30 : 7) as 7 | 30)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>

          <label className={styles.control}>
            <span>RAG</span>
            <select value={ragId} onChange={(e) => setRagId(e.target.value)}>
              <option value="all">All</option>
              {rags.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && (
        <Card padding="md" className={styles.errorCard}>
          {error}
        </Card>
      )}

      <section className={styles.cards}>
        <Card padding="md" className={styles.metricCard}>
          <div className={styles.metricLabel}>Assistant messages</div>
          <div className={styles.metricValue}>{loading ? "…" : data?.totals.assistantMessages ?? 0}</div>
        </Card>
        <Card padding="md" className={styles.metricCard}>
          <div className={styles.metricLabel}>Avg tokens</div>
          <div className={styles.metricValue}>{loading ? "…" : data?.totals.avgTokens ?? 0}</div>
        </Card>
        <Card padding="md" className={styles.metricCard}>
          <div className={styles.metricLabel}>Avg response (ms)</div>
          <div className={styles.metricValue}>{loading ? "…" : data?.totals.avgResponseMs ?? 0}</div>
        </Card>
        <Card padding="md" className={styles.metricCard}>
          <div className={styles.metricLabel}>p95 response (ms)</div>
          <div className={styles.metricValue}>{loading ? "…" : data?.totals.p95ResponseMs ?? 0}</div>
        </Card>
      </section>

      <section className={styles.charts}>
        <Card padding="md" className={styles.chartCard}>
          <h3>Assistant messages per day</h3>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="assistantMessages" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md" className={styles.chartCard}>
          <h3>Latency and tokens (avg per day)</h3>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgResponseMs"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgTokens"
                  stroke="var(--text-muted)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
}

