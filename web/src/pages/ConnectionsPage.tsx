import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useNotification } from "@/hooks/useNotification";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { useFetchOnce } from "@/hooks/useStableRequest";
import { bigQueryService } from "@/services/bigQueryService";
import { googleSheetsService } from "@/services/googleSheetsService";
import { googleAdsService } from "@/services/googleAdsService";
import { facebookOAuthService } from "@/services/facebookOAuthService";
import { tiktokOAuthService } from "@/services/tiktokOAuthService";
// import { testConnection, type TestConnectionResult } from "@/services/connectionService";
import { fetchClient } from "@/lib/fetchClient";
import {
  Search,
  Link2,
  X,
  RefreshCw,
  Plus,
  Info,
} from "lucide-react";
import { FacebookIcon, TikTokIcon, GoogleAdsIcon, BigQueryIcon, MySQLIcon, GoogleSheetsIcon } from "@/components/icons/BrandIcons";
import ConnectionRow from "@/components/connections/ConnectionRow";
import ConnectionGroupRow, { type ConnectionItem } from "@/components/connections/ConnectionGroupRow";
import { FacebookAdsSelector } from "@/components/connections/FacebookAdsSelector";
import { ConnectionHelp } from "@/components/connections/ConnectionHelp";
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
  setupFields: string[];
}

const connectionTypes: ConnectionType[] = [
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Connect to Google Ads for campaign reporting and management.",
    icon: <GoogleAdsIcon className="w-10 h-10" />,
    setupFields: [],
  },
  {
    id: "facebookads",
    name: "Facebook Ads",
    description: "Sync lead data and campaign performance metrics from Meta Ads.",
    icon: <FacebookIcon className="w-10 h-10" />,
    setupFields: [],
  },
  {
    id: "tiktokads",
    name: "TikTok Ads",
    description: "Extract campaign performance and ad metrics from TikTok Ads Manager.",
    icon: <TikTokIcon className="w-10 h-10" />,
    setupFields: [],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    description: "Connect to Google BigQuery for data warehousing and analytics.",
    icon: <BigQueryIcon className="w-10 h-10" />,
    setupFields: ["projectId", "keyFile"],
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "Connect to MySQL databases for SQL querying and data extraction.",
    icon: <MySQLIcon className="w-10 h-10" />,
    setupFields: ["host", "port", "database", "username", "password"],
  },
  {
    id: "GoogleSheets",
    name: "Google Sheets",
    description: "Read and write data directly to Google Spreadsheets.",
    icon: <GoogleSheetsIcon className="w-10 h-10" />,
    setupFields: [],
  },
];

