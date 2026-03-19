// =============================================================================
// Workflow Templates
// =============================================================================
// Pre-configured workflow templates for common marketing data pipelines.
// These help new users get started quickly with proven patterns.

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
// Helper Functions
// =============================================================================

const createNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// =============================================================================
// Templates
// =============================================================================

export const workflowTemplates: WorkflowTemplate[] = [
  // Template 1: Facebook Ads → BigQuery (Marketing Analytics)
  {
    id: 'facebook-ads-to-bigquery',
    name: 'Facebook Ads to BigQuery',
    description: 'Export Facebook Ads campaign data to BigQuery for advanced analytics and reporting dashboards.',
    category: 'marketing',
    icon: 'Facebook',
    difficulty: 'beginner',
    estimatedSetupTime: '5-10 min',
    sources: ['Facebook Ads'],
    destinations: ['BigQuery'],
    nodes: [
      {
        id: 'fb_source_1',
        type: 'source',
        name: 'Facebook Ads',
        definitionId: 'facebook.ads',
        position: { x: 60, y: 100 },
        data: {
          connection_id: '',
          ad_account_id: [],
          fields: ['campaign_name', 'adset_name', 'ad_name', 'spend', 'impressions', 'clicks', 'conversions'],
          time_config: { time_preset: 'last_7_days', time_increment: 1 },
        },
        inputs: [],
        outputs: [{ id: 'out', name: 'Output', type: 'records' }],
      },
      {
        id: 'bq_dest_1',
        type: 'destination',
        name: 'BigQuery',
        definitionId: 'dest.bigquery',
        position: { x: 380, y: 100 },
        data: {
          connection_id: '',
          project_id: '',
          dataset: '',
          table: 'facebook_ads_data',
          write_mode: 'append',
        },
        inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
        outputs: [],
      },
    ],
    connections: [
      {
        id: 'conn_fb_bq_1',
        sourceNodeId: 'fb_source_1',
        targetNodeId: 'bq_dest_1',
        sourceOutputId: 'out',
        targetInputId: 'in',
        source: 'fb_source_1',
        target: 'bq_dest_1',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ],
    setupTips: [
      'Connect your Facebook Ads account first',
      'Select the ad accounts you want to pull data from',
      'Choose the metrics that matter for your reporting',
      'Make sure you have a BigQuery project and dataset ready',
    ],
  },

  // Template 2: Google Ads → Google Sheets (Simple Reporting)
  {
    id: 'google-ads-to-sheets',
    name: 'Google Ads to Sheets',
    description: 'Export Google Ads performance data directly to Google Sheets for easy sharing and collaboration.',
    category: 'reporting',
    icon: 'BarChart3',
    difficulty: 'beginner',
    estimatedSetupTime: '5 min',
    sources: ['Google Ads'],
    destinations: ['Google Sheets'],
    nodes: [
      {
        id: 'gads_source_1',
        type: 'source',
        name: 'Google Ads',
        definitionId: 'google.ads',
        position: { x: 60, y: 100 },
        data: {
          connection_id: '',
          customer_id: '',
          fields: ['campaign_name', 'ad_group_name', 'cost_micros', 'impressions', 'clicks', 'conversions'],
          time_config: { time_preset: 'last_7_days' },
        },
        inputs: [],
        outputs: [{ id: 'out', name: 'Output', type: 'records' }],
      },
      {
        id: 'sheets_dest_1',
        type: 'destination',
        name: 'Google Sheets',
        definitionId: 'dest.googlesheets',
        position: { x: 380, y: 100 },
        data: {
          connection_id: '',
          spreadsheet_id: '',
          sheet_name: 'Google Ads Data',
          write_mode: 'replace',
        },
        inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
        outputs: [],
      },
    ],
    connections: [
      {
        id: 'conn_gads_sheets_1',
        sourceNodeId: 'gads_source_1',
        targetNodeId: 'sheets_dest_1',
        sourceOutputId: 'out',
        targetInputId: 'in',
        source: 'gads_source_1',
        target: 'sheets_dest_1',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ],
    setupTips: [
      'Connect your Google account for both Google Ads and Sheets',
      'Select your Google Ads customer ID',
      'Create a new spreadsheet or use an existing one',
      'The sheet will be updated each time the workflow runs',
    ],
  },

  // Template 3: Multi-Source Marketing Data to BigQuery
  {
    id: 'multi-source-to-bigquery',
    name: 'Multi-Source Marketing',
    description: 'Combine data from Facebook Ads and Google Ads into BigQuery for unified marketing analytics.',
    category: 'analytics',
    icon: 'Merge',
    difficulty: 'intermediate',
    estimatedSetupTime: '15-20 min',
    sources: ['Facebook Ads', 'Google Ads'],
    destinations: ['BigQuery'],
    nodes: [
      {
        id: 'fb_source_multi',
        type: 'source',
        name: 'Facebook Ads',
        definitionId: 'facebook.ads',
        position: { x: 60, y: 60 },
        data: {
          connection_id: '',
          ad_account_id: [],
          fields: ['campaign_name', 'spend', 'impressions', 'clicks', 'conversions'],
          time_config: { time_preset: 'last_7_days', time_increment: 1 },
        },
        inputs: [],
        outputs: [{ id: 'out', name: 'Output', type: 'records' }],
      },
      {
        id: 'gads_source_multi',
        type: 'source',
        name: 'Google Ads',
        definitionId: 'google.ads',
        position: { x: 60, y: 200 },
        data: {
          connection_id: '',
          customer_id: '',
          fields: ['campaign_name', 'cost_micros', 'impressions', 'clicks', 'conversions'],
          time_config: { time_preset: 'last_7_days' },
        },
        inputs: [],
        outputs: [{ id: 'out', name: 'Output', type: 'records' }],
      },
      {
        id: 'bq_dest_fb',
        type: 'destination',
        name: 'BigQuery',
        definitionId: 'dest.bigquery',
        position: { x: 380, y: 60 },
        data: {
          connection_id: '',
          project_id: '',
          dataset: '',
          table: 'facebook_ads_data',
          write_mode: 'append',
        },
        inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
        outputs: [],
      },
      {
        id: 'bq_dest_gads',
        type: 'destination',
        name: 'BigQuery',
        definitionId: 'dest.bigquery',
        position: { x: 380, y: 200 },
        data: {
          connection_id: '',
          project_id: '',
          dataset: '',
          table: 'google_ads_data',
          write_mode: 'append',
        },
        inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
        outputs: [],
      },
    ],
    connections: [
      {
        id: 'conn_fb_bq_multi',
        sourceNodeId: 'fb_source_multi',
        targetNodeId: 'bq_dest_fb',
        sourceOutputId: 'out',
        targetInputId: 'in',
        source: 'fb_source_multi',
        target: 'bq_dest_fb',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
      {
        id: 'conn_gads_bq_multi',
        sourceNodeId: 'gads_source_multi',
        targetNodeId: 'bq_dest_gads',
        sourceOutputId: 'out',
        targetInputId: 'in',
        source: 'gads_source_multi',
        target: 'bq_dest_gads',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ],
    setupTips: [
      'Connect both Facebook Ads and Google accounts',
      'Configure each source with the accounts you want to track',
      'Data will be stored in separate BigQuery tables',
      'Use BigQuery to join and analyze data across platforms',
    ],
  },

  // Template 4: Facebook Ads → MySQL (Database Storage)
  {
    id: 'facebook-ads-to-mysql',
    name: 'Facebook Ads to MySQL',
    description: 'Store Facebook Ads data in your MySQL database for integration with existing systems.',
    category: 'analytics',
    icon: 'Database',
    difficulty: 'intermediate',
    estimatedSetupTime: '10 min',
    sources: ['Facebook Ads'],
    destinations: ['MySQL'],
    nodes: [
      {
        id: 'fb_source_mysql',
        type: 'source',
        name: 'Facebook Ads',
        definitionId: 'facebook.ads',
        position: { x: 60, y: 100 },
        data: {
          connection_id: '',
          ad_account_id: [],
          fields: ['campaign_name', 'adset_name', 'ad_name', 'spend', 'impressions', 'clicks', 'conversions', 'date_start', 'date_stop'],
          time_config: { time_preset: 'last_7_days', time_increment: 1 },
        },
        inputs: [],
        outputs: [{ id: 'out', name: 'Output', type: 'records' }],
      },
      {
        id: 'mysql_dest_1',
        type: 'destination',
        name: 'MySQL',
        definitionId: 'dest.mysql',
        position: { x: 380, y: 100 },
        data: {
          connection_id: '',
          database: '',
          table: 'facebook_ads',
          write_mode: 'append',
        },
        inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
        outputs: [],
      },
    ],
    connections: [
      {
        id: 'conn_fb_mysql_1',
        sourceNodeId: 'fb_source_mysql',
        targetNodeId: 'mysql_dest_1',
        sourceOutputId: 'out',
        targetInputId: 'in',
        source: 'fb_source_mysql',
        target: 'mysql_dest_1',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ],
    setupTips: [
      'Make sure your MySQL server is accessible',
      'Create the target database before running',
      'The table will be created automatically if it doesn\'t exist',
      'Use append mode for historical data tracking',
    ],
  },

  // Template 5: Google Ads → BigQuery (Enterprise Analytics)
  {
    id: 'google-ads-to-bigquery',
    name: 'Google Ads to BigQuery',
    description: 'Sync Google Ads campaign performance data to BigQuery for large-scale analytics.',
    category: 'analytics',
    icon: 'TrendingUp',
    difficulty: 'beginner',
    estimatedSetupTime: '5-10 min',
    sources: ['Google Ads'],
    destinations: ['BigQuery'],
    nodes: [
      {
        id: 'gads_source_bq',
        type: 'source',
        name: 'Google Ads',
        definitionId: 'google.ads',
        position: { x: 60, y: 100 },
        data: {
          connection_id: '',
          customer_id: '',
          fields: ['campaign_name', 'ad_group_name', 'cost_micros', 'impressions', 'clicks', 'conversions', 'ctr', 'average_cpc'],
          time_config: { time_preset: 'last_30_days' },
        },
        inputs: [],
        outputs: [{ id: 'out', name: 'Output', type: 'records' }],
      },
      {
        id: 'bq_dest_gads',
        type: 'destination',
        name: 'BigQuery',
        definitionId: 'dest.bigquery',
        position: { x: 380, y: 100 },
        data: {
          connection_id: '',
          project_id: '',
          dataset: '',
          table: 'google_ads_performance',
          write_mode: 'append',
        },
        inputs: [{ id: 'in', name: 'Input', type: 'records', required: true }],
        outputs: [],
      },
    ],
    connections: [
      {
        id: 'conn_gads_bq_1',
        sourceNodeId: 'gads_source_bq',
        targetNodeId: 'bq_dest_gads',
        sourceOutputId: 'out',
        targetInputId: 'in',
        source: 'gads_source_bq',
        target: 'bq_dest_gads',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ],
    setupTips: [
      'Connect your Google account with Ads access',
      'Find your Google Ads customer ID in the Ads dashboard',
      'BigQuery is ideal for large-scale analytics',
      'Schedule daily runs for up-to-date reporting',
    ],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

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
 * Convert a template to a new workflow with unique node IDs
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
  beginner: { label: 'Beginner', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  advanced: { label: 'Advanced', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
};
