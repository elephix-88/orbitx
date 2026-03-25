import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Hash,
  Power,
  PowerOff,
  Sparkles,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Sheet } from '@/components/shared/Sheet';
import { Button } from '@/components/shared/Button';
import { Switch } from '@/components/shared/form/Switch';
import { Select } from '@/components/shared/form/Select';
import { ScheduleSelector } from '@/components/shared/form/ScheduleSelector';
import { cn } from '@/lib/utils';
import { deliveryService } from '@/services/deliveryService';
import { pulseService, PulseResponse } from '@/services/pulseService';
import {
  DeliveryConfig,
  DeliveryChannel,
  SlackDeliveryChannel,
  LineDeliveryChannel,
  SlackChannel,
} from '@/types/delivery';

interface ScheduleDeliverySheetProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string | null;
  scheduleExpression: string;
  scheduleEnabled: boolean;
  deliveryConfig: DeliveryConfig;
  onScheduleChange: (_cron: string) => void;
  onScheduleEnabledChange: (_enabled: boolean) => void;
  onDeliveryConfigChange: (_config: DeliveryConfig) => void;
  onSave: () => void;
  isSaving?: boolean;
}

type ActiveTab = 'schedule' | 'delivery';

// LINE brand colors kept as a semantic name via inline style only where Tailwind token doesn't exist
const LINE_GREEN = '#06C755';

