import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Activity, Moon, Heart, Smile } from 'lucide-react';
import { formatDate } from '../health.js';

export default function RechartsAnalytics({ entries }) {
  const [viewMode, setViewMode] = useState('cardio'); // 'cardio' | 'sleep' | 'wellbeing'

  // Sort ascending for chronological graph display
  const chronEntries = [...entries]
    .filter((e) => e.time)
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .slice(-30); // Last 30 readings

  const chartData = chronEntries.map((e, index) => ({
    index: index + 1,
    time: e.time,
    dateLabel: new Date(e.time).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    fullDate: formatDate(e.time),
    context: e.context || 'Resting',
    heartRate: e.heartRate,
    systolic: e.systolic,
    diastolic: e.diastolic,
    temperature: e.temperature,
    sleep: e.sleep,
    quality: e.quality,
    mood: e.mood,
    stress: e.stress,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2.5 bg-[#101822] border border-[#2a475e] rounded-[3px] shadow-lg text-xs font-mono space-y-1">
          <div className="text-[#66c0f4] font-bold">{data.fullDate}</div>
          <div className="text-[#8f98a0] text-[11px]">Context: {data.context}</div>
          <div className="pt-1 space-y-0.5 border-t border-[#2a475e]">
            {payload.map((item) => (
              <div key={item.dataKey} className="flex justify-between gap-3">
                <span style={{ color: item.color }}>{item.name}:</span>
                <span className="text-white font-bold">{item.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-wider text-[#66c0f4] font-bold uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#66c0f4]" />
            MULTI-METRIC LONGITUDINAL COMPARISON
          </span>
          <h3 className="text-lg font-bold text-white mt-1 m-0">Interactive Telemetry Correlation</h3>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-[#101822] p-1 rounded-[3px] border border-[#2a475e]">
          <button
            type="button"
            onClick={() => setViewMode('cardio')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] text-xs font-semibold transition ${
              viewMode === 'cardio'
                ? '!bg-[#212c3d] !text-[#66c0f4] !border !border-[#1a9fff]'
                : '!bg-transparent !text-[#8f98a0] hover:!text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Cardiovascular
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sleep')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] text-xs font-semibold transition ${
              viewMode === 'sleep'
                ? '!bg-[#212c3d] !text-[#66c0f4] !border !border-[#1a9fff]'
                : '!bg-transparent !text-[#8f98a0] hover:!text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Sleep &amp; Recovery
          </button>
          <button
            type="button"
            onClick={() => setViewMode('wellbeing')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] text-xs font-semibold transition ${
              viewMode === 'wellbeing'
                ? '!bg-[#212c3d] !text-[#66c0f4] !border !border-[#1a9fff]'
                : '!bg-transparent !text-[#8f98a0] hover:!text-white'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            Mood vs Stress
          </button>
        </div>
      </div>

      {chartData.length < 2 ? (
        <div className="p-8 text-center bg-[#16202d] rounded-[3px] border border-[#2a475e] text-sm text-[#8f98a0]">
          At least two recorded check-in entries are required to generate multi-metric correlations.
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'cardio' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" />
                <XAxis dataKey="dateLabel" stroke="#8f98a0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8f98a0" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate (BPM)"
                  stroke="#66c0f4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#66c0f4' }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic BP (mmHg)"
                  stroke="#e58e26"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#e58e26' }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic BP (mmHg)"
                  stroke="#1a9fff"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#1a9fff' }}
                />
              </LineChart>
            ) : viewMode === 'sleep' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#66c0f4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#66c0f4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" />
                <XAxis dataKey="dateLabel" stroke="#8f98a0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8f98a0" tick={{ fontSize: 11 }} domain={[0, 12]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area
                  type="monotone"
                  dataKey="sleep"
                  name="Sleep Duration (hrs)"
                  stroke="#66c0f4"
                  fillOpacity={1}
                  fill="url(#sleepGrad)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="quality"
                  name="Quality Rating (1–5)"
                  stroke="#a4d007"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a4d007' }}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" />
                <XAxis dataKey="dateLabel" stroke="#8f98a0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8f98a0" tick={{ fontSize: 11 }} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line
                  type="monotone"
                  dataKey="mood"
                  name="Mood (Higher is Better)"
                  stroke="#a4d007"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a4d007' }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress (Higher is Worse)"
                  stroke="#e58e26"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#e58e26' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
