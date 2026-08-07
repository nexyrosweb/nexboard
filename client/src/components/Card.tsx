import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, action, children, className = '' }: CardProps) {
  return (
    <section className={`card ${className}`.trim()}>
      <header className="card-header">
        <div>
          <h2 className="card-title">{title}</h2>
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}
