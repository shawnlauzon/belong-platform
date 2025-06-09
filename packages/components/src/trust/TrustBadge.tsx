import React from 'react';
import { cn } from '~/utils';
import { Shield, ShieldCheck } from 'lucide-react';

interface TrustBadgeProps {
  score: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function TrustBadge({
  score,
  size = 'md',
  showLabel = false,
  className,
}: TrustBadgeProps) {
  const getBadgeLabel = (score: number) => {
    if (score < 4) return 'New';
    if (score < 6) return 'Building';
    if (score < 8) return 'Established';
    return 'Exemplary';
  };

  const getBadgeColor = (score: number) => {
    if (score < 4) return 'bg-gray-200 text-gray-700';
    if (score < 6) return 'bg-blue-100 text-blue-700';
    if (score < 8) return 'bg-trust-300 text-trust-800';
    return 'bg-trust-500 text-white';
  };

  const getBadgeIcon = (score: number) => {
    if (score < 4) return <Shield className="w-full h-full" />;
    if (score < 8) return <ShieldCheck className="w-full h-full" />;
    return <ShieldCheck className="w-full h-full" />;
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'xs':
        return 'h-4 w-4 text-xs';
      case 'sm':
        return 'h-5 w-5 text-sm';
      case 'md':
        return 'h-6 w-6 text-base';
      case 'lg':
        return 'h-8 w-8 text-lg';
      default:
        return 'h-6 w-6 text-base';
    }
  };

  const badgeClasses = cn(
    'rounded-full flex items-center justify-center',
    getBadgeColor(score),
    getSizeClasses(size),
    className
  );

  return (
    <div className="flex items-center gap-1">
      <div className={badgeClasses}>{getBadgeIcon(score)}</div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs font-semibold">{getBadgeLabel(score)}</span>
          <span className="text-xs text-warmgray-500">{score.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
