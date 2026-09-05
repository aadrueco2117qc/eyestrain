'use client';

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: React.ReactNode;
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  change,
  icon,
  description,
  className = '',
}: MetricCardProps) {
  return (
    <div className={`rounded-xl border border-[#f97316]/10 bg-[#f97316]/[0.03] p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {icon && (
          <div className="p-2 bg-[#f97316]/10 rounded-lg flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      {change && (
        <div className="flex items-center gap-1 mt-3">
          {change.type === 'increase' ? (
            <>
              <ArrowUp className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">{change.value}% increase</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-500">{change.value}% decrease</span>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-1">vs {change.period}</span>
        </div>
      )}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  children,
  footer,
  className = '',
}: ChartCardProps) {
  return (
    <div className={`rounded-xl border border-[#f97316]/10 bg-[#f97316]/[0.03] p-6 ${className}`}>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="w-full">{children}</div>
      {footer && (
        <div className="mt-5 pt-4 border-t border-[#f97316]/10">{footer}</div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  status?: 'healthy' | 'warning' | 'critical';
  subtext?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  status = 'healthy',
  subtext,
  className = '',
}: StatCardProps) {
  const statusStyles = {
    healthy:  'border-l-green-500  bg-green-500/5',
    warning:  'border-l-yellow-500 bg-yellow-500/5',
    critical: 'border-l-red-500    bg-red-500/5',
  };

  return (
    <div className={`rounded-xl border border-[#f97316]/10 border-l-4 p-4 ${statusStyles[status]} ${className}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1.5">{subtext}</p>}
    </div>
  );
}
