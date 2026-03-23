import { NodeCategory } from '../types/workflow';

export interface NodeTypeDefinition {
  type: 'source' | 'transform' | 'destination';
  name: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  inputs: Array<{ id: string; name: string }>;
  outputs: Array<{ id: string; name: string }>;
  defaultData: Record<string, any>;
}

export const nodeTypes: NodeTypeDefinition[] = [
  {
    type: 'source',
    name: 'Facebook Ads',
    description: 'Import data from Facebook Ads platform',
    category: NodeCategory.SOURCE,
    icon: 'Facebook',
    color: '#3B82F6',
    inputs: [],
    outputs: [{ id: 'out', name: 'Output' }],
    defaultData: {
      accessToken: '',
      adAccountId: '',
      metrics: [],
      since: '',
      until: '',
      level: 'ad'
    }
  },
  {
    type: 'source',
    name: 'Google Ads',
    description: 'Import data from Google Ads platform',
    category: NodeCategory.SOURCE,
    icon: 'GoogleAds',
    color: '#3B82F6',
    inputs: [],
    outputs: [{ id: 'out', name: 'Output' }],
    defaultData: {
      accessToken: '',
      adAccountIds: [],
      fields: [],
      time_config: { time_preset: 'last_7_days', time_increment: 1 }
    }
  },
  {
    type: 'source',
    name: 'TikTok Ads',
    description: 'Import data from TikTok Ads platform',
    category: NodeCategory.SOURCE,
    icon: 'TikTok',
    color: '#3B82F6',
    inputs: [],
    outputs: [{ id: 'out', name: 'Output' }],
    defaultData: {
      connection_id: '',
      ad_account_id: [],
      fields: [],
      time_config: { time_preset: 'last_7_days', time_increment: 1 }
    }
  },
  {
    type: 'transform',
    name: 'SQL Transform',
    description: 'Transform data using SQL queries',
    category: NodeCategory.TRANSFORM,
    icon: 'Database',
    color: '#F59E0B',
    inputs: [{ id: 'in', name: 'Input' }],
    outputs: [{ id: 'out', name: 'Output' }],
    defaultData: {
      query: ''
    }
  },
  {
    type: 'transform',
    name: 'Join Tables',
    description: 'Join multiple data sources on a common key',
    category: NodeCategory.TRANSFORM,
    icon: 'Merge',
    color: '#F59E0B',
    inputs: [{ id: 'in', name: 'Input' }],
    outputs: [{ id: 'out', name: 'Output' }],
    defaultData: {
      base_node_id: 0,
      base_key: '',
      sources: [],
      suffixes: ['_x', '_y']
    }
  },
  {
    type: 'transform',
    name: 'Column Editor',
    description: 'Rename columns and change data types',
    category: NodeCategory.TRANSFORM,
    icon: 'Columns3',
    color: '#F59E0B',
    inputs: [{ id: 'in', name: 'Input' }],
    outputs: [{ id: 'out', name: 'Output' }],
    defaultData: {
      conversions: []
    }
  },
  {
    type: 'destination',
    name: 'MySQL',
    description: 'Export data to MySQL database',
    category: NodeCategory.DESTINATION,
    icon: 'MySQL',
    color: '#10B981',
    inputs: [{ id: 'in', name: 'Input' }],
    outputs: [],
    defaultData: {
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
      table: ''
    }
  },
  {
    type: 'destination',
    name: 'BigQuery',
    description: 'Export data to Google BigQuery',
    category: NodeCategory.DESTINATION,
    icon: 'BigQuery',
    color: '#10B981',
    inputs: [{ id: 'in', name: 'Input' }],
    outputs: [],
    defaultData: {
      projectId: '',
      dataset: '',
      table: '',
      location: 'US',
      insert_mode: 'append'
    }
  }
  ,
  {
    type: 'destination',
    name: 'Google Sheets',
    description: 'Export data to Google Sheets',
    category: NodeCategory.DESTINATION,
    icon: 'GoogleSheets',
    color: '#10B981',
    inputs: [{ id: 'in', name: 'Input' }],
    outputs: [],
    defaultData: {
      connection_id: '',
      spreadsheet_id: '',
      worksheet_name: '',
      range: '',
      insert_mode: 'append'
    }
  }
]; 