export const ScheduleDeliverySheet: React.FC<ScheduleDeliverySheetProps> = ({
  isOpen,
  onClose,
  workflowId,
  scheduleExpression,
  scheduleEnabled,
  deliveryConfig,
  onScheduleChange,
  onScheduleEnabledChange,
  onDeliveryConfigChange,
  onSave,
  isSaving = false,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');

  // Pulse preview state
  const [pulsePreviewOpen, setPulsePreviewOpen] = useState(false);
  const [pulsePreviewData, setPulsePreviewData] = useState<PulseResponse | null>(null);
  const [pulsePreviewLoading, setPulsePreviewLoading] = useState(false);
  const [pulsePreviewError, setPulsePreviewError] = useState<string | null>(null);

  // Slack state
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [loadingSlackChannels, setLoadingSlackChannels] = useState(false);
  const [slackConnecting, setSlackConnecting] = useState(false);
  const [slackConnectionError, setSlackConnectionError] = useState<string | null>(null);

  const slackChannel = deliveryConfig.channels.find(
    (c): c is SlackDeliveryChannel => c.type === 'slack'
  );
  const lineChannel = deliveryConfig.channels.find(
    (c): c is LineDeliveryChannel => c.type === 'line'
  );

  // Fetch Slack channels when a connected slack channel exists
  useEffect(() => {
    if (!slackChannel || slackChannel.status !== 'connected') return;
    setLoadingSlackChannels(true);
    deliveryService
      .getSlackConnection()
      .then((conn) => {
        if (!conn) return [];
        return deliveryService.getSlackChannels(conn.id);
      })
      .then(setSlackChannels)
      .catch(() => setSlackChannels([]))
      .finally(() => setLoadingSlackChannels(false));
  }, [slackChannel?.status]);

  // Update a single channel in the config
  const updateChannel = useCallback(
    (updated: DeliveryChannel) => {
      const others = deliveryConfig.channels.filter((c) => c.type !== updated.type);
      onDeliveryConfigChange({ ...deliveryConfig, channels: [...others, updated] });
    },
    [deliveryConfig, onDeliveryConfigChange]
  );

  const removeChannel = useCallback(
    (type: 'slack' | 'line') => {
      onDeliveryConfigChange({
        ...deliveryConfig,
        channels: deliveryConfig.channels.filter((c) => c.type !== type),
      });
    },
    [deliveryConfig, onDeliveryConfigChange]
  );

  const addSlackChannel = () => {
    if (slackChannel) return;
    const newChannel: SlackDeliveryChannel = {
      type: 'slack',
      channelId: '',
      channelName: '',
      status: 'pending',
    };
    onDeliveryConfigChange({
      ...deliveryConfig,
      channels: [...deliveryConfig.channels, newChannel],
    });
  };

  const handleConnectSlack = async () => {
    setSlackConnecting(true);
    setSlackConnectionError(null);
    try {
      const oauthUrl = await deliveryService.getSlackOAuthUrl();
      const popup = window.open(oauthUrl, 'slack-oauth', 'width=600,height=700,scrollbars=yes');
      if (!popup) {
        setSlackConnectionError('Popup blocked. Allow popups and try again.');
        return;
      }
      // Poll until popup closes, then re-check via connections API
      const pollInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollInterval);
          deliveryService
            .getSlackConnection()
            .then((conn) => {
              if (conn) {
                updateChannel({
                  type: 'slack',
                  channelId: slackChannel?.channelId || '',
                  channelName: slackChannel?.channelName || '',
                  status: 'connected',
                  workspaceName: conn.connection_name,
                });
              }
            })
            .catch(() => {})
            .finally(() => setSlackConnecting(false));
        }
      }, 500);
    } catch (err) {
      setSlackConnectionError(err instanceof Error ? err.message : 'Connection failed');
      setSlackConnecting(false);
    }
  };

  // LINE backend is not implemented yet — no-op placeholder
  const handleConnectLine = () => { /* coming soon */ };

  const handlePreviewPulse = async () => {
    if (!workflowId) return;
    setPulsePreviewOpen(true);
    setPulsePreviewLoading(true);
    setPulsePreviewError(null);
    setPulsePreviewData(null);
    try {
      const result = await pulseService.previewPulse(workflowId);
      setPulsePreviewData(result);
    } catch (err) {
      setPulsePreviewError(err instanceof Error ? err.message : 'Failed to generate Pulse preview');
    } finally {
      setPulsePreviewLoading(false);
    }
  };

  const handleSlackChannelSelect = (channelId: string | number) => {
    const found = slackChannels.find((c) => c.id === String(channelId));
    if (!found || !slackChannel) return;
    updateChannel({ ...slackChannel, channelId: found.id, channelName: found.name });
  };

  const tabs: { id: ActiveTab; label: string; icon: typeof Calendar }[] = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'delivery', label: 'Delivery', icon: Bell },
  ];

  const deliveryCount = deliveryConfig.channels.filter(
    (c) => c.status === 'connected'
  ).length;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          Schedule &amp; Delivery
        </span>
      }
      description="Configure when this workflow runs and where results are delivered."
      footer={
        <div className="flex gap-3 w-full justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            isLoading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-neutral-900 rounded-lg mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
              activeTab === id
                ? 'bg-surface-secondary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'delivery' && deliveryCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-400 text-[10px] font-bold text-neutral-950">
                {deliveryCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-primary border border-border">
            <div className="flex items-center gap-3">
              {scheduleEnabled ? (
                <Power className="w-4 h-4 text-success" />
              ) : (
                <PowerOff className="w-4 h-4 text-text-tertiary" />
              )}
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Automatic Schedule
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {scheduleEnabled
                    ? 'Workflow runs automatically on the configured schedule'
                    : 'Workflow only runs when triggered manually'}
                </p>
              </div>
            </div>
            <Switch
              checked={scheduleEnabled}
              onChange={onScheduleEnabledChange}
              size="md"
            />
          </div>

          {/* Schedule Selector — shown even when disabled so users can set it up */}
          <div
            className={cn(
              'transition-opacity duration-200',
              !scheduleEnabled && 'opacity-50 pointer-events-none'
            )}
          >
            <ScheduleSelector
              value={scheduleExpression}
              onChange={onScheduleChange}
            />
          </div>
        </div>
      )}

      {/* Pulse Preview Modal */}
      {pulsePreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPulsePreviewOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-surface-primary border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-secondary">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-text-primary">Pulse AI Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setPulsePreviewOpen(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {pulsePreviewLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  <p className="text-sm text-text-secondary">Generating Pulse briefing...</p>
                </div>
              )}

              {pulsePreviewError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-error/10 border border-error/20">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-error">Preview failed</p>
                    <p className="text-xs text-text-secondary mt-0.5">{pulsePreviewError}</p>
                  </div>
                </div>
              )}

              {pulsePreviewData && (
                <PulsePreviewContent data={pulsePreviewData} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Tab */}
      {activeTab === 'delivery' && (
        <div className="space-y-5">
          {/* Channels list */}
          {deliveryConfig.channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-primary flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-text-tertiary" />
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">
                No delivery channels configured
              </p>
              <p className="text-xs text-text-secondary max-w-xs">
                Add a channel below to receive notifications and reports after each workflow run.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slackChannel && (
                <SlackChannelCard
                  channel={slackChannel}
                  channels={slackChannels}
                  loadingChannels={loadingSlackChannels}
                  connecting={slackConnecting}
                  connectionError={slackConnectionError}
                  workflowId={workflowId}
                  onConnect={handleConnectSlack}
                  onChannelSelect={handleSlackChannelSelect}
                  onRemove={() => removeChannel('slack')}
                />
              )}
              {lineChannel && (
                <LineChannelCard
                  channel={lineChannel}
                  workflowId={workflowId}
                  onConnect={handleConnectLine}
                  onRemove={() => removeChannel('line')}
                />
              )}
            </div>
          )}

          {/* Add channel buttons */}
          {(!slackChannel || !lineChannel) && (
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                Add Channel
              </p>
              <div className="grid grid-cols-2 gap-3">
                {!slackChannel && (
                  <AddChannelButton
                    label="Slack"
                    description="Post to a channel or DM"
                    onClick={addSlackChannel}
                    icon={
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#E01E5A]">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                      </svg>
                    }
                  />
                )}
                {!lineChannel && (
                  <AddChannelButton
                    label="LINE Notify"
                    description="Send to LINE group or user"
                    onClick={() => {}}
                    disabled
                    badge="Coming Soon"
                    icon={
                      <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-40" fill={LINE_GREEN}>
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* AI Summary toggle */}
          <div className="rounded-xl border border-border bg-surface-primary overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Include AI Summary
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Pulse generates an AI-written marketing briefing with top performers, anomalies, and recommendations.
                  </p>
                </div>
              </div>
              <Switch
                checked={deliveryConfig.includeAiSummary}
                onChange={(checked) =>
                  onDeliveryConfigChange({ ...deliveryConfig, includeAiSummary: checked })
                }
                size="sm"
              />
            </div>
            {deliveryConfig.includeAiSummary && (
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={handlePreviewPulse}
                  disabled={!workflowId}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                    workflowId
                      ? 'border-amber-400/30 bg-amber-400/5 text-amber-400 hover:bg-amber-400/10'
                      : 'border-border text-text-tertiary opacity-50 cursor-not-allowed'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Preview Pulse
                </button>
                {!workflowId && (
                  <p className="text-xs text-text-tertiary mt-1.5">
                    Save the workflow first to preview.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
};

// --- Sub-components ---

interface AddChannelButtonProps {
  label: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

const AddChannelButton: React.FC<AddChannelButtonProps> = ({
  label,
  description,
  onClick,
  icon,
  disabled = false,
  badge,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex items-center gap-3 p-4 rounded-xl border border-border bg-surface-primary text-left',
      disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'hover:border-neutral-600 hover:bg-surface-secondary transition-all duration-150 group'
    )}
  >
    <div className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-neutral-700 text-text-tertiary uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-text-secondary truncate">{description}</p>
    </div>
    {!disabled && (
      <Plus className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors shrink-0" />
    )}
  </button>
);

interface SlackChannelCardProps {
  channel: SlackDeliveryChannel;
  channels: SlackChannel[];
  loadingChannels: boolean;
  connecting: boolean;
  connectionError: string | null;
  workflowId: string | null;
  onConnect: () => void;
  onChannelSelect: (_id: string | number) => void;
  onRemove: () => void;
}

const SlackChannelCard: React.FC<SlackChannelCardProps> = ({
  channel,
  channels,
  loadingChannels,
  connecting,
  connectionError,
  workflowId,
  onConnect,
  onChannelSelect,
  onRemove,
}) => {
  const isConnected = channel.status === 'connected';

  return (
    <div className="rounded-xl border border-border bg-surface-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E01E5A]">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Slack</span>
          {isConnected && channel.workspaceName && (
            <span className="text-xs text-text-secondary">
              — {channel.workspaceName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <AlertCircle className="w-3.5 h-3.5" />
              Not connected
            </span>
          )}
          <button
            onClick={onRemove}
            className="p-1 rounded text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
            title="Remove channel"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            {connectionError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-xs text-error">{connectionError}</p>
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              width="full"
              onClick={onConnect}
              isLoading={connecting}
              disabled={connecting || !workflowId}
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              {connecting ? 'Opening Slack...' : 'Connect to Slack'}
            </Button>
            {!workflowId && (
              <p className="text-xs text-text-tertiary text-center">
                Save the workflow first to connect Slack.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Channel selector */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Post to channel
              </label>
              {loadingChannels ? (
                <div className="flex items-center gap-2 py-2 text-text-tertiary text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading channels...
                </div>
              ) : (
                <Select
                  options={channels.map((c) => ({
                    value: c.id,
                    label: `#${c.name}`,
                  }))}
                  value={channel.channelId}
                  onChange={onChannelSelect}
                  placeholder="Select a channel..."
                />
              )}
            </div>

            {/* Preview */}
            {channel.channelId && (
              <SlackMessagePreview channelName={channel.channelName} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SlackMessagePreview: React.FC<{ channelName: string }> = ({ channelName }) => (
  <div className="rounded-lg border border-border bg-neutral-900 p-3 space-y-2">
    <div className="flex items-center gap-1.5">
      <MessageSquare className="w-3.5 h-3.5 text-text-tertiary" />
      <span className="text-xs font-medium text-text-secondary">Message preview</span>
    </div>
    <div className="flex items-start gap-2.5 pt-1">
      <div className="w-7 h-7 rounded bg-primary-400 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-neutral-950">O</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-text-primary">OrbitX</span>
          <span className="text-[10px] text-text-tertiary">Today at 09:00 AM</span>
        </div>
        <div className="rounded border-l-4 border-primary-400 bg-surface-secondary pl-3 pr-4 py-2 space-y-1">
          <p className="text-xs font-semibold text-text-primary">
            Workflow Run Completed
          </p>
          <p className="text-xs text-text-secondary">
            Your workflow finished successfully. 3 nodes processed.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="flex items-center gap-1 text-[11px] text-success">
              <CheckCircle2 className="w-3 h-3" />
              Success
            </span>
            <span className="text-[11px] text-text-tertiary">|</span>
            <span className="flex items-center gap-1 text-[11px] text-text-secondary">
              <Hash className="w-3 h-3" />
              {channelName}
            </span>
            <span className="text-[11px] text-text-tertiary">|</span>
            <span className="text-[11px] text-text-secondary">12.4K records</span>
          </div>
        </div>
      </div>
    </div>
    <p className="text-[10px] text-text-tertiary">
      This is a preview. Actual message may vary.
    </p>
  </div>
);

// --- Pulse Preview Content ---

const PulsePreviewContent: React.FC<{ data: PulseResponse }> = ({ data }) => (
  <div className="space-y-4">
    {/* Verdict */}
    <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Verdict
        </span>
      </div>
      <p className="text-sm text-text-primary leading-relaxed">{data.verdict}</p>
    </div>

    {/* Metrics table */}
    {data.metrics_table.length > 0 && (
      <div>
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
          Key Metrics
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          {data.metrics_table.map((row, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between px-4 py-2.5 text-sm',
                index < data.metrics_table.length - 1 && 'border-b border-border'
              )}
            >
              <span className="text-text-secondary">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{row.value}</span>
                {row.change_percent !== undefined && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      row.trend === 'up' && 'text-success',
                      row.trend === 'down' && 'text-error',
                      row.trend === 'flat' && 'text-text-tertiary'
                    )}
                  >
                    {row.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {row.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                    {row.trend === 'flat' && <Minus className="w-3 h-3" />}
                    {Math.abs(row.change_percent).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Winners and Losers */}
    {(data.winners.length > 0 || data.losers.length > 0) && (
      <div className="grid grid-cols-2 gap-3">
        {data.winners.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2">
              Top Performers
            </p>
            <div className="space-y-1.5">
              {data.winners.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-success/5 border border-success/15 text-xs"
                >
                  <span className="text-text-secondary truncate mr-2">{item.name}</span>
                  <span className="text-success font-medium shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.losers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-error uppercase tracking-wider mb-2">
              Underperformers
            </p>
            <div className="space-y-1.5">
              {data.losers.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-error/5 border border-error/15 text-xs"
                >
                  <span className="text-text-secondary truncate mr-2">{item.name}</span>
                  <span className="text-error font-medium shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}

    {/* Anomalies */}
    {data.anomalies.length > 0 && (
      <div>
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
          Anomalies
        </p>
        <div className="space-y-2">
          {data.anomalies.map((anomaly, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs',
                anomaly.severity === 'high' && 'bg-error/5 border-error/20',
                anomaly.severity === 'medium' && 'bg-warning/5 border-warning/20',
                anomaly.severity === 'low' && 'bg-surface-secondary border-border'
              )}
            >
              <AlertCircle
                className={cn(
                  'w-3.5 h-3.5 shrink-0 mt-0.5',
                  anomaly.severity === 'high' && 'text-error',
                  anomaly.severity === 'medium' && 'text-warning',
                  anomaly.severity === 'low' && 'text-text-tertiary'
                )}
              />
              <span className="text-text-secondary">{anomaly.description}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Recommendations */}
    {data.recommendations.length > 0 && (
      <div>
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
          Recommendations
        </p>
        <div className="space-y-2">
          {data.recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-text-secondary">{rec.text}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <p className="text-[10px] text-text-tertiary text-center pt-1">
      This is a preview based on your most recent workflow run. Results will vary.
    </p>
  </div>
);

interface LineChannelCardProps {
  channel: LineDeliveryChannel;
  workflowId: string | null; // reserved for future LINE backend implementation
  onConnect: () => void;
  onRemove: () => void;
}

const LineChannelCard: React.FC<LineChannelCardProps> = ({
  channel,
  workflowId: _workflowId,
  onConnect,
  onRemove,
}) => {
  const isConnected = channel.status === 'connected';

  return (
    <div className="rounded-xl border border-border bg-surface-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill={LINE_GREEN}>
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">LINE Notify</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <AlertCircle className="w-3.5 h-3.5" />
              Not connected
            </span>
          )}
          <button
            onClick={onRemove}
            className="p-1 rounded text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
            title="Remove channel"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {!isConnected ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-800 border border-border">
              <AlertCircle className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">
                LINE Notify integration is coming soon. Stay tuned for updates.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              width="full"
              onClick={onConnect}
              disabled
            >
              Coming Soon
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-success">LINE Notify connected</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Run notifications will be sent to your LINE group or user.
              </p>
            </div>
            <button
              onClick={onRemove}
              className="ml-auto shrink-0 flex items-center gap-1 text-xs text-text-tertiary hover:text-error transition-colors"
            >
              Disconnect
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
