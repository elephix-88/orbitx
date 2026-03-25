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

function normalizeConnectorType(raw?: string): string {
  const t = (raw || "").toLowerCase().replace(/\s+/g, "");
  if (t.includes("bigquery") || t === "googlebigquery") return "bigquery";
  if (t.includes("mysql")) return "mysql";
  if (t.includes("facebook") || t.includes("fb") || t.includes("meta")) return "facebookads";
  if (t.includes("tiktok")) return "tiktokads";
  if (t.includes("googleads") || t.includes("google_ads") || t === "googleads") return "google_ads";
  if (t.includes("sheet") || t.includes("googlesheet")) return "GoogleSheets";
  return t;
}

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

  useEffect(() => {
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
              <div className="h-7 w-32 animate-pulse bg-neutral-800 rounded-md" />
              <div className="h-4 w-48 mt-2 animate-pulse bg-neutral-800 rounded-md" />
            </div>
            <div className="h-9 w-24 animate-pulse bg-neutral-800 rounded-md" />
          </div>

          <div className="h-12 animate-pulse bg-surface-secondary border border-neutral-800 rounded-lg" />

          {/* Row-based loading skeleton */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 animate-pulse bg-surface-secondary border border-neutral-800 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex-shrink-0 bg-neutral-800 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-neutral-800 rounded-md" />
                    <div className="h-3 w-48 bg-neutral-800 rounded-md" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-20 bg-neutral-800 rounded-md" />
                    <div className="w-6 h-6 bg-neutral-800 rounded-md" />
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
              <div className="w-12 h-1 bg-primary-400" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">Connections</h1>
            <p className="text-sm mt-0.5 text-text-secondary">
              {totalConnections} connected &#9632; {connectionTypes.length} available
            </p>
          </div>

          <button
            onClick={() => loadConnections()}
            disabled={loading}
            className="h-9 px-3 flex items-center gap-2 text-sm transition-colors text-text-secondary bg-surface-secondary border border-neutral-800 rounded-lg hover:bg-surface-tertiary"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-surface-secondary border border-neutral-800 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search connectors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-9 text-sm focus:outline-none transition-all bg-neutral-900 border border-neutral-700 rounded-md text-text-primary focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
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
              <Info className="w-4 h-4 text-text-secondary" />
              <h2 className="text-sm font-medium text-text-primary">Setup Guides</h2>
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
              {/* Green circle for connected */}
              <span className="inline-block w-3 h-3 rounded-full bg-success" />
              <h2 className="text-sm font-medium text-text-primary">Active Connections</h2>
              <span className="text-xs px-2 py-0.5 text-text-secondary bg-surface-tertiary border border-neutral-800 rounded-md">
                {totalConnections}
              </span>
            </div>

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
            {/* Gray circle for available */}
            <span className="inline-block w-3 h-3 rounded-full bg-neutral-600" />
            <h2 className="text-sm font-medium text-text-primary">Available Connectors</h2>
            <span className="text-xs px-2 py-0.5 text-text-secondary bg-surface-tertiary border border-neutral-800 rounded-md">
              {availableTypes.length}
            </span>
          </div>

          {availableTypes.length === 0 ? (
            <div className="p-8 text-center bg-surface-secondary border-2 border-dashed border-neutral-800 rounded-xl">
              <Search className="w-8 h-8 mx-auto mb-3 text-text-secondary" />
              <p className="text-sm text-text-secondary">No connectors match "{searchTerm}"</p>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-md bg-surface-secondary border border-neutral-800 rounded-2xl shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center text-neutral-950 bg-primary-400 rounded-md">
                  {React.cloneElement(
                    (connectionTypes.find((t) => t.id === viewing.type)?.icon || <Link2 className="w-5 h-5" />) as React.ReactElement,
                    { className: 'w-5 h-5' }
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    {connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs font-medium text-success">Connected</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="p-2 hover:bg-surface-tertiary transition-colors rounded-md text-text-secondary"
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
                  <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                    <span className="text-sm text-text-secondary">Service</span>
                    <span className="text-sm font-medium text-text-primary">
                      {connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                    <span className="text-sm text-text-secondary">Account</span>
                    <span className="text-sm font-medium text-text-primary">{viewing.accountInfo}</span>
                  </div>
                  {viewing.createdAt && (
                    <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                      <span className="text-sm text-text-secondary">Created</span>
                      <span className="text-sm font-medium text-text-primary">
                        {new Date(viewing.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-secondary">Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm font-medium text-success">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-neutral-800">
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
