// Delivery service — Slack and LINE Notify integration
import { fetchClient } from '@/lib/fetchClient';
import { DeliveryConfig } from '@/types/delivery';

interface SlackAuthorizeResponse {
  oauth_url: string;
}

interface ConnectionItem {
  id: string;
  service_name: string;
  connection_name: string;
  params: Record<string, string>;
}

interface SlackChannelsResponse {
  channels: SlackChannelItem[];
}

interface SlackChannelItem {
  id: string;
  name: string;
}

// --- Backend payload shapes (snake_case, matches Pydantic models) ---

interface BackendSlackChannelConfig {
  channel: 'slack';
  channel_id: string;
  channel_name: string;
  bot_token: string;
}

interface BackendLineChannelConfig {
  channel: 'line';
  access_token: string;
  to: string;
}

interface BackendDeliveryConfig {
  channels: (BackendSlackChannelConfig | BackendLineChannelConfig)[];
  include_ai_summary: boolean;
}

function serializeDeliveryConfig(config: DeliveryConfig, slackConnectionId: string): BackendDeliveryConfig {
  const channels: (BackendSlackChannelConfig | BackendLineChannelConfig)[] = [];

  for (const ch of config.channels) {
    if (ch.type === 'slack') {
      channels.push({
        channel: 'slack',
        channel_id: ch.channelId,
        channel_name: ch.channelName,
        bot_token: slackConnectionId,
      });
    } else if (ch.type === 'line') {
      channels.push({
        channel: 'line',
        access_token: ch.notifyToken ?? '',
        to: '',
      });
    }
  }

  return {
    channels,
    include_ai_summary: config.includeAiSummary,
  };
}

class DeliveryService {
  // Tracks the Slack connection_id after OAuth — needed for channel listing and serialization
  private slackConnectionId: string | null = null;

  // --- Slack ---

  async getSlackOAuthUrl(): Promise<string> {
    const response = await fetchClient('/api/slack/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_name: 'Slack' }),
    });
    if (!response.ok) throw new Error('Failed to get Slack OAuth URL');
    const data: SlackAuthorizeResponse = await response.json();
    return data.oauth_url;
  }

  async getSlackConnection(): Promise<ConnectionItem | null> {
    const response = await fetchClient('/api/connections');
    if (!response.ok) throw new Error('Failed to list connections');
    const connections: ConnectionItem[] = await response.json();
    const slackConnection = connections.find((c) => c.service_name === 'Slack') ?? null;
    if (slackConnection) {
      this.slackConnectionId = slackConnection.id;
    }
    return slackConnection;
  }

  async getSlackChannels(connectionId: string): Promise<SlackChannelItem[]> {
    const response = await fetchClient(
      `/api/slack/channels?connection_id=${encodeURIComponent(connectionId)}`
    );
    if (!response.ok) throw new Error('Failed to fetch Slack channels');
    const data: SlackChannelsResponse = await response.json();
    return data.channels || [];
  }

  async disconnectSlack(connectionId: string): Promise<void> {
    const response = await fetchClient(
      `/api/connections/${encodeURIComponent(connectionId)}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to disconnect Slack');
    this.slackConnectionId = null;
  }

  // --- Delivery config persistence (stored on the workflow document) ---

  async saveDeliveryConfig(workflowId: string, config: DeliveryConfig): Promise<void> {
    const connectionId = this.slackConnectionId ?? '';
    const payload = serializeDeliveryConfig(config, connectionId);
    const response = await fetchClient(
      `/api/workflows/${encodeURIComponent(workflowId)}/delivery`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) throw new Error('Failed to save delivery config');
  }
}

export const deliveryService = new DeliveryService();
