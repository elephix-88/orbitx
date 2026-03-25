import React, { useState, useEffect, useMemo, useRef } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Select } from '@/components/shared/form/Select';
import { Switch } from '@/components/shared/form/Switch';
import { Layers, ArrowRight } from 'lucide-react';
import type { UnifyPlatform } from '@/workflow/node-specs/transform.unify';

type FieldMapping = {
  source: string;
  unified: string;
};

const PLATFORM_OPTIONS = [
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'tiktok_ads', label: 'TikTok Ads' },
  { value: 'ga4', label: 'Google Analytics 4' },
  { value: 'line_ads', label: 'LINE Ads' },
];

const FIELD_MAPPINGS: Record<UnifyPlatform, FieldMapping[]> = {
  facebook_ads: [
    { source: 'date_start', unified: 'date' },
    { source: 'campaign_name', unified: 'campaign_name' },
    { source: 'adset_name', unified: 'ad_group_name' },
    { source: 'ad_name', unified: 'ad_name' },
    { source: 'campaign_id', unified: 'campaign_id' },
    { source: 'adset_id', unified: 'ad_group_id' },
    { source: 'ad_id', unified: 'ad_id' },
    { source: 'impressions', unified: 'impressions' },
    { source: 'inline_link_clicks', unified: 'clicks' },
    { source: 'spend', unified: 'spend' },
    { source: 'actions[purchase]', unified: 'conversions' },
    { source: 'action_values[purchase]', unified: 'conversion_value' },
    { source: 'reach', unified: 'reach' },
  ],
  google_ads: [
    { source: 'segments.date', unified: 'date' },
    { source: 'campaign.name', unified: 'campaign_name' },
    { source: 'ad_group.name', unified: 'ad_group_name' },
    { source: 'ad_group_ad.ad.name', unified: 'ad_name' },
    { source: 'campaign.id', unified: 'campaign_id' },
    { source: 'ad_group.id', unified: 'ad_group_id' },
    { source: 'ad_group_ad.ad.id', unified: 'ad_id' },
    { source: 'metrics.impressions', unified: 'impressions' },
    { source: 'metrics.clicks', unified: 'clicks' },
    { source: 'metrics.cost_micros', unified: 'spend' },
    { source: 'metrics.conversions', unified: 'conversions' },
    { source: 'metrics.conversions_value', unified: 'conversion_value' },
    { source: 'metrics.reach', unified: 'reach' },
  ],
  tiktok_ads: [
    { source: 'stat_time_day', unified: 'date' },
    { source: 'campaign_name', unified: 'campaign_name' },
    { source: 'adgroup_name', unified: 'ad_group_name' },
    { source: 'ad_name', unified: 'ad_name' },
    { source: 'campaign_id', unified: 'campaign_id' },
    { source: 'adgroup_id', unified: 'ad_group_id' },
    { source: 'ad_id', unified: 'ad_id' },
    { source: 'impressions', unified: 'impressions' },
    { source: 'clicks', unified: 'clicks' },
    { source: 'spend', unified: 'spend' },
    { source: 'conversions', unified: 'conversions' },
    { source: 'total_complete_payment_rate', unified: 'conversion_value' },
    { source: 'reach', unified: 'reach' },
  ],
  ga4: [
    { source: 'date', unified: 'date' },
    { source: 'sessionCampaignName', unified: 'campaign_name' },
    { source: 'sessionSource', unified: 'campaign_id' },
    { source: 'sessionMedium', unified: 'ad_group_name' },
    { source: 'sessions', unified: 'clicks' },
    { source: 'activeUsers', unified: 'reach' },
    { source: 'screenPageViews', unified: 'impressions' },
    { source: 'conversions', unified: 'conversions' },
    { source: 'purchaseRevenue', unified: 'conversion_value' },
  ],
  line_ads: [
    { source: 'campaign_id', unified: 'campaign_id' },
    { source: 'campaign_name', unified: 'campaign_name' },
    { source: 'adgroup_id', unified: 'ad_group_id' },
    { source: 'adgroup_name', unified: 'ad_group_name' },
    { source: 'ad_id', unified: 'ad_id' },
    { source: 'ad_name', unified: 'ad_name' },
    { source: 'impressions', unified: 'impressions' },
    { source: 'clicks', unified: 'clicks' },
    { source: 'cost', unified: 'spend' },
    { source: 'conversions', unified: 'conversions' },
    { source: 'conversion_value', unified: 'conversion_value' },
    { source: 'reach', unified: 'reach' },
  ],
};

const CALCULATED_METRICS: FieldMapping[] = [
  { source: '(calculated)', unified: 'cpm' },
  { source: '(calculated)', unified: 'cpc' },
  { source: '(calculated)', unified: 'ctr' },
  { source: '(calculated)', unified: 'roas' },
  { source: '(calculated)', unified: 'cpa' },
];

type UnifyEditorProps = {
  nodeId?: string;
  onClose: () => void;
  setSelectedNode?: (node: null) => void;
  data?: { platform?: string; include_calculated_metrics?: boolean };
  onChange?: (data: { platform: string; include_calculated_metrics: boolean }) => void;
  onDeleteNode?: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  compact?: boolean;
};

