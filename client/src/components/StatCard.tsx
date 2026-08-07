import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  meta?: string;
  icon: ReactNode;
  accentWidth?: string;
  delay?: number;
}

export function StatCard({
  label,
  value,
  meta,
  icon,
  accentWidth = '42%',
  delay = 0,
}: StatCardProps) {
  return (
    <article
      className="card stat-card"
      style={{ ['--accent-width' as string]: accentWidth, animationDelay: `${delay}ms` }}
    >
      <div className="stat-label">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value mono">{value}</div>
      {meta ? <div className="stat-meta">{meta}</div> : null}
    </article>
  );
}
