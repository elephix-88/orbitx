import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Layout from "@/components/Layout";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useNotification } from "@/hooks/useNotification";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { useFetchOnce } from "@/hooks/useStableRequest";
import { bigQueryService } from "@/services/bigQueryService";
import { googleSheetsService } from "@/services/googleSheetsService";
import { googleAdsService } from "@/services/googleAdsService";
import { facebookOAuthService } from "@/services/facebookOAuthService";
import { tiktokOAuthService } from "@/services/tiktokOAuthService";
import { fetchClient } from "@/lib/fetchClient";
import {
  Plus,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { FacebookIcon, TikTokIcon, GoogleAdsIcon, BigQueryIcon, MySQLIcon, GoogleSheetsIcon } from "@/components/icons/BrandIcons";
import { cn } from "@/lib/utils";

interface Connection {
  id: string;
  type: string;
  accountInfo: string;
  createdAt: string;
  status?: string;
}

interface ConnectionType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "source" | "destination";
}

const connectionTypes: ConnectionType[] = [
  {
    id: "facebook_ads",
    name: "Facebook Ads",
    description: "Meta Ads campaigns and metrics",
    icon: <FacebookIcon className="w-8 h-8" />,
    category: "source",
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Google Ads campaign data",
    icon: <GoogleAdsIcon className="w-8 h-8" />,
    category: "source",
  },
  {
    id: "tiktok_ads",
    name: "TikTok Ads",
    description: "TikTok Ads performance",
    icon: <TikTokIcon className="w-8 h-8" />,
    category: "source",
  },
  {
    id: "bigquery",
    name: "BigQuery",
    description: "Google BigQuery warehouse",
    icon: <BigQueryIcon className="w-8 h-8" />,
    category: "destination",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Google Spreadsheets",
    icon: <GoogleSheetsIcon className="w-8 h-8" />,
    category: "destination",
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "MySQL database",
    icon: <MySQLIcon className="w-8 h-8" />,
    category: "destination",
  },
];

const CONNECTOR_TYPE_MAP: Record<string, string> = {
  bigquery: 'bigquery',
  googlebigquery: 'bigquery',
  mysql: 'mysql',
  facebook: 'facebook_ads',
  facebookads: 'facebook_ads',
  fb: 'facebook_ads',
  meta: 'facebook_ads',
  tiktok: 'tiktok_ads',
  tiktokads: 'tiktok_ads',
  googleads: 'google_ads',
  google_ads: 'google_ads',
  sheet: 'google_sheets',
  googlesheet: 'google_sheets',
  googlesheets: 'google_sheets',
};

function normalizeConnectorType(raw?: string): string {
  const cleaned = (raw || '').toLowerCase().replace(/[\s_-]+/g, '');
  return CONNECTOR_TYPE_MAP[cleaned] ?? cleaned;
}

