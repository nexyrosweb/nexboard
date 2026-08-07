import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../context/I18nContext';
import type { RevenuePoint } from '../types';
import { formatCurrency } from '../utils/format';

interface RevenueChartProps {
  data: RevenuePoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { t } = useI18n();
  const signal = getComputedStyle(document.documentElement)
    .getPropertyValue('--signal')
    .trim() || '#0891B2';
  const muted = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-muted')
    .trim() || '#64748b';
  const line = getComputedStyle(document.documentElement)
    .getPropertyValue('--line')
    .trim() || '#d5dee9';

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={signal} stopOpacity={0.35} />
              <stop offset="100%" stopColor={signal} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={line} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              boxShadow: 'var(--shadow)',
            }}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'paid' ? t('dash.paid') : t('dash.pending'),
            ]}
          />
          <Area
            type="monotone"
            dataKey="pending"
            stroke="#94a3b8"
            fill="transparent"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="paid"
            stroke={signal}
            fill="url(#paidFill)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
