import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/shared/Button";
import { Chip } from "@/components/shared/Chip";
import { StatTile } from "@/components/shared/StatTile";
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
import { Link2, X } from "lucide-react";
import { FacebookIcon, TikTokIcon, GoogleAdsIcon, BigQueryIcon, MySQLIcon, GoogleSheetsIcon } from "@/components/icons/BrandIcons";
import { FacebookAdsSelector } from "@/components/connections/FacebookAdsSelector";

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
 id: "facebook_ads",
 name: "Facebook Ads",
 description: "Sync lead data and campaign performance metrics from Meta Ads.",
 icon: <FacebookIcon className="w-10 h-10" />,
 setupFields: [],
 },
 {
 id: "tiktok_ads",
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
 id: "google_sheets",
 name: "Google Sheets",
 description: "Read and write data directly to Google Spreadsheets.",
 icon: <GoogleSheetsIcon className="w-10 h-10" />,
 setupFields: [],
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
 const [_searchTerm, _setSearchTerm] = useState("");

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

 useEffect(() => {
 function friendlyName(typeId: string): string {
 const match = connectionTypes.find((t) => t.id === typeId);
 return match ? match.name : typeId;
 }

 async function handleOAuthMessage(event: MessageEvent) {
 const msgType: string | undefined = event.data?.type;
 const providerFromMsg: string | undefined = event.data?.provider;
 if (!msgType) return;

 const providerType =
 providerFromMsg || (msgType.endsWith("_connected") ? msgType.replace(/_connected$/, "") : undefined);
 if (!providerType) return;

 const normalized = normalizeConnectorType(providerType);
 const label = friendlyName(normalized);

 try {
 await loadConnections();
 notify.success("Connected", `${label} connected successfully`);
 } catch {
 notify.error("Connection Error", `${label} connected but failed to refresh the list. Please reload.`);
 }
 }
 const handleMessage = (event: MessageEvent) => { void handleOAuthMessage(event); };
 window.addEventListener("message", handleMessage);
 return () => window.removeEventListener("message", handleMessage);
 }, [notify, loadConnections]);

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
 notify.successDialog("Disconnected", ["The connection was removed."], "✅");
 } catch {
 notify.errorDialog("Disconnect failed", ["Please try again."]);
 } finally {
 setIsDisconnecting(false);
 setPendingDisconnectId(null);
 }
 };



 const showLoading = useDeferredLoading(loading, 150);

 const totalConnections = connections.length;

 // Derive status chip variant from connection.status field
 function statusVariant(status?: string): 'success' | 'danger' | 'warning' | 'soft' {
 const s = (status || '').toLowerCase();
 if (!s || s === 'active' || s === 'connected' || s === 'ok' || s === 'healthy') return 'success';
 if (s.includes('error') || s.includes('fail') || s.includes('expired') || s.includes('auth')) return 'danger';
 if (s.includes('expir') || s.includes('warn') || s.includes('rate')) return 'warning';
 return 'soft';
 }

 function statusLabel(status?: string): string {
 if (!status) return 'Healthy';
 const s = status.toLowerCase();
 if (s.includes('auth')) return 'AuthError';
 if (s.includes('rate')) return 'Rate-limited';
 if (s.includes('expir')) return 'Expiring';
 if (s.includes('fail') || s.includes('error')) return 'Error';
 return 'Healthy';
 }

 const healthyCount = connections.filter((c) => statusVariant(c.status) === 'success').length;
 const expiringCount = connections.filter((c) => statusVariant(c.status) === 'warning').length;
 const brokenCount = connections.filter((c) => statusVariant(c.status) === 'danger').length;

 const availableSources = [
 { id: 'linkedin_ads', name: 'LinkedIn Ads', abbr: 'in', bg: '#0A66C2', auth: 'OAuth' },
 { id: 'pinterest', name: 'Pinterest Ads', abbr: 'P', bg: '#E60023', auth: 'OAuth' },
 { id: 'klaviyo', name: 'Klaviyo', abbr: 'K', bg: '#FF9A00', auth: 'API key' },
 { id: 'hubspot', name: 'HubSpot', abbr: 'Hs', bg: '#FF7A59', auth: 'OAuth' },
 { id: 'shopify', name: 'Shopify', abbr: 'S', bg: '#96BF48', auth: 'OAuth' },
 { id: 'ga4', name: 'GA4', abbr: 'GA', bg: '#F69020', auth: 'OAuth' },
 { id: 'rest', name: 'REST API', abbr: 'R', bg: '#0B1A5E', auth: 'Custom' },
 ] as const;

 if (showLoading) {
 return (
 <Layout title="Connections">
 <div className="space-y-5">
 <div className="grid grid-cols-4 gap-3">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-[88px] rounded-xl bg-bg-muted animate-pulse" />
 ))}
 </div>
 <div className="h-[200px] rounded-xl bg-bg-muted animate-pulse" />
 </div>
 </Layout>
 );
 }

 return (
 <Layout title="Connections">
 <div className="space-y-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="w-8 h-1 bg-blue-primary rounded-full" />
 <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-3">
 Workspace
 </span>
 </div>
 <h1 className="text-[26px] font-semibold text-text-1 tracking-tight leading-tight">
 Connections
 </h1>
 <p className="text-[14px] text-text-2 mt-1.5">
 OAuth accounts and API credentials linked to your workspace.
 </p>
 </div>

 {/* KPI tiles */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <StatTile label="Connected" value={totalConnections} />
 <StatTile
 label="Healthy"
 value={<span className="text-success">{healthyCount}</span>}
 delta={{ direction: 'flat', text: 'Tokens valid' }}
 />
 <StatTile
 label="Expiring soon"
 value={<span className={expiringCount > 0 ? 'text-warning' : undefined}>{expiringCount}</span>}
 />
 <StatTile
 label="Broken"
 value={<span className={brokenCount > 0 ? 'text-danger' : undefined}>{brokenCount}</span>}
 delta={brokenCount > 0 ? { direction: 'down', text: 'Requires reconnect' } : undefined}
 />
 </div>

 {/* Connections table */}
 {connections.length > 0 && (
 <div className="bg-bg-card border border-line-1 rounded-xl overflow-hidden shadow-sm">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="text-left text-[11px] font-medium text-text-3 uppercase tracking-wider">
 <th className="px-4 py-2.5 border-b border-line-1">Platform</th>
 <th className="px-4 py-2.5 border-b border-line-1">Account</th>
 <th className="px-4 py-2.5 border-b border-line-1 hidden md:table-cell">Scopes</th>
 <th className="px-4 py-2.5 border-b border-line-1 hidden lg:table-cell">Used by</th>
 <th className="px-4 py-2.5 border-b border-line-1 hidden lg:table-cell">Last sync</th>
 <th className="px-4 py-2.5 border-b border-line-1 hidden md:table-cell">Token</th>
 <th className="px-4 py-2.5 border-b border-line-1">Status</th>
 <th className="px-4 py-2.5 border-b border-line-1 w-[120px]"></th>
 </tr>
 </thead>
 <tbody>
 {connections.map((conn) => {
 const typeInfo = connectionTypes.find((t) => t.id === conn.type);
 const variant = statusVariant(conn.status);
 const needsReconnect = variant === 'danger';
 const needsRenew = variant === 'warning';
 return (
 <tr
 key={conn.id}
 className="border-t border-line-soft hover:bg-bg-row-hv transition-colors"
 >
 <td className="px-4 py-3">
 <div className="flex items-center gap-2 font-medium text-text-1">
 <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-text-2 bg-bg-muted border border-line-1">
 {typeInfo ? React.cloneElement(typeInfo.icon as React.ReactElement, { className: 'w-4 h-4' }) : null}
 </span>
 {typeInfo?.name ?? conn.type}
 </div>
 </td>
 <td className="px-4 py-3 font-mono text-[12px] text-text-2">{conn.accountInfo}</td>
 <td className="px-4 py-3 text-[11.5px] text-text-3 hidden md:table-cell">—</td>
 <td className="px-4 py-3 font-mono text-text-2 hidden lg:table-cell">—</td>
 <td className="px-4 py-3 text-text-2 hidden lg:table-cell">—</td>
 <td className="px-4 py-3 text-text-2 hidden md:table-cell">—</td>
 <td className="px-4 py-3">
 <Chip variant={variant}>{statusLabel(conn.status)}</Chip>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-1">
 {needsReconnect ? (
 <Button
 size="xs"
 variant="primary"
 onClick={() => handleConnect(conn.type)}
 isLoading={connectingType === conn.type}
 >
 Reconnect
 </Button>
 ) : needsRenew ? (
 <Button size="xs" variant="secondary">
 Renew
 </Button>
 ) : (
 <Button
 size="xs"
 variant="ghost"
 onClick={() => setViewing(conn)}
 >
 Manage
 </Button>
 )}
 <Button
 size="xs"
 variant="ghost"
 onClick={() => handleDisconnect(conn.id)}
 >
 ⋯
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {connections.length === 0 && (
 <div className="relative bg-bg-card border border-line-1 rounded-xl p-12 text-center overflow-hidden">
 <div className="absolute inset-x-0 top-0 h-1 bg-blue-primary" />
 <div className="w-12 h-12 rounded-xl bg-blue-soft border border-blue-border flex items-center justify-center mx-auto mb-4">
 <Link2 size={22} className="text-blue-primary" />
 </div>
 <div className="text-[15px] font-semibold text-text-1">No connections yet</div>
 <div className="text-[13px] text-text-2 mt-1.5 max-w-md mx-auto">
 Link a source to start piping ad data into your warehouse. Takes about 30 seconds with OAuth.
 </div>
 <Button
 size="sm"
 className="mt-5"
 leftIcon={<Link2 size={14} />}
 onClick={() => handleConnect(connectionTypes[0]?.id ?? '')}
 >
 Connect your first source
 </Button>
 </div>
 )}

 {/* Available sources */}
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="w-8 h-1 bg-blue-primary rounded-full" />
 <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-3">
 Library
 </span>
 </div>
 <h2 className="text-[16px] font-semibold text-text-1 mb-1">
 Available sources
 </h2>
 <p className="text-[12.5px] text-text-3 mb-4">
 Connect a platform via OAuth. Coming-soon sources will enable as integrations ship.
 </p>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
 {connectionTypes.map((type) => {
 const isOAuth = ['google_ads', 'facebook_ads', 'tiktok_ads', 'bigquery', 'google_sheets'].includes(type.id);
 return (
 <button
 key={type.id}
 type="button"
 onClick={() => handleConnect(type.id)}
 disabled={connectingType === type.id}
 className="group flex items-center gap-3 p-3.5 bg-bg-card border border-line-1 rounded-xl text-left hover:border-blue-border hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
 >
 <span className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-bg-muted border border-line-1 group-hover:bg-blue-soft group-hover:border-blue-border transition-colors">
 {React.cloneElement(type.icon as React.ReactElement, { className: 'w-5 h-5' })}
 </span>
 <div className="min-w-0 flex-1">
 <div className="text-[13px] font-semibold text-text-1 truncate">{type.name}</div>
 <div className="text-[11px] text-text-3">{isOAuth ? 'OAuth' : 'Credentials'}</div>
 </div>
 </button>
 );
 })}
 {availableSources.map((src) => (
 <div
 key={src.id}
 className="flex items-center gap-3 p-3.5 bg-bg-card border border-dashed border-line-2 rounded-xl cursor-not-allowed"
 title="Coming soon"
 >
 <span
 className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-white text-[11px] font-bold opacity-60"
 style={{ background: src.bg }}
 >
 {src.abbr}
 </span>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <div className="text-[13px] font-medium text-text-3 truncate">{src.name}</div>
 </div>
 <div className="text-[10px] font-semibold uppercase tracking-wider text-text-4">
 Soon
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Connection Details Modal */}
 {viewing && createPortal(
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-1/30"
 onClick={() => setViewing(null)}
 >
 <div
 className="w-full max-w-md bg-bg-card border border-line-1 rounded-xl shadow-lg"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center gap-3 px-5 py-4 border-b border-line-1">
 <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg-muted border border-line-1 text-text-2">
 {React.cloneElement(
 (connectionTypes.find((t) => t.id === viewing.type)?.icon || <Link2 className="w-4 h-4" />) as React.ReactElement,
 { className: 'w-4 h-4' }
 )}
 </span>
 <div className="flex-1 min-w-0">
 <h2 className="text-[14px] font-semibold text-text-1">
 {connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type}
 </h2>
 <div className="flex items-center gap-1.5 mt-[1px]">
 <span className="w-1.5 h-1.5 rounded-full bg-success" />
 <span className="text-[11.5px] text-success">Connected</span>
 </div>
 </div>
 <Button variant="ghost" size="icon-sm" onClick={() => setViewing(null)} aria-label="Close">
 <X size={16} />
 </Button>
 </div>
 <div className="p-5">
 {viewing.type === "facebook_ads" ? (
 <FacebookAdsSelector
 connectionId={viewing.id}
 onSelect={(account) => {
 notify.success("Account Selected", `Selected ${account.name}`);
 }}
 onCancel={() => setViewing(null)}
 />
 ) : (
 <div className="space-y-3 text-[13px]">
 {[
 ['Service', connectionTypes.find((t) => t.id === viewing.type)?.name || viewing.type],
 ['Account', viewing.accountInfo],
 viewing.createdAt ? ['Created', new Date(viewing.createdAt).toLocaleDateString()] : null,
 ['Status', 'Active'],
 ].filter(Boolean).map((item) => { const [label, value] = item as string[]; return (
 <div key={label} className="flex items-center justify-between py-2 border-b border-line-soft last:border-0">
 <span className="text-text-3">{label}</span>
 <span className="text-text-1 font-medium">{value}</span>
 </div>
 ); })}
 </div>
 )}
 </div>
 <div className="flex gap-2 px-5 py-3 border-t border-line-1">
 <Button
 variant="danger"
 size="sm"
 onClick={() => { setViewing(null); handleDisconnect(viewing.id); }}
 className="flex-1"
 >
 Disconnect
 </Button>
 <Button variant="secondary" size="sm" onClick={() => setViewing(null)} className="flex-1">
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
 <p className="text-sm text-text-2">Workflows using this connection may fail until updated.</p>
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
