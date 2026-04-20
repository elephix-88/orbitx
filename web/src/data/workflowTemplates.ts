// =============================================================================
// Workflow Templates
// =============================================================================
// Pre-configured workflow templates for common marketing data pipelines.
// Each template defines complete nodes, connections, and layout positions
// so users can start with a working workflow and just configure credentials.

import { WorkflowNode, WorkflowConnection } from '@/types/workflow';

export interface WorkflowTemplate {
 id: string;
 name: string;
 description: string;
 category: 'marketing' | 'analytics' | 'reporting';
 icon: string;
 difficulty: 'beginner' | 'intermediate' | 'advanced';
 estimatedSetupTime: string;
 /** Sources required (for display) */
 sources: string[];
 /** Destinations used (for display) */
 destinations: string[];
 /** Pre-configured nodes */
 nodes: Omit<WorkflowNode, 'status' | 'executionTime'>[];
 /** Pre-configured connections between nodes */
 connections: WorkflowConnection[];
 /** Tips for setting up this workflow */
 setupTips?: string[];
}

// =============================================================================
// Layout Constants
// =============================================================================

const COLUMN_X = {
 source: 60,
 transform: 360,
 joinOrSecondTransform: 660,
 destination: 960,
} as const;

const ROW_Y = {
 first: 60,
 second: 200,
 third: 340,
} as const;

const SINGLE_ROW_Y = 140;

// =============================================================================
// Port Helpers
// =============================================================================

const sourceOutputPort = [{ id: 'out', name: 'Output', type: 'records' }];
const transformInputPort = [{ id: 'in', name: 'Input', type: 'records', required: true }];
const transformOutputPort = [{ id: 'out', name: 'Output', type: 'records' }];
const destInputPort = [{ id: 'in', name: 'Input', type: 'records', required: true }];

// =============================================================================
// Connection Helper
// =============================================================================

function connection(
 id: string,
 sourceNodeId: string,
 targetNodeId: string,
): WorkflowConnection {
 return {
 id,
 sourceNodeId,
 targetNodeId,
 sourceOutputId: 'out',
 targetInputId: 'in',
 source: sourceNodeId,
 target: targetNodeId,
 sourceHandle: 'out',
 targetHandle: 'in',
 };
}

// =============================================================================
// Templates
// =============================================================================

