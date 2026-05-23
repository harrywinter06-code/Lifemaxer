import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BodyweightEntry } from '../db/types'

export function WeightChart({ entries }: { entries: BodyweightEntry[] }) {
  if (entries.length < 2) {
    return (
      <div className="panel-pad text-dim text-sm text-center">
        Log at least 2 weigh-ins to see the trend.
      </div>
    )
  }

  // sorted asc by date
  const data = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date.slice(5),  // MM-DD
      kg: e.kg,
    }))

  const min = Math.min(...data.map((d) => d.kg))
  const max = Math.max(...data.map((d) => d.kg))
  const pad = Math.max(0.5, (max - min) * 0.2)

  return (
    <div className="h-44 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#2a2a2e" strokeDasharray="2 4" />
          <XAxis
            dataKey="date"
            stroke="#8a8a8f"
            tick={{ fill: '#8a8a8f', fontSize: 10, fontFamily: 'Spline Sans Mono' }}
          />
          <YAxis
            stroke="#8a8a8f"
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fill: '#8a8a8f', fontSize: 10, fontFamily: 'Spline Sans Mono' }}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: '#141416',
              border: '1px solid #2a2a2e',
              fontFamily: 'Spline Sans Mono',
              fontSize: 12,
              color: '#f4f1ea',
            }}
            labelStyle={{ color: '#8a8a8f' }}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="#d4ff2e"
            strokeWidth={2}
            dot={{ fill: '#d4ff2e', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
