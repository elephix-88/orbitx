import React, { useState, useEffect, useMemo } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { useWorkflowStore } from '@/store/workflowStore';
import { getUpstreamColumnNames } from '@/utils/upstreamColumns';
import { cn } from '@/lib/utils';
import { ShieldAlert, Info } from 'lucide-react';
import type { AnomalyDetectorParams } from '@/workflow/node-specs/transform.anomaly-detector';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AnomalyDetectorEditorProps = {
  nodeId?: string;
  onClose: () => void;
  data?: Partial<AnomalyDetectorParams>;
  onChange?: (data: AnomalyDetectorParams) => void;
  onDeleteNode?: () => void;
  onValidate?: (_valid: boolean, _errors: string[]) => void;
  compact?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnomalyDetectorEditor: React.FC<AnomalyDetectorEditorProps> = ({
  nodeId,
  onClose,
  data,
  onChange,
  onDeleteNode,
  onValidate,
  compact = false,
}) => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const connections = useWorkflowStore((state) => state.connections);

  const upstreamColumns = useMemo(() => {
    if (!nodeId) return [];
    return getUpstreamColumnNames(nodeId, nodes, connections);
  }, [nodeId, nodes, connections]);

  const [metrics, setMetrics] = useState<string[]>(data?.metrics ?? []);
  const [groupBy, setGroupBy] = useState<string>(data?.group_by ?? '');
  const [windowDays, setWindowDays] = useState<number>(data?.window_days ?? 7);
  const [thresholdPercent, setThresholdPercent] = useState<number>(data?.threshold_percent ?? 30);
  const [maxAlertsPerDay, setMaxAlertsPerDay] = useState<number>(data?.max_alerts_per_day ?? 10);

  useEffect(() => {
    onChange?.({
      metrics,
      group_by: groupBy,
      window_days: windowDays,
      threshold_percent: thresholdPercent,
      max_alerts_per_day: maxAlertsPerDay,
    });
  }, [metrics, groupBy, windowDays, thresholdPercent, maxAlertsPerDay, onChange]);

  useEffect(() => {
    const errors: string[] = [];
    if (metrics.length === 0) errors.push('Select at least one metric to monitor.');
    if (!groupBy) errors.push('Select a column to group by.');
    onValidate?.(errors.length === 0, errors);
  }, [metrics, groupBy, onValidate]);

  const toggleMetric = (column: string) => {
    setMetrics((prev) =>
      prev.includes(column) ? prev.filter((m) => m !== column) : [...prev, column]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange?.({
      metrics,
      group_by: groupBy,
      window_days: windowDays,
      threshold_percent: thresholdPercent,
      max_alerts_per_day: maxAlertsPerDay,
    });
  };

  // ---------------------------------------------------------------------------
  // Form body
  // ---------------------------------------------------------------------------
  const body = (
    <div className="flex flex-col gap-5 p-4">
      {/* Empty state */}
      {upstreamColumns.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-text-tertiary">
          <Info size={14} className="flex-shrink-0" />
          Connect an upstream node to see available columns.
        </div>
      )}

      {/* Metrics to monitor */}
      {upstreamColumns.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-text-secondary">Metrics to Monitor</label>
          <div className="flex flex-wrap gap-1.5">
            {upstreamColumns.map((column) => (
              <button
                key={column}
                type="button"
                onClick={() => toggleMetric(column)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg border transition-colors',
                  metrics.includes(column)
                    ? 'bg-red-500/15 border-red-500/30 text-red-400 font-medium'
                    : 'bg-neutral-800 border-neutral-700 text-text-tertiary hover:text-text-secondary'
                )}
              >
                {column}
              </button>
            ))}
          </div>
          {metrics.length === 0 && (
            <p className="text-[10px] text-text-tertiary">Select columns to monitor for anomalies.</p>
          )}
        </div>
      )}

      {/* Group by */}
      {upstreamColumns.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className={cn(
              'h-8 px-2.5 text-xs rounded-lg',
              'bg-neutral-900 border border-neutral-700',
              'text-text-primary focus:outline-none focus:border-primary-500',
              !groupBy && 'text-text-tertiary'
            )}
          >
            <option value="">Select column...</option>
            {upstreamColumns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Detection settings */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-text-secondary">Detection Settings</label>

        <div className="grid grid-cols-2 gap-3">
          {/* Window days */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-tertiary">Baseline Window (days)</label>
            <input
              type="number"
              min={3}
              max={30}
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className={cn(
                'h-8 px-2.5 text-xs rounded-lg',
                'bg-neutral-900 border border-neutral-700',
                'text-text-primary focus:outline-none focus:border-primary-500'
              )}
            />
          </div>

          {/* Threshold */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-tertiary">Threshold (%)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={thresholdPercent}
              onChange={(e) => setThresholdPercent(Number(e.target.value))}
              className={cn(
                'h-8 px-2.5 text-xs rounded-lg',
                'bg-neutral-900 border border-neutral-700',
                'text-text-primary focus:outline-none focus:border-primary-500'
              )}
            />
          </div>
        </div>

        {/* Max alerts per day */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-text-tertiary">Max Alerts per Day (per group)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxAlertsPerDay}
            onChange={(e) => setMaxAlertsPerDay(Number(e.target.value))}
            className={cn(
              'h-8 px-2.5 text-xs rounded-lg w-24',
              'bg-neutral-900 border border-neutral-700',
              'text-text-primary focus:outline-none focus:border-primary-500'
            )}
          />
        </div>
      </div>

      {/* Warm-up info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          No anomalies will be detected until <strong>{windowDays} days</strong> of data have been collected.
          The detector needs a baseline to compare against.
        </span>
      </div>

      {/* Output preview */}
      {metrics.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-text-tertiary">Output Columns Added</label>
          <div className="flex flex-wrap gap-1">
            {metrics.map((metric) => (
              <span
                key={metric}
                className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-800 border border-neutral-700 text-text-tertiary"
              >
                {metric}_is_anomaly
              </span>
            ))}
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
              has_anomaly
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <BaseEditorWrapper
      title="Anomaly Detector"
      icon={<ShieldAlert size={16} className="text-red-400" />}
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={metrics.length > 0 && groupBy.length > 0}
      onDeleteNode={onDeleteNode}
    >
      {body}
    </BaseEditorWrapper>
  );
};

export default AnomalyDetectorEditor;