export const workflowTemplates: WorkflowTemplate[] = [
 // -------------------------------------------------------------------------
 // Template 1: Facebook Ads -> Google Sheets (Daily)
 // -------------------------------------------------------------------------
 {
 id: 'facebook-ads-sheets-daily',
 name: 'Facebook Ads → Google Sheets (Daily)',
 description:
 'Pull Facebook Ads data, normalize it with Unify Schema, and export to Google Sheets. Perfect for daily performance reports shared with your team.',
 category: 'reporting',
 icon: 'Facebook',
 difficulty: 'beginner',
 estimatedSetupTime: '5 min',
 sources: ['Facebook Ads'],
 destinations: ['Google Sheets'],
 nodes: [
 {
 id: 'fb_source',
 type: 'source',
 name: 'Facebook Ads',
 definitionId: 'facebook.ads',
 position: { x: COLUMN_X.source, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 ad_account_id: [],
 fields: ['campaign_name', 'adset_name', 'ad_name', 'spend', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days', time_increment: 1 },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'unify_fb',
 type: 'transform',
 name: 'Unify Schema',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: SINGLE_ROW_Y },
 data: { platform: 'facebook_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'sheets_dest',
 type: 'destination',
 name: 'Google Sheets',
 definitionId: 'dest.googlesheets',
 position: { x: COLUMN_X.joinOrSecondTransform, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 spreadsheet_id: '',
 sheet_name: 'Facebook Ads Data',
 write_mode: 'replace',
 },
 inputs: destInputPort,
 outputs: [],
 },
 ],
 connections: [
 connection('conn_fb_unify', 'fb_source', 'unify_fb'),
 connection('conn_unify_sheets', 'unify_fb', 'sheets_dest'),
 ],
 setupTips: [
 'Connect your Facebook Ads account in Connections first',
 'Select the ad accounts and metrics you want to track',
 'Create or select a Google Sheets spreadsheet for the output',
 'Schedule daily for up-to-date reporting',
 ],
 },

 // -------------------------------------------------------------------------
 // Template 2: Google Ads -> BigQuery (Daily)
 // -------------------------------------------------------------------------
 {
 id: 'google-ads-bigquery-daily',
 name: 'Google Ads → BigQuery (Daily)',
 description:
 'Extract Google Ads campaign data, normalize with Unify Schema, and load into BigQuery for advanced analytics and BI dashboards.',
 category: 'analytics',
 icon: 'TrendingUp',
 difficulty: 'beginner',
 estimatedSetupTime: '5-10 min',
 sources: ['Google Ads'],
 destinations: ['BigQuery'],
 nodes: [
 {
 id: 'gads_source',
 type: 'source',
 name: 'Google Ads',
 definitionId: 'google.ads',
 position: { x: COLUMN_X.source, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 customer_id: '',
 fields: ['campaign_name', 'ad_group_name', 'cost_micros', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days' },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'unify_gads',
 type: 'transform',
 name: 'Unify Schema',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: SINGLE_ROW_Y },
 data: { platform: 'google_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'bq_dest',
 type: 'destination',
 name: 'BigQuery',
 definitionId: 'dest.bigquery',
 position: { x: COLUMN_X.joinOrSecondTransform, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 project_id: '',
 dataset: '',
 table: 'google_ads_unified',
 write_mode: 'append',
 },
 inputs: destInputPort,
 outputs: [],
 },
 ],
 connections: [
 connection('conn_gads_unify', 'gads_source', 'unify_gads'),
 connection('conn_unify_bq', 'unify_gads', 'bq_dest'),
 ],
 setupTips: [
 'Connect your Google account with Ads and BigQuery access',
 'Enter your Google Ads customer ID from the Ads dashboard',
 'Create a BigQuery dataset for marketing data',
 'Schedule daily runs for continuous analytics',
 ],
 },

 // -------------------------------------------------------------------------
 // Template 3: TikTok Ads -> Google Sheets (Weekly)
 // -------------------------------------------------------------------------
 {
 id: 'tiktok-ads-sheets-weekly',
 name: 'TikTok Ads → Google Sheets (Weekly)',
 description:
 'Export TikTok Ads performance data through Unify Schema into Google Sheets. Great for weekly reporting and cross-team sharing.',
 category: 'reporting',
 icon: 'BarChart3',
 difficulty: 'beginner',
 estimatedSetupTime: '5 min',
 sources: ['TikTok Ads'],
 destinations: ['Google Sheets'],
 nodes: [
 {
 id: 'tiktok_source',
 type: 'source',
 name: 'TikTok Ads',
 definitionId: 'tiktok.ads',
 position: { x: COLUMN_X.source, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 advertiser_id: '',
 fields: ['campaign_name', 'adgroup_name', 'ad_name', 'spend', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days' },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'unify_tiktok',
 type: 'transform',
 name: 'Unify Schema',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: SINGLE_ROW_Y },
 data: { platform: 'tiktok_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'sheets_dest',
 type: 'destination',
 name: 'Google Sheets',
 definitionId: 'dest.googlesheets',
 position: { x: COLUMN_X.joinOrSecondTransform, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 spreadsheet_id: '',
 sheet_name: 'TikTok Ads Data',
 write_mode: 'replace',
 },
 inputs: destInputPort,
 outputs: [],
 },
 ],
 connections: [
 connection('conn_tiktok_unify', 'tiktok_source', 'unify_tiktok'),
 connection('conn_unify_sheets', 'unify_tiktok', 'sheets_dest'),
 ],
 setupTips: [
 'Connect your TikTok Ads account in Connections first',
 'Select your advertiser ID and the metrics you need',
 'Create a Google Sheets spreadsheet for the report',
 'Set schedule to weekly (0 0 * * 0) for weekly reporting',
 ],
 },

 // -------------------------------------------------------------------------
 // Template 4: Cross-Channel Report (All Ads -> BigQuery)
 // Fan-in pattern: 3 sources -> 3 unify -> join -> destination
 // -------------------------------------------------------------------------
 {
 id: 'cross-channel-bigquery',
 name: 'Cross-Channel Report (All Ads → BigQuery)',
 description:
 'Combine Facebook, Google, and TikTok Ads into one unified dataset. Each source is normalized via Unify Schema, then merged with Join into BigQuery for cross-channel analytics.',
 category: 'analytics',
 icon: 'Merge',
 difficulty: 'advanced',
 estimatedSetupTime: '20-30 min',
 sources: ['Facebook Ads', 'Google Ads', 'TikTok Ads'],
 destinations: ['BigQuery'],
 nodes: [
 // Sources (column 1)
 {
 id: 'fb_source',
 type: 'source',
 name: 'Facebook Ads',
 definitionId: 'facebook.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.first },
 data: {
 connection_id: '',
 ad_account_id: [],
 fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days', time_increment: 1 },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'gads_source',
 type: 'source',
 name: 'Google Ads',
 definitionId: 'google.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.second },
 data: {
 connection_id: '',
 customer_id: '',
 fields: ['campaign_name', 'cost_micros', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days' },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'tiktok_source',
 type: 'source',
 name: 'TikTok Ads',
 definitionId: 'tiktok.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.third },
 data: {
 connection_id: '',
 advertiser_id: '',
 fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days' },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 // Unify transforms (column 2)
 {
 id: 'unify_fb',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify Facebook',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.first },
 data: { platform: 'facebook_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'unify_gads',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify Google',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.second },
 data: { platform: 'google_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'unify_tiktok',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify TikTok',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.third },
 data: { platform: 'tiktok_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 // Join (column 3)
 {
 id: 'join_all',
 type: 'transform',
 name: 'Join Tables',
 display_name: 'Merge All Channels',
 definitionId: 'transform.join',
 position: { x: COLUMN_X.joinOrSecondTransform, y: ROW_Y.second },
 data: {
 base_node_id: 0,
 base_key: '',
 base_keys: [],
 sources: [],
 suffixes: ['_x', '_y'],
 },
 inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
 outputs: transformOutputPort,
 },
 // Destination (column 4)
 {
 id: 'bq_dest',
 type: 'destination',
 name: 'BigQuery',
 definitionId: 'dest.bigquery',
 position: { x: COLUMN_X.destination, y: ROW_Y.second },
 data: {
 connection_id: '',
 project_id: '',
 dataset: '',
 table: 'cross_channel_ads',
 write_mode: 'append',
 },
 inputs: destInputPort,
 outputs: [],
 },
 ],
 connections: [
 // Sources -> Unify
 connection('conn_fb_unify', 'fb_source', 'unify_fb'),
 connection('conn_gads_unify', 'gads_source', 'unify_gads'),
 connection('conn_tiktok_unify', 'tiktok_source', 'unify_tiktok'),
 // Unify -> Join
 connection('conn_unify_fb_join', 'unify_fb', 'join_all'),
 connection('conn_unify_gads_join', 'unify_gads', 'join_all'),
 connection('conn_unify_tiktok_join', 'unify_tiktok', 'join_all'),
 // Join -> BigQuery
 connection('conn_join_bq', 'join_all', 'bq_dest'),
 ],
 setupTips: [
 'Connect all three ad platform accounts in Connections',
 'Configure each source with the accounts and fields you want',
 'The Unify Schema nodes normalize each platform to a common format',
 'Join merges all unified data into one table for cross-channel analysis',
 'Set up BigQuery with a dataset for your marketing warehouse',
 ],
 },

 // -------------------------------------------------------------------------
 // Template 5: Facebook + Google -> Unified Sheets Report
 // Fan-in: 2 sources -> 2 unify -> join -> Google Sheets
 // -------------------------------------------------------------------------
 {
 id: 'fb-google-unified-sheets',
 name: 'Facebook + Google → Unified Sheets Report',
 description:
 'Combine Facebook Ads and Google Ads data into one unified report in Google Sheets. Each source is normalized and merged for easy comparison.',
 category: 'reporting',
 icon: 'Merge',
 difficulty: 'intermediate',
 estimatedSetupTime: '10-15 min',
 sources: ['Facebook Ads', 'Google Ads'],
 destinations: ['Google Sheets'],
 nodes: [
 // Sources (column 1)
 {
 id: 'fb_source',
 type: 'source',
 name: 'Facebook Ads',
 definitionId: 'facebook.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.first },
 data: {
 connection_id: '',
 ad_account_id: [],
 fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days', time_increment: 1 },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'gads_source',
 type: 'source',
 name: 'Google Ads',
 definitionId: 'google.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.second },
 data: {
 connection_id: '',
 customer_id: '',
 fields: ['campaign_name', 'cost_micros', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days' },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 // Unify transforms (column 2)
 {
 id: 'unify_fb',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify Facebook',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.first },
 data: { platform: 'facebook_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'unify_gads',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify Google',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.second },
 data: { platform: 'google_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 // Join (column 3)
 {
 id: 'join_fb_gads',
 type: 'transform',
 name: 'Join Tables',
 display_name: 'Merge Channels',
 definitionId: 'transform.join',
 position: { x: COLUMN_X.joinOrSecondTransform, y: SINGLE_ROW_Y },
 data: {
 base_node_id: 0,
 base_key: '',
 base_keys: [],
 sources: [],
 suffixes: ['_x', '_y'],
 },
 inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
 outputs: transformOutputPort,
 },
 // Destination (column 4)
 {
 id: 'sheets_dest',
 type: 'destination',
 name: 'Google Sheets',
 definitionId: 'dest.googlesheets',
 position: { x: COLUMN_X.destination, y: SINGLE_ROW_Y },
 data: {
 connection_id: '',
 spreadsheet_id: '',
 sheet_name: 'Unified Ads Report',
 write_mode: 'replace',
 },
 inputs: destInputPort,
 outputs: [],
 },
 ],
 connections: [
 // Sources -> Unify
 connection('conn_fb_unify', 'fb_source', 'unify_fb'),
 connection('conn_gads_unify', 'gads_source', 'unify_gads'),
 // Unify -> Join
 connection('conn_unify_fb_join', 'unify_fb', 'join_fb_gads'),
 connection('conn_unify_gads_join', 'unify_gads', 'join_fb_gads'),
 // Join -> Google Sheets
 connection('conn_join_sheets', 'join_fb_gads', 'sheets_dest'),
 ],
 setupTips: [
 'Connect both Facebook Ads and Google accounts',
 'The Unify Schema nodes normalize each platform to the same columns',
 'Join merges both normalized datasets for side-by-side comparison',
 'Create a Google Sheets spreadsheet for the unified report',
 'Schedule daily or weekly depending on your reporting needs',
 ],
 },

 // -------------------------------------------------------------------------
 // Template 6: Web + Ads Cross-Channel Report
 // Fan-in: Google Ads + Facebook Ads -> 2 unify -> join -> Google Sheets
 // -------------------------------------------------------------------------
 {
 id: 'web-ads-cross-channel-sheets',
 name: 'Cross-Channel Ads Report',
 description:
 'Combine Google Ads and Facebook Ads into one unified report in Google Sheets. Normalize ad data via Unify Schema, then join for a cross-platform comparison view.',
 category: 'reporting',
 icon: 'BarChart3',
 difficulty: 'advanced',
 estimatedSetupTime: '20-30 min',
 sources: ['Google Ads', 'Facebook Ads', 'Google Analytics'],
 destinations: ['Google Sheets'],
 nodes: [
 // Sources (column 1)
 {
 id: 'gads_source',
 type: 'source',
 name: 'Google Ads',
 definitionId: 'google.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.first },
 data: {
 connection_id: '',
 ad_account_id: [],
 fields: ['campaign_name', 'cost_micros', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days', time_increment: 1 },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 {
 id: 'fb_source',
 type: 'source',
 name: 'Facebook Ads',
 definitionId: 'facebook.ads',
 position: { x: COLUMN_X.source, y: ROW_Y.second },
 data: {
 connection_id: '',
 ad_account_id: [],
 fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'conversions'],
 time_config: { time_preset: 'last_7_days', time_increment: 1 },
 },
 inputs: [],
 outputs: sourceOutputPort,
 },
 // Unify transforms for paid channels (column 2)
 {
 id: 'unify_gads',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify Google Ads',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.first },
 data: { platform: 'google_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 {
 id: 'unify_fb',
 type: 'transform',
 name: 'Unify Schema',
 display_name: 'Unify Facebook Ads',
 definitionId: 'transform.unify',
 position: { x: COLUMN_X.transform, y: ROW_Y.second },
 data: { platform: 'facebook_ads', include_calculated_metrics: true },
 inputs: transformInputPort,
 outputs: transformOutputPort,
 },
 // Join (column 3) — fan-in from 2 unified ad sources + GA4
 {
 id: 'join_all',
 type: 'transform',
 name: 'Join Tables',
 display_name: 'Merge All Channels',
 definitionId: 'transform.join',
 position: { x: COLUMN_X.joinOrSecondTransform, y: ROW_Y.second },
 data: {
 base_node_id: 0,
 base_key: '',
 base_keys: [],
 sources: [],
 suffixes: ['_ads', '_web'],
 },
 inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
 outputs: transformOutputPort,
 },
 // Destination (column 4)
 {
 id: 'sheets_dest',
 type: 'destination',
 name: 'Google Sheets',
 definitionId: 'dest.googlesheets',
 position: { x: COLUMN_X.destination, y: ROW_Y.second },
 data: {
 connection_id: '',
 spreadsheet_id: '',
 sheet_name: 'Cross-Channel Report',
 write_mode: 'replace',
 },
 inputs: destInputPort,
 outputs: [],
 },
 ],
 connections: [
 // Sources -> Unify / direct to join
 connection('conn_gads_unify', 'gads_source', 'unify_gads'),
 connection('conn_fb_unify', 'fb_source', 'unify_fb'),
 // Unified ads -> Join
 connection('conn_unify_gads_join', 'unify_gads', 'join_all'),
 connection('conn_unify_fb_join', 'unify_fb', 'join_all'),
 // Join -> Google Sheets
 connection('conn_join_sheets', 'join_all', 'sheets_dest'),
 ],
 setupTips: [
 'Connect Google Ads and Facebook Ads accounts in Connections',
 'The Unify Schema nodes normalize ad platform data to a common schema',
 'Join merges both normalized datasets for a cross-platform comparison',
 'Schedule daily to keep the report fresh',
 ],
 },
];

// =============================================================================
// Helper Functions
// =============================================================================

const createNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get a workflow template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
 return workflowTemplates.find((t) => t.id === id);
}

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
 return workflowTemplates.filter((t) => t.category === category);
}

/**
 * Get templates filtered by difficulty
 */
export function getTemplatesByDifficulty(difficulty: WorkflowTemplate['difficulty']): WorkflowTemplate[] {
 return workflowTemplates.filter((t) => t.difficulty === difficulty);
}

/**
 * Convert a template to a new workflow with unique node IDs.
 * Creates fresh IDs so each template instantiation is independent.
 */
export function templateToWorkflow(template: WorkflowTemplate): {
 nodes: WorkflowNode[];
 connections: WorkflowConnection[];
} {
 // Create ID mapping from template IDs to new unique IDs
 const idMapping: Record<string, string> = {};

 const nodes: WorkflowNode[] = template.nodes.map((node) => {
 const newId = createNodeId();
 idMapping[node.id] = newId;
 return {
 ...node,
 id: newId,
 status: 'pending' as const,
 };
 });

 const connections: WorkflowConnection[] = template.connections.map((conn) => ({
 ...conn,
 id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 sourceNodeId: idMapping[conn.sourceNodeId] || conn.sourceNodeId,
 targetNodeId: idMapping[conn.targetNodeId] || conn.targetNodeId,
 source: idMapping[conn.source || ''] || conn.source,
 target: idMapping[conn.target || ''] || conn.target,
 }));

 return { nodes, connections };
}

/**
 * Category display names
 */
export const categoryLabels: Record<WorkflowTemplate['category'], string> = {
 marketing: 'Marketing',
 analytics: 'Analytics',
 reporting: 'Reporting',
};

/**
 * Difficulty display configuration
 */
export const difficultyConfig: Record<WorkflowTemplate['difficulty'], { label: string; color: string }> = {
 beginner: { label: 'Beginner', color: 'text-green-600 bg-green-100 ' },
 intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-100 ' },
 advanced: { label: 'Advanced', color: 'text-red-600 bg-red-100 ' },
};