const ConnectionsPage = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Connection | null>(null);
  const [pendingDisconnectId, setPendingDisconnectId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
      const list: Connection[] = arr.map((c: unknown) => {
        const conn = c as Record<string, unknown>;
        const rawServiceName = (conn?.service_name || "").toString();
        const normalize = (raw?: string) => {
          const t = (raw || "").toLowerCase().replace(/\s+/g, "");
          if (t.includes("bigquery") || t === "googlebigquery") return "bigquery";
          if (t.includes("mysql")) return "mysql";
          if (t.includes("facebook") || t.includes("fb") || t.includes("meta")) return "facebookads";
          if (t.includes("tiktok")) return "tiktokads";
          if (t.includes("googleads") || t.includes("google_ads") || t === "googleads") return "google_ads";
          if (t.includes("sheet") || t.includes("googlesheet")) return "GoogleSheets";
          return t;
        };
        const typeId = normalize(rawServiceName);
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

  useEffect(() => {
    function normalizeConnectorType(raw?: string): string {
      const t = (raw || "").toLowerCase().replace(/\s+/g, "");
      if (t.includes("bigquery") || t === "googlebigquery") return "bigquery";
      if (t.includes("mysql")) return "mysql";
      if (t.includes("facebook") || t.includes("fb") || t.includes("meta")) return "facebookads";
      if (t.includes("tiktok")) return "tiktokads";
      if (t.includes("googleads") || t.includes("google_ads") || t === "googleads") return "google_ads";
      if (t.includes("sheet")) return "GoogleSheets";
      return t;
    }

    function friendlyName(typeId: string): string {
      const match = connectionTypes.find((t) => t.id === typeId);
      return match ? match.name : typeId;
    }

    function handleOAuthMessage(event: MessageEvent) {
      const msgType: string | undefined = event.data?.type;
      const providerFromMsg: string | undefined = event.data?.provider;
      if (!msgType) return;

      const providerType =
        providerFromMsg || (msgType.endsWith("_connected") ? msgType.replace(/_connected$/, "") : undefined);
      if (!providerType) return;

      const normalized = normalizeConnectorType(providerType);
      const label = friendlyName(normalized);

      notify.success("Success", `${label} Connected!`);
      loadConnections();
    }
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [notify, loadConnections]);

  const handleConnect = async (typeId: string) => {
    setConnectingType(typeId);
    try {
      const label = connectionTypes.find((t) => t.id === typeId)?.name || typeId;

      if (typeId === "bigquery") {
        await bigQueryService.connectWithPopup(`BigQuery Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "GoogleSheets") {
        await googleSheetsService.connectWithPopup(`Google Sheets Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "google_ads") {
        await googleAdsService.connectWithPopup(`Google Ads Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "facebookads") {
        await facebookOAuthService.connectWithPopup(`Facebook Ads Connection ${Date.now()}`);
        loadConnections();
      } else if (typeId === "tiktokads") {
        await tiktokOAuthService.connectWithPopup(`TikTok Ads Connection ${Date.now()}`);
        loadConnections();
      } else {
        notify.info("Info", `${label} connection via API will be available soon.`);
      }
    } catch (error) {
      notify.error("Error", error instanceof Error ? error.message : "Failed to initiate connection");
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
      notify.successDialog("Disconnected", ["The connection was removed."], "✅");
    } catch {
      notify.errorDialog("Disconnect failed", ["Please try again."]);
    } finally {
      setIsDisconnecting(false);
      setPendingDisconnectId(null);
    }
  };

  const connectionsByType = connections.reduce<Record<string, Connection[]>>((acc, connection) => {
    if (!acc[connection.type]) {
      acc[connection.type] = [];
    }
    acc[connection.type].push(connection);
    return acc;
  }, {});

  const connectedTypes = connectionTypes.filter((type) => connectionsByType[type.id]?.length > 0);

  const availableTypes = connectionTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showLoading = useDeferredLoading(loading, 150);

  const totalConnections = connections.length;

  if (showLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-7 w-32 animate-pulse" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
              <div className="h-4 w-48 mt-2 animate-pulse" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }} />
            </div>
            <div className="h-9 w-24 animate-pulse" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
          </div>

          <div className="h-12 animate-pulse" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }} />

          {/* Row-based loading skeleton */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 animate-pulse" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex-shrink-0" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
                    <div className="h-3 w-48" style={{ backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: '4px' }} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-20" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
                    <div className="w-6 h-6" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: '48px', height: '2px', background: 'linear-gradient(to right, #00D4FF, transparent)' }} />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ color: '#E8ECF4' }}>Connections</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8896AD' }}>
              <span className="font-mono">{totalConnections}</span> connected &middot; <span className="font-mono">{connectionTypes.length}</span> available
            </p>
          </div>

          <button
            onClick={() => loadConnections()}
            disabled={loading}
            className="h-9 px-3 flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#8896AD', backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '4px' }}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="hidden sm:inline uppercase tracking-wider text-xs">Refresh</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3" style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.12)', borderRadius: '6px' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#506080' }} />
            <input
              type="text"
              placeholder="Search connectors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-9 text-sm focus:outline-none transition-all"
              style={{ backgroundColor: '#0F1729', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px', color: '#E8ECF4' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#8896AD' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Setup Guides (shown when no connections or search is empty) */}
        {totalConnections === 0 && !searchTerm && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4" style={{ color: '#00D4FF' }} />
              <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#8896AD' }}>Setup Guides</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {connectionTypes.slice(0, 4).map((type) => (
                <ConnectionHelp key={type.id} connectionType={type.id} />
              ))}
            </div>
          </section>
        )}

        {/* Active Connections - Grouped Row View */}
        {connectedTypes.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              {/* Mint LED dot for connected */}
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#00E5A0', boxShadow: '0 0 6px rgba(0, 229, 160, 0.5)' }} />
              <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#8896AD' }}>Active Connections</h2>
              <span className="text-xs font-mono px-2 py-0.5" style={{ color: '#00D4FF', backgroundColor: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '4px' }}>
                {totalConnections}
              </span>
            </div>

            {/* Thin cyan gradient divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(0, 212, 255, 0.3), transparent)' }} />

            <div className="space-y-2">
              {connectedTypes.map((type) => {
                const typeConnections = connectionsByType[type.id] || [];
                const connectionItems: ConnectionItem[] = typeConnections.map((conn) => ({
                  id: conn.id,
                  accountInfo: conn.accountInfo,
                  status: conn.status,
                  createdAt: conn.createdAt,
                }));

                return (
                  <ConnectionGroupRow
                    key={type.id}
                    icon={type.icon}
                    name={type.name}
                    connections={connectionItems}
                    onViewDetails={(conn) => {
                      const fullConnection = typeConnections.find((c) => c.id === conn.id);
                      if (fullConnection) setViewing(fullConnection);
                    }}
                    onDisconnect={(connectionId) => handleDisconnect(connectionId)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Available Connectors - Clean Row View */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            {/* Dim gray dot for available */}
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#506080' }} />
            <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#8896AD' }}>Available Connectors</h2>
            <span className="text-xs font-mono px-2 py-0.5" style={{ color: '#8896AD', backgroundColor: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.1)', borderRadius: '4px' }}>
              {availableTypes.length}
            </span>
          </div>

          {/* Thin cyan gradient divider */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(0, 212, 255, 0.2), transparent)' }} />

          {availableTypes.length === 0 ? (
            <div className="p-8 text-center" style={{ backgroundColor: '#1A2744', border: '2px dashed rgba(0, 212, 255, 0.15)', borderRadius: '6px' }}>
              <Search className="w-8 h-8 mx-auto mb-3" style={{ color: '#506080' }} />
              <p className="text-sm" style={{ color: '#8896AD' }}>No connectors match "{searchTerm}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableTypes.map((type) => (
                <ConnectionRow
                  key={type.id}
                  icon={type.icon}
                  name={type.name}
                  description={type.description}
                  variant="available"
                  onConnect={() => handleConnect(type.id)}
                  isConnecting={connectingType === type.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Connection Details Modal - Compact auto-height */}
      {viewing && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 41, 0.8)' }}
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-md"
            style={{ backgroundColor: '#1A2744', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '6px', boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.12)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)', borderRadius: '4px' }}>
                  {React.cloneElement(
                    (connectionTypes.find((t) => t.id === viewing.type)?.icon || <Link2 className="w-5 h-5" />) as React.ReactElement,
                    { className: 'w-5 h-5' }
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold uppercase tracking-wider" style={{ color: '#E8ECF4' }}>
                    {connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00E5A0', boxShadow: '0 0 4px rgba(0, 229, 160, 0.5)' }} />
                    <span className="text-xs font-medium" style={{ color: '#00E5A0' }}>Connected</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="p-2 transition-colors"
                style={{ color: '#8896AD', borderRadius: '4px' }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {viewing.type === "facebookads" ? (
                <FacebookAdsSelector
                  connectionId={viewing.id}
                  onSelect={(account) => {
                    notify.success("Account Selected", `Selected ${account.name}`);
                  }}
                  onCancel={() => setViewing(null)}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)' }}>
                    <span className="text-sm" style={{ color: '#8896AD' }}>Service</span>
                    <span className="text-sm font-medium" style={{ color: '#E8ECF4' }}>
                      {connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)' }}>
                    <span className="text-sm" style={{ color: '#8896AD' }}>Account</span>
                    <span className="text-sm font-medium" style={{ color: '#E8ECF4' }}>{viewing.accountInfo}</span>
                  </div>
                  {viewing.createdAt && (
                    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.08)' }}>
                      <span className="text-sm" style={{ color: '#8896AD' }}>Created</span>
                      <span className="text-sm font-medium font-mono" style={{ color: '#E8ECF4' }}>
                        {new Date(viewing.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm" style={{ color: '#8896AD' }}>Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00E5A0', boxShadow: '0 0 4px rgba(0, 229, 160, 0.5)' }} />
                      <span className="text-sm font-medium" style={{ color: '#00E5A0' }}>Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(0, 212, 255, 0.12)' }}>
              <Button
                variant="destructive"
                onClick={() => {
                  setViewing(null);
                  handleDisconnect(viewing.id);
                }}
                className="flex-1"
              >
                Disconnect
              </Button>
              <Button variant="outline" onClick={() => setViewing(null)} className="flex-1">
                Close
              </Button>
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
            <p className="text-sm text-text-tertiary">Workflows using this connection may fail until updated.</p>
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
