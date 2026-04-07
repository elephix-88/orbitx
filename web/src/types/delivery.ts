// Delivery configuration types for workflow notifications

export type DeliveryChannelType = 'slack' | 'line';

export type DeliveryChannelStatus = 'pending' | 'connected' | 'error';

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackDeliveryChannel {
  type: 'slack';
  channelId: string;
  channelName: string;
  status: DeliveryChannelStatus;
  workspaceId?: string;
  workspaceName?: string;
}

export interface LineDeliveryChannel {
  type: 'line';
  status: DeliveryChannelStatus;
  notifyToken?: string;
}

export type DeliveryChannel = SlackDeliveryChannel | LineDeliveryChannel;

export interface DeliveryConfig {
  channels: DeliveryChannel[];
  includeAiSummary: boolean;
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  channels: [],
  includeAiSummary: false,
};

// Execution delivery result — stored per execution run
export type ChannelDeliveryStatus = 'delivered' | 'failed' | 'not_configured';

export interface ExecutionDeliveryResult {
  channelType: DeliveryChannelType;
  status: ChannelDeliveryStatus;
  channelLabel?: string; // e.g. "#marketing-alerts"
  error?: string;
}
