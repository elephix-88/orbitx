import React from 'react';
import { Sparkles } from 'lucide-react';
import { Chip } from '@/components/shared/Chip';
import { Button } from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import type { AiInsight } from '@/pages/home/mockAiInsights';

export interface AIInsightCardProps {
 insight: AiInsight | null;
 loading?: boolean;
 onPrimary?: () => void;
 onDismiss?: () => void;
 className?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
 insight,
 loading,
 onPrimary,
 onDismiss,
 className,
}) => (
 <div
 className={cn(
 'relative rounded-xl border border-blue-border bg-violet-bg p-4 overflow-hidden',
 className
 )}
 >
 <div className="flex items-center gap-2 mb-2">
 <Chip variant="violet" className="gap-1">
 <Sparkles size={12} aria-hidden="true" />
 AI Insight
 </Chip>
 <span className="text-[11px] text-text-3 font-mono">just now</span>
 </div>

 {loading ? (
 <div className="space-y-2">
 <div className="h-4 w-2/3 bg-bg-muted rounded animate-pulse" />
 <div className="h-3 w-full bg-bg-muted rounded animate-pulse" />
 <div className="h-3 w-5/6 bg-bg-muted rounded animate-pulse" />
 </div>
 ) : insight ? (
 <>
 <h3 className="text-[15px] font-semibold text-text-1 leading-snug">
 {insight.headline}
 </h3>
 <p className="mt-1.5 text-[13px] text-text-2 leading-relaxed">{insight.body}</p>
 <div className="mt-3 flex items-center gap-2">
 <Button variant="primary" size="sm" onClick={onPrimary}>
 {insight.primaryActionLabel}
 </Button>
 <Button variant="ghost" size="sm" onClick={onDismiss}>
 {insight.dismissLabel}
 </Button>
 </div>
 </>
 ) : (
 <p className="text-[13px] text-text-3">
 No insights yet — once a few runs land we'll start surfacing anomalies and trends
 here.
 </p>
 )}
 </div>
);

AIInsightCard.displayName = 'AIInsightCard';

export default AIInsightCard;
