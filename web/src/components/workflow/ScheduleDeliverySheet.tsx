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
 ChevronRight,
 ShieldAlert,
 ChevronDown,
 Check,
} from 'lucide-react';
import { workflowApiService } from '@/services/workflowApiService';
import { Sheet } from '@/components/shared/Sheet';
import { Button } from '@/components/shared/Button';
import { Switch } from '@/components/shared/form/Switch';
import { Select } from '@/components/shared/form/Select';
import { ScheduleSelector } from '@/components/shared/form/ScheduleSelector';
import { cn } from '@/lib/utils';
import { deliveryService } from '@/services/deliveryService';
import {
 DeliveryConfig,
 DeliveryChannel,
 SlackDeliveryChannel,
 LineDeliveryChannel,
 SlackChannel,
} from '@/types/delivery';

interface WorkflowSummary {
 id: string;
 name: string;
}

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
 /** The workflow to trigger when this workflow fails. null = no error workflow set. */
 errorWorkflowId: string | null;
 onErrorWorkflowChange: (_workflowId: string | null) => void;
}

type ActiveTab = 'schedule' | 'delivery' | 'failure';

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
 errorWorkflowId,
 onErrorWorkflowChange,
}) => {
 const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');

 // Error workflow selector state
 const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
 const [workflowsLoading, setWorkflowsLoading] = useState(false);
 const [workflowDropdownOpen, setWorkflowDropdownOpen] = useState(false);

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

 // Fetch all workflows when the failure tab is opened
 useEffect(() => {
 if (activeTab !== 'failure') return;
 setWorkflowsLoading(true);
 workflowApiService
 .getWorkflows({ limit: 200 })
 .then((response) => {
 const items: WorkflowSummary[] = (response.data ?? [])
 .filter((w) => {
 // Exclude the current workflow from the selector — a workflow cannot be its own error handler.
 const wId = typeof w._id === 'object' && w._id !== null && '$oid' in w._id
 ? w._id.$oid
 : String(w._id ?? '');
 return wId !== workflowId && String(w.job_id ?? '') !== workflowId;
 })
 .map((w) => ({
 id: typeof w._id === 'object' && w._id !== null && '$oid' in w._id
 ? w._id.$oid
 : String(w._id ?? w.job_id ?? ''),
 name: w.job_name || w.name || w.job_id || 'Unnamed workflow',
 }));
 setWorkflows(items);
 })
 .catch(() => setWorkflows([]))
 .finally(() => setWorkflowsLoading(false));
 }, [activeTab, workflowId]);

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

 const handleSlackChannelSelect = (channelId: string | number) => {
 const found = slackChannels.find((c) => c.id === String(channelId));
 if (!found || !slackChannel) return;
 updateChannel({ ...slackChannel, channelId: found.id, channelName: found.name });
 };

 const tabs: { id: ActiveTab; label: string; icon: typeof Calendar }[] = [
 { id: 'schedule', label: 'Schedule', icon: Calendar },
 { id: 'delivery', label: 'Delivery', icon: Bell },
 { id: 'failure', label: 'On Failure', icon: ShieldAlert },
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
 <Calendar className="w-4 h-4 text-blue-primary" />
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
 <div className="flex gap-1 p-1 bg-bg-page rounded-lg mb-6">
 {tabs.map(({ id, label, icon: Icon }) => (
 <button
 key={id}
 onClick={() => setActiveTab(id)}
 className={cn(
 'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
 activeTab === id
 ? 'bg-bg-card text-text-1 shadow-sm'
 : 'text-text-3 hover:text-text-2'
 )}
 >
 <Icon className="w-4 h-4" />
 {label}
 {id === 'delivery' && deliveryCount > 0 && (
 <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-primary text-[10px] font-bold text-white">
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
 <div className="flex items-center justify-between p-4 rounded-xl bg-bg-page border border-line-1">
 <div className="flex items-center gap-3">
 {scheduleEnabled ? (
 <Power className="w-4 h-4 text-success" />
 ) : (
 <PowerOff className="w-4 h-4 text-text-3" />
 )}
 <div>
 <p className="text-sm font-medium text-text-1">
 Automatic Schedule
 </p>
 <p className="text-xs text-text-2 mt-0.5">
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

 {/* Delivery Tab */}
 {activeTab === 'delivery' && (
 <div className="space-y-5">
 {/* Channels list */}
 {deliveryConfig.channels.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-10 text-center">
 <div className="w-12 h-12 rounded-full bg-bg-page flex items-center justify-center mb-3">
 <Bell className="w-6 h-6 text-text-3" />
 </div>
 <p className="text-sm font-medium text-text-1 mb-1">
 No delivery channels configured
 </p>
 <p className="text-xs text-text-2 max-w-xs">
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
 <p className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-3">
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

 </div>
 )}

 {/* On Failure Tab */}
 {activeTab === 'failure' && (
 <OnFailureTab
 errorWorkflowId={errorWorkflowId}
 onErrorWorkflowChange={onErrorWorkflowChange}
 workflows={workflows}
 workflowsLoading={workflowsLoading}
 workflowDropdownOpen={workflowDropdownOpen}
 onDropdownToggle={() => setWorkflowDropdownOpen((prev) => !prev)}
 onDropdownClose={() => setWorkflowDropdownOpen(false)}
 />
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
 'flex items-center gap-3 p-4 rounded-xl border border-line-1 bg-bg-page text-left',
 disabled
 ? 'opacity-50 cursor-not-allowed'
 : 'hover:border-line-1 hover:bg-bg-card transition-all duration-150 group'
 )}
 >
 <div className="w-9 h-9 rounded-lg bg-bg-page flex items-center justify-center shrink-0">
 {icon}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="text-sm font-medium text-text-1">{label}</p>
 {badge && (
 <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-bg-muted text-text-3 uppercase tracking-wider">
 {badge}
 </span>
 )}
 </div>
 <p className="text-xs text-text-2 truncate">{description}</p>
 </div>
 {!disabled && (
 <Plus className="w-4 h-4 text-text-3 group-hover:text-text-2 transition-colors shrink-0" />
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
 <div className="rounded-xl border border-line-1 bg-bg-page overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-line-1 bg-bg-card">
 <div className="flex items-center gap-2.5">
 <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E01E5A]">
 <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
 </svg>
 <span className="text-sm font-semibold text-text-1">Slack</span>
 {isConnected && channel.workspaceName && (
 <span className="text-xs text-text-2">
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
 <span className="flex items-center gap-1 text-xs text-text-3">
 <AlertCircle className="w-3.5 h-3.5" />
 Not connected
 </span>
 )}
 <button
 onClick={onRemove}
 className="p-1 rounded text-text-3 hover:text-error hover:bg-danger-bg transition-colors"
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
 <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg border border-danger-border/20">
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
 <p className="text-xs text-text-3 text-center">
 Save the workflow first to connect Slack.
 </p>
 )}
 </div>
 ) : (
 <div className="space-y-3">
 {/* Channel selector */}
 <div>
 <label className="block text-xs font-medium text-text-2 mb-2">
 Post to channel
 </label>
 {loadingChannels ? (
 <div className="flex items-center gap-2 py-2 text-text-3 text-sm">
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
 <div className="rounded-lg border border-line-1 bg-bg-page p-3 space-y-2">
 <div className="flex items-center gap-1.5">
 <MessageSquare className="w-3.5 h-3.5 text-text-3" />
 <span className="text-xs font-medium text-text-2">Message preview</span>
 </div>
 <div className="flex items-start gap-2.5 pt-1">
 <div className="w-7 h-7 rounded bg-blue-primary flex items-center justify-center shrink-0">
 <span className="text-xs font-bold text-white">O</span>
 </div>
 <div>
 <div className="flex items-baseline gap-2 mb-1">
 <span className="text-xs font-semibold text-text-1">OrbitX</span>
 <span className="text-[10px] text-text-3">Today at 09:00 AM</span>
 </div>
 <div className="rounded border-l-4 border-blue-primary bg-bg-card pl-3 pr-4 py-2 space-y-1">
 <p className="text-xs font-semibold text-text-1">
 Workflow Run Completed
 </p>
 <p className="text-xs text-text-2">
 Your workflow finished successfully. 3 nodes processed.
 </p>
 <div className="flex items-center gap-2 pt-1">
 <span className="flex items-center gap-1 text-[11px] text-success">
 <CheckCircle2 className="w-3 h-3" />
 Success
 </span>
 <span className="text-[11px] text-text-3">|</span>
 <span className="flex items-center gap-1 text-[11px] text-text-2">
 <Hash className="w-3 h-3" />
 {channelName}
 </span>
 <span className="text-[11px] text-text-3">|</span>
 <span className="text-[11px] text-text-2">12.4K records</span>
 </div>
 </div>
 </div>
 </div>
 <p className="text-[10px] text-text-3">
 This is a preview. Actual message may vary.
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
 <div className="rounded-xl border border-line-1 bg-bg-page overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-line-1 bg-bg-card">
 <div className="flex items-center gap-2.5">
 <svg viewBox="0 0 24 24" className="w-4 h-4" fill={LINE_GREEN}>
 <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
 </svg>
 <span className="text-sm font-semibold text-text-1">LINE Notify</span>
 </div>
 <div className="flex items-center gap-2">
 {isConnected ? (
 <span className="flex items-center gap-1 text-xs font-medium text-success">
 <CheckCircle2 className="w-3.5 h-3.5" />
 Connected
 </span>
 ) : (
 <span className="flex items-center gap-1 text-xs text-text-3">
 <AlertCircle className="w-3.5 h-3.5" />
 Not connected
 </span>
 )}
 <button
 onClick={onRemove}
 className="p-1 rounded text-text-3 hover:text-error hover:bg-danger-bg transition-colors"
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
 <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-card border border-line-1">
 <AlertCircle className="w-4 h-4 text-text-3 shrink-0 mt-0.5" />
 <p className="text-xs text-text-2">
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
 <div className="flex items-center gap-3 p-3 rounded-lg bg-success-bg border border-success/20">
 <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
 <div>
 <p className="text-sm font-medium text-success">LINE Notify connected</p>
 <p className="text-xs text-text-2 mt-0.5">
 Run notifications will be sent to your LINE group or user.
 </p>
 </div>
 <button
 onClick={onRemove}
 className="ml-auto shrink-0 flex items-center gap-1 text-xs text-text-3 hover:text-error transition-colors"
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

// ---------------------------------------------------------------------------
// OnFailureTab — Error workflow selector
// ---------------------------------------------------------------------------

interface OnFailureTabProps {
 errorWorkflowId: string | null;
 onErrorWorkflowChange: (_workflowId: string | null) => void;
 workflows: WorkflowSummary[];
 workflowsLoading: boolean;
 workflowDropdownOpen: boolean;
 onDropdownToggle: () => void;
 onDropdownClose: () => void;
}

const OnFailureTab: React.FC<OnFailureTabProps> = ({
 errorWorkflowId,
 onErrorWorkflowChange,
 workflows,
 workflowsLoading,
 workflowDropdownOpen,
 onDropdownToggle,
 onDropdownClose,
}) => {
 const selectedWorkflow = workflows.find((w) => w.id === errorWorkflowId) ?? null;

 const handleSelect = (workflowId: string | null) => {
 onErrorWorkflowChange(workflowId);
 onDropdownClose();
 };

 return (
 <div className="space-y-5">
 {/* Explanation */}
 <div className="flex items-start gap-3 rounded-xl border border-danger-border/20 bg-danger-bg px-4 py-3">
 <ShieldAlert className="w-4 h-4 text-error shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-text-1">Error Workflow</p>
 <p className="text-xs text-text-2 mt-1 leading-relaxed">
 When this workflow fails, OrbitX will automatically trigger the selected error workflow
 and pass the error context as input. The error workflow must contain an{' '}
 <span className="font-mono text-error">Error Trigger</span> source node to receive the
 payload.
 </p>
 </div>
 </div>

 {/* Workflow selector */}
 <div className="space-y-2">
 <label className="text-xs font-medium text-text-2">Error Workflow</label>

 <div className="relative">
 <button
 type="button"
 onClick={onDropdownToggle}
 className={cn(
 'w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all bg-bg-page',
 workflowDropdownOpen
 ? 'border-blue-primary ring-2 ring-blue-soft'
 : 'border-line-1 hover:border-line-1/80'
 )}
 >
 <span className={selectedWorkflow ? 'text-text-1' : 'text-text-3'}>
 {workflowsLoading
 ? 'Loading workflows...'
 : selectedWorkflow
 ? selectedWorkflow.name
 : 'None — errors are not forwarded'}
 </span>
 <ChevronDown
 className={cn(
 'w-4 h-4 text-text-3 transition-transform',
 workflowDropdownOpen && 'rotate-180'
 )}
 />
 </button>

 {workflowDropdownOpen && !workflowsLoading && (
 <div className="absolute z-50 mt-1 w-full bg-bg-page border border-line-1 rounded-lg shadow-lg overflow-hidden">
 {/* None option */}
 <button
 type="button"
 onClick={() => handleSelect(null)}
 className={cn(
 'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-bg-card transition-colors',
 errorWorkflowId === null && 'bg-blue-soft'
 )}
 >
 <span className="text-text-3 italic">None</span>
 {errorWorkflowId === null && (
 <Check className="w-4 h-4 text-blue-primary" />
 )}
 </button>

 {workflows.length === 0 ? (
 <div className="px-3 py-4 text-sm text-text-3 text-center border-t border-line-1">
 No other workflows found.{' '}
 <a href="/workflows" className="text-blue-primary hover:underline">
 Create one
 </a>
 </div>
 ) : (
 <div className="border-t border-line-1">
 {workflows.map((workflow) => (
 <button
 key={workflow.id}
 type="button"
 onClick={() => handleSelect(workflow.id)}
 className={cn(
 'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-bg-card transition-colors',
 workflow.id === errorWorkflowId && 'bg-blue-soft'
 )}
 >
 <span className="text-text-1">{workflow.name}</span>
 {workflow.id === errorWorkflowId && (
 <Check className="w-4 h-4 text-blue-primary" />
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 {errorWorkflowId !== null && selectedWorkflow && (
 <p className="text-xs text-text-3">
 Failures will trigger{' '}
 <span className="font-medium text-text-2">{selectedWorkflow.name}</span>.
 </p>
 )}
 </div>

 {/* Requirements note */}
 <div className="rounded-xl border border-line-1 bg-bg-page p-4 space-y-2">
 <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">
 Requirements
 </p>
 <ul className="space-y-1.5">
 {[
 'The error workflow must contain an Error Trigger source node.',
 'The error workflow cannot be the same workflow (no self-loops).',
 'If the error workflow itself fails, it will not trigger a further error workflow.',
 ].map((req) => (
 <li key={req} className="flex items-start gap-2 text-xs text-text-2">
 <span className="mt-1 w-1 h-1 rounded-full bg-text-tertiary shrink-0" />
 {req}
 </li>
 ))}
 </ul>
 </div>
 </div>
 );
};