const ConnectionsPage = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Connection | null>(null);
  const [pendingDisconnectId, setPendingDisconnectId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { notify } = useNotification();
  const STORAGE_KEY = "app_connections";

  const loadConnections = useCallback(async () => {
    try {
      const resp = await fetchClient(`/api/connections`);
      const raw = await resp.json().catch(() => []);
      const arr: unknown[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
      const list: Connection[] = arr.map((rawConnection: unknown) => {
        const conn = rawConnection as Record<string, unknown>;
        const rawServiceName = (conn?.service_name || "").toString();
        const typeId = normalizeConnectorType(rawServiceName);
        const connectionId = conn?._id || `${typeId}_${conn?.connection_name || Date.now()}`;
        return {
          id: connectionId,
          type: typeId,
          accountInfo: conn?.connection_name || rawServiceName,
          createdAt: conn?.created_at || "",
          status: conn?.status,
        } as Connection;
      });
      setConnections(list);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Ignore localStorage errors
      }
    } catch {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: Connection[] = raw ? JSON.parse(raw) : [];
      setConnections(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFetchOnce(loadConnections, "connections-page");

  const handleConnect = async (typeId: string) => {
    setConnectingType(typeId);
    try {
      const label = connectionTypes.find((t) => t.id === typeId)?.name || typeId;

      if (typeId === "bigquery") {
        await bigQueryService.connectWithPopup(`BigQuery Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "google_sheets") {
        await googleSheetsService.connectWithPopup(`Google Sheets Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "google_ads") {
        await googleAdsService.connectWithPopup(`Google Ads Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "facebook_ads") {
        await facebookOAuthService.connectWithPopup(`Facebook Ads Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "tiktok_ads") {
        await tiktokOAuthService.connectWithPopup(`TikTok Ads Connection ${Date.now()}`);
        loadConnections();
      } else {
        notify.info("Info", `${label} connection via API will be available soon.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('popup was closed')) {
        notify.error("Error", message || "Failed to initiate connection");
      }
    } finally {
      setConnectingType(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setPendingDisconnectId(connectionId);
  };

  const confirmDisconnect = async () => {
    if (!pendingDisconnectId) return;
    setIsDisconnecting(true);
    try {
      const resp = await fetchClient(`/api/connections/${encodeURIComponent(pendingDisconnectId)}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error(`Failed ${resp.status}`);
      await loadConnections();
      notify.success("Disconnected", "The connection was removed.");
    } catch {
      notify.error("Error", "Disconnect failed. Please try again.");
    } finally {
      setIsDisconnecting(false);
      setPendingDisconnectId(null);
    }
  };

  // Group connections by type
  const connectionsByType = connections.reduce<Record<string, Connection[]>>((acc, connection) => {
    if (!acc[connection.type]) {
      acc[connection.type] = [];
    }
    acc[connection.type].push(connection);
    return acc;
  }, {});

  // Sources and Destinations
  const sourceTypes = connectionTypes.filter(t => t.category === "source");
  const destinationTypes = connectionTypes.filter(t => t.category === "destination");

  const connectedSourceTypes = sourceTypes.filter(t => connectionsByType[t.id]?.length > 0);
  const connectedDestinationTypes = destinationTypes.filter(t => connectionsByType[t.id]?.length > 0);

  const totalConnections = connections.length;
  const showLoading = useDeferredLoading(loading, 150);

  // Connection Card Component
  const ConnectionCard = ({ 
    type, 
    connection 
  }: { 
    type: ConnectionType; 
    connection?: Connection;
  }) => {
    const isConnected = !!connection;
    const status = connection?.status || 'connected';
    const statusColor = status === 'error' ? '#EF4444' : status === 'reconnect' ? '#F59E0B' : '#10B981';
    const statusText = status === 'error' ? 'Error' : status === 'reconnect' ? 'Reconnect needed' : 'Connected';

    return (
      <div 
        className="p-5 rounded-[14px]"
        style={{ 
          backgroundColor: 'rgb(22, 22, 25)',
          border: '1px solid rgba(255, 255, 255, 0.055)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              {type.icon}
            </div>
            <span 
              className="text-[14px] font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.88)' }}
            >
              {type.name}
            </span>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5">
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              <span 
                className="text-[11px]"
                style={{ color: statusColor }}
              >
                {statusText}
              </span>
            </div>
          )}
        </div>

        {/* Account info */}
        {isConnected && connection && (
          <p 
            className="text-[12px] mt-3 truncate"
            style={{ color: 'rgba(255, 255, 255, 0.28)' }}
          >
            {connection.accountInfo || 'Account connected'}
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3">
          {isConnected ? (
            <>
              <span 
                className="text-[11px]"
                style={{ color: 'rgba(255, 255, 255, 0.16)' }}
              >
                Synced recently
              </span>
              <button
                onClick={() => connection && handleDisconnect(connection.id)}
                className="text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors"
                style={{ 
                  color: 'rgba(255, 255, 255, 0.50)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.50)';
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span 
                className="text-[11px]"
                style={{ color: 'rgba(255, 255, 255, 0.28)' }}
              >
                {type.description}
              </span>
              <button
                onClick={() => handleConnect(type.id)}
                disabled={connectingType === type.id}
                className="text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                style={{ 
                  backgroundColor: '#FACC15',
                  color: 'rgb(13, 13, 16)',
                }}
              >
                {connectingType === type.id ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    Connect
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (showLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-32 animate-pulse rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
              <div className="h-4 w-24 mt-2 animate-pulse rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
            </div>
            <div className="h-8 w-32 animate-pulse rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="h-32 animate-pulse rounded-[14px]"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
              />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 
              className="font-display text-[18px] font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.88)' }}
            >
              Connections
            </h1>
            <p 
              className="text-[12px] mt-1"
              style={{ color: 'rgba(255, 255, 255, 0.28)' }}
            >
              {totalConnections} active
            </p>
          </div>

          <button
            onClick={() => loadConnections()}
            disabled={loading}
            className="h-8 px-3 flex items-center gap-2 text-[12px] font-medium rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.055)',
              color: 'rgba(255, 255, 255, 0.50)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* SOURCES Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span 
              className="text-[10px] font-semibold uppercase tracking-[0.09em]"
              style={{ color: 'rgba(255, 255, 255, 0.28)' }}
            >
              Sources
            </span>
            <span 
              className="text-[10px]"
              style={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              Ad Platforms
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {sourceTypes.map((type) => {
              const typeConnections = connectionsByType[type.id] || [];
              // Show connected card for each connection, or empty card if none
              if (typeConnections.length > 0) {
                return typeConnections.map((conn) => (
                  <ConnectionCard key={conn.id} type={type} connection={conn} />
                ));
              }
              return <ConnectionCard key={type.id} type={type} />;
            })}
          </div>
        </section>

        {/* DESTINATIONS Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span 
              className="text-[10px] font-semibold uppercase tracking-[0.09em]"
              style={{ color: 'rgba(255, 255, 255, 0.28)' }}
            >
              Destinations
            </span>
            <span 
              className="text-[10px]"
              style={{ color: 'rgba(255, 255, 255, 0.16)' }}
            >
              Data Warehouses
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {destinationTypes.map((type) => {
              const typeConnections = connectionsByType[type.id] || [];
              if (typeConnections.length > 0) {
                return typeConnections.map((conn) => (
                  <ConnectionCard key={conn.id} type={type} connection={conn} />
                ));
              }
              return <ConnectionCard key={type.id} type={type} />;
            })}
          </div>
        </section>
      </div>

      {/* Connection Details Modal */}
      {viewing && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-md rounded-[16px] overflow-hidden"
            style={{ 
              backgroundColor: 'rgb(22, 22, 25)',
              border: '1px solid rgba(255, 255, 255, 0.055)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex justify-between items-center px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.055)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#FACC15' }}
                >
                  {connectionTypes.find((t) => t.id === viewing.type)?.icon}
                </div>
                <div>
                  <h2 
                    className="text-[16px] font-semibold"
                    style={{ color: 'rgba(255, 255, 255, 0.88)' }}
                  >
                    {connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10B981' }} />
                    <span className="text-[11px]" style={{ color: '#10B981' }}>Connected</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="p-2 rounded-md transition-colors"
                style={{ color: 'rgba(255, 255, 255, 0.50)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <div 
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.035)' }}
              >
                <span className="text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.50)' }}>Account</span>
                <span className="text-[13px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.88)' }}>
                  {viewing.accountInfo}
                </span>
              </div>
              {viewing.createdAt && (
                <div 
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.035)' }}
                >
                  <span className="text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.50)' }}>Created</span>
                  <span className="text-[13px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.88)' }}>
                    {new Date(viewing.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div 
              className="flex gap-3 px-5 py-4"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.055)' }}
            >
              <button
                onClick={() => {
                  setViewing(null);
                  handleDisconnect(viewing.id);
                }}
                className="flex-1 py-2 text-[13px] font-medium rounded-lg"
                style={{ backgroundColor: '#EF4444', color: 'white' }}
              >
                Disconnect
              </button>
              <button 
                onClick={() => setViewing(null)} 
                className="flex-1 py-2 text-[13px] font-medium rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.055)',
                  color: 'rgba(255, 255, 255, 0.88)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        isOpen={!!pendingDisconnectId}
        title="Remove Connection?"
        message={
          <div className="space-y-2">
            <p>This will revoke access to this connector immediately.</p>
            <p className="text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.28)' }}>
              Workflows using this connection may fail until updated.
            </p>
          </div>
        }
        confirmText="Remove"
        cancelText="Cancel"
        confirmLoading={isDisconnecting}
        onConfirm={confirmDisconnect}
        onCancel={() => setPendingDisconnectId(null)}
      />
    </Layout>
  );
};

export default ConnectionsPage;
