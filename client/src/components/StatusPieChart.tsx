import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusSlice } from '../types';
import { formatCurrency } from '../utils/format';

const COLORS = ['#0891b2', '#22d3ee', '#059669', '#d97706', '#dc2626', '#64748b'];

interface StatusPieChartProps {
  data: StatusSlice[];
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 10,
            }}
            formatter={(value: number, _name, item) => [
              formatCurrency(value),
              (item?.payload as StatusSlice)?.label ?? '',
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul
        style={{
          listStyle: 'none',
          margin: '0.25rem 0 0',
          padding: 0,
          display: 'grid',
          gap: '0.4rem',
        }}
      >
        {data.map((slice, index) => (
          <li
            key={slice.status}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: COLORS[index % COLORS.length],
                }}
              />
              {slice.label}
            </span>
            <span className="mono" style={{ color: 'var(--text-muted)' }}>
              {slice.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
