'use client';

import React, { useMemo, useRef } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { Maximize2, Download, Copy, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import styles from './InteractiveChart.module.css';

type ChartType = 'bar' | 'line' | 'area' | 'pie';

interface YKeyDef {
  key: string;
  label: string;
  color?: string;
}

interface ChartSpec {
  type: ChartType;
  title?: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: YKeyDef[];
  height?: number;
}

const FALLBACK_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#a4de6c'];

export function InteractiveChart({ raw }: { raw: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  
  const spec = useMemo<ChartSpec | null>(() => {
    try {
      return JSON.parse(raw) as ChartSpec;
    } catch {
      return null;
    }
  }, [raw]);

  if (!spec) {
    return (
      <div className={styles.errorCard}>
        <AlertCircle size={20} />
        <div>
          <strong>Invalid Chart Data</strong>
          <p>Could not parse the chart JSON. Check the format.</p>
        </div>
      </div>
    );
  }

  const { type, title, data, xKey, yKeys, height } = spec;
  const chartHeight = Math.min(Math.max(height || 260, 200), 350);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      color: 'var(--text)',
      fontSize: 13,
      fontFamily: 'var(--font-mono), monospace',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      padding: '12px 16px',
    },
    itemStyle: {
      color: 'var(--text)',
      fontWeight: 500,
    },
    cursor: { fill: 'var(--bg-hover)' }
  };

  const axisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fill: '#888888', fontSize: 12, fontFamily: 'var(--font-mono), monospace' },
    tickMargin: 8,
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: '16px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }} />
            {yKeys.map((yk, i) => (
              <Bar
                key={yk.key}
                dataKey={yk.key}
                name={yk.label}
                fill={yk.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: '16px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }} />
            {yKeys.map((yk, i) => (
              <Line
                key={yk.key}
                type="monotone"
                dataKey={yk.key}
                name={yk.label}
                stroke={yk.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: '16px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }} />
            {yKeys.map((yk, i) => {
              const color = yk.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
              return (
                <Area
                  key={yk.key}
                  type="monotone"
                  dataKey={yk.key}
                  name={yk.label}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.15}
                />
              );
            })}
          </AreaChart>
        );

      case 'pie': {
        const pieKey = yKeys[0]?.key ?? 'value';
        return (
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <Pie data={data} dataKey={pieKey} nameKey={xKey} cx="50%" cy="50%" outerRadius="75%" label={{ fontFamily: 'var(--font-mono), monospace', fontSize: '12px', fill: 'var(--text)' }}>
              {data.map((_, i) => (
                <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} stroke="var(--bg-card)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: '16px', fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }} />
          </PieChart>
        );
      }

      default:
        return <div className={styles.unsupported}>Chart type &quot;{type}&quot; is not yet supported.</div>;
    }
  };

  const handleCopyData = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: 'var(--bg-card)' });
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to download image', e);
    }
  };

  const handleCopyImage = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: 'var(--bg-card)' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (e) {
      console.error('Failed to copy image', e);
    }
  };

  const handleFullscreen = () => {
    if (chartRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartRef.current.requestFullscreen();
      }
    }
  };

  return (
    <motion.div
      ref={chartRef}
      className={styles.chartContainer}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.chartHeader}>
        <h4 className={styles.chartTitle}>{title ?? 'Data Visualization'}</h4>
        <div className={styles.chartActions}>
          <button title="Copy JSON Data" onClick={handleCopyData}><Copy size={14} /></button>
          <button title="Copy as Image" onClick={handleCopyImage}><ImageIcon size={14} /></button>
          <button title="Download as Image" onClick={handleDownloadImage}><Download size={14} /></button>
          <button title="Fullscreen" onClick={handleFullscreen}><Maximize2 size={14} /></button>
        </div>
      </div>
      <div className={styles.chartBody} style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