const UnifyEditor: React.FC<UnifyEditorProps> = ({
  onClose,
  setSelectedNode,
  data,
  onChange,
  onDeleteNode,
  onValidate,
  compact = false,
}) => {
  const [platform, setPlatform] = useState<string>(data?.platform || '');
  const [includeCalculatedMetrics, setIncludeCalculatedMetrics] = useState<boolean>(
    data?.include_calculated_metrics ?? true
  );
  const [touched, setTouched] = useState(false);

  const initialDataJson = useRef<string>(
    JSON.stringify({
      platform: data?.platform || '',
      include_calculated_metrics: data?.include_calculated_metrics ?? true,
    })
  );

  const isValid = platform !== '';

  const currentData = useMemo(
    () => ({ platform, include_calculated_metrics: includeCalculatedMetrics }),
    [platform, includeCalculatedMetrics]
  );

  const isDirty = useMemo(
    () => JSON.stringify(currentData) !== initialDataJson.current,
    [currentData]
  );

  const fieldMappings = useMemo(() => {
    if (!platform) return [];
    const baseMappings = FIELD_MAPPINGS[platform as UnifyPlatform] || [];
    if (includeCalculatedMetrics) {
      return [...baseMappings, ...CALCULATED_METRICS];
    }
    return baseMappings;
  }, [platform, includeCalculatedMetrics]);

  // Store callbacks in refs to avoid dependency issues
  const onValidateRef = useRef(onValidate);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onValidateRef.current = onValidate;
    onChangeRef.current = onChange;
  });

  // Notify parent of validation changes
  useEffect(() => {
    if (onValidateRef.current) {
      const errors: string[] = [];
      if (!platform) errors.push('Platform must be selected');
      onValidateRef.current(isValid, errors);
    }
  }, [isValid, platform]);

  // Track previous value to prevent infinite loops in compact mode
  const currentDataJson = useMemo(() => JSON.stringify(currentData), [currentData]);
  const prevDataRef = useRef<string>(currentDataJson);

  // In compact mode, propagate changes to parent
  useEffect(() => {
    if (!compact) return;
    if (currentDataJson === prevDataRef.current) return;
    prevDataRef.current = currentDataJson;

    if (onChangeRef.current && isValid) {
      onChangeRef.current(currentData as { platform: string; include_calculated_metrics: boolean });
    }
  }, [compact, currentDataJson, currentData, isValid]);

  const handlePlatformChange = (value: string | number) => {
    setPlatform(String(value));
    setTouched(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isValid || !isDirty) return;

    if (onChange) {
      onChange({ platform, include_calculated_metrics: includeCalculatedMetrics });
    }

    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  const handleClose = () => {
    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  const formContent = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">
        Normalize ad platform data into a unified marketing schema. Select the source platform to see how fields will be mapped.
      </p>

      {/* Platform selector */}
      <div>
        <Select
          label="Source Platform"
          options={PLATFORM_OPTIONS}
          value={platform}
          onChange={handlePlatformChange}
          placeholder="Select a platform"
          error={touched && !platform ? 'Platform must be selected' : undefined}
        />
      </div>

      {/* Calculated metrics toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-primary px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Include calculated metrics</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            CPM, CPC, CTR, ROAS, CPA — computed from base metrics
          </p>
        </div>
        <Switch
          checked={includeCalculatedMetrics}
          onChange={setIncludeCalculatedMetrics}
          size="md"
        />
      </div>

      {/* Field mapping preview */}
      {platform && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-surface-secondary border-b border-border">
            <p className="text-sm font-medium text-text-secondary">Field Mapping Preview</p>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_32px_1fr] gap-2 px-4 py-2 bg-surface-secondary/50 border-b border-border">
            <span className="text-xs font-medium text-text-tertiary">Source Field</span>
            <span />
            <span className="text-xs font-medium text-text-tertiary">Unified Field</span>
          </div>

          {/* Mapping rows */}
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {fieldMappings.map((mapping) => {
              const isCalculated = mapping.source === '(calculated)';
              return (
                <div
                  key={`${mapping.source}-${mapping.unified}`}
                  className="grid grid-cols-[1fr_32px_1fr] gap-2 px-4 py-2.5 items-center hover:bg-surface-secondary/50 transition-colors"
                >
                  <code
                    className={`text-sm font-mono px-2 py-1 rounded truncate ${
                      isCalculated
                        ? 'text-text-tertiary bg-surface-secondary italic'
                        : 'text-text-primary bg-surface-secondary'
                    }`}
                  >
                    {mapping.source}
                  </code>
                  <div className="flex justify-center">
                    <ArrowRight size={14} className="text-text-tertiary" />
                  </div>
                  <code className="text-sm font-mono px-2 py-1 rounded text-primary-400 bg-primary-400/10 truncate">
                    {mapping.unified}
                  </code>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="px-4 py-2.5 bg-surface-secondary border-t border-border">
            <p className="text-xs text-text-tertiary">
              {fieldMappings.length} fields will be mapped to the unified schema
            </p>
          </div>
        </div>
      )}

      {/* Empty state when no platform selected */}
      {!platform && (
        <div className="text-center py-8 border border-border border-dashed rounded-lg">
          <Layers size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-sm text-text-tertiary">
            Select a platform above to preview the field mapping.
          </p>
        </div>
      )}
    </div>
  );

  if (compact) {
    return <div className="space-y-4">{formContent}</div>;
  }

  return (
    <BaseEditorWrapper
      title="Unify Schema"
      icon={<Layers size={28} className="text-purple-500" />}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isValid={isValid && isDirty}
      initialValues={{
        platform: data?.platform || '',
        include_calculated_metrics: data?.include_calculated_metrics ?? true,
      }}
      currentValues={currentData}
      onDeleteNode={onDeleteNode}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default UnifyEditor;
