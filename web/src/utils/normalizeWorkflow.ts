import { WorkflowConnection, WorkflowNode, WorkflowStatus } from '../types/workflow';
import { getNodeSpec, getNodeSpecByDisplayName } from '@/workflow/registry';

type StrictNodeType = 'source' | 'transform' | 'destinations';

export interface StrictWorkflowNode {
  uid?: string;
  node_instance_id?: number;
  node_id: string;
  node_type: StrictNodeType;
  parameters: Record<string, unknown>;
  /** Display name for the node (e.g., "Facebook Ads - Age") */
  display_name?: string;
}

interface TimeConfig {
  time_preset: string;
  time_increment: number;
}

export interface StrictWorkflowData {
  _id?: { $oid: string };
  workflow_id: string;
  job_id: string;
  job_name: string;
  application_name: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  schedule_expression: string;
  environment_tag: string;
  execution_mode: 'sequential' | 'parallel' | string;
  user_id: string;
  project_id: string;
  resources: {
    memory_allocation: number;
    cpu_cores: number;
  };
  nodes: StrictWorkflowNode[];
  connections?: Array<{ from_node: number; to_node: number }>;
}

interface OriginalWorkflow {
  _id?: string | { $oid: string };
  workflow_id?: string;
  job_id?: string;
  job_name?: string;
  application_name?: string;
  name?: string;
  description?: string;
  status?: WorkflowStatus | string;
  created_at?: string;
  updated_at?: string;
  schedule_expression?: string;
  environment_tag?: string;
  execution_mode?: string;
  user_id?: string;
  project_id?: string;
  resources?: {
    memory_allocation?: number;
    cpu_cores?: number;
  };
  nodes?: OriginalNode[];
}

interface OriginalNode {
  node_id: string;
  node_type?: string;
  parameters?: Record<string, unknown>;
}

interface RawFacebookParams {
  ad_account_id?: string[];
  adAccountId?: string[];
  connection_id?: string;
  token_id?: string;
  accessToken?: string;
  fields?: string[];
  selectedFields?: string[];
  time_config?: TimeConfig;
  timeIncrement?: number;
}

interface RawSqlParams {
  table_name?: string;
  tableName?: string;
  sql_query?: string;
  query?: string;
}

function coerceString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function coerceStringArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string') as string[];
  }
  return fallback;
}

function normalizeFacebookParameters(raw: RawFacebookParams): Record<string, unknown> {
  const adAccountId = coerceStringArray(
    raw.ad_account_id ?? raw.adAccountId ?? []
  ).filter(id => id && id.trim() !== '');
  
  const connectionId = coerceString(
    raw.connection_id ?? raw.token_id ?? raw.accessToken, ''
  );
  
  const fields = coerceStringArray(
    raw.fields ?? raw.selectedFields, []
  );

  let time_config: TimeConfig = { time_preset: 'last_7_days', time_increment: 1 };
  if (raw.time_config && typeof raw.time_config === 'object') {
    time_config = raw.time_config;
  } else if (typeof raw.timeIncrement === 'number') {
    time_config = { time_preset: 'last_7_days', time_increment: raw.timeIncrement };
  }

  return {
    ad_account_id: adAccountId,
    connection_id: connectionId,
    fields,
    time_config,
  };
}

export function normalizeWorkflowPayload(
  original: OriginalWorkflow | null | undefined,
  uiNodes: WorkflowNode[],
  uiConnections?: WorkflowConnection[]
): StrictWorkflowData {
  const originalNodes: OriginalNode[] = Array.isArray(original?.nodes) ? original.nodes : [];
  const originalByType: Record<string, OriginalNode[]> = {};
  for (const on of originalNodes) {
    const arr = originalByType[on.node_id] || [];
    arr.push(on);
    originalByType[on.node_id] = arr;
  }
  const occurrenceCounter: Record<string, number> = {};
  const backendNodeIdByUiId = new Map<string, string>();
  const backendUidByUiId = new Map<string, string>();
  const uiIdToInstanceId = new Map<string, number>();
  uiNodes.forEach((n, idx) => uiIdToInstanceId.set(n.id, idx + 1));

  const nodes: StrictWorkflowNode[] = uiNodes.map((n) => {
    // Use definitionId first (more reliable), fallback to name lookup
    const spec = n.definitionId ? getNodeSpec(n.definitionId) : getNodeSpecByDisplayName(n.name);
    const fallbackNodeType: StrictNodeType = (n.type === 'destination' ? 'destinations' : n.type === 'transform' ? 'transform' : 'source') as StrictNodeType;
    const rawParams: Record<string, unknown> = (n.data || {}) as Record<string, unknown>;

    if (spec) {
      const adapted = spec.adapters.toBackend(rawParams);
      backendNodeIdByUiId.set(n.id, adapted.node_id);
      let parameters = adapted.parameters as Record<string, unknown>;
      
      if (adapted.node_id === 'sql') {
        const sqlParams = rawParams as RawSqlParams;
        parameters = {
          table_name: sqlParams.table_name || sqlParams.tableName || '',
          sql_query: sqlParams.sql_query || sqlParams.query || '',
        };
      }
      const uid = n.id;
      backendUidByUiId.set(n.id, uid);
      const nodeOccurrence = ((occurrenceCounter[adapted.node_id] || 0) + 1);
      occurrenceCounter[adapted.node_id] = nodeOccurrence;

      if (adapted.node_id === 'sql') {
        const p = parameters as RawSqlParams;
        if ((!p.sql_query || String(p.sql_query).trim() === '') || (!p.table_name)) {
          const origArr = originalByType['sql'] || [];
          const orig = (origArr[nodeOccurrence - 1]?.parameters || {}) as RawSqlParams;
          const nodeData = n.data as RawSqlParams | undefined;
          parameters = {
            table_name: p.table_name || nodeData?.table_name || orig.table_name || '',
            sql_query: p.sql_query || nodeData?.sql_query || nodeData?.query || orig.sql_query || orig.query || '',
          };
        }
      }

      if (adapted.node_id === 'bigquery' || adapted.node_id === 'google_sheet') {
        const p = parameters as { connection_id?: string };
        const origArr = originalByType[adapted.node_id] || [];
        const orig = (origArr[nodeOccurrence - 1]?.parameters || {}) as { connection_id?: string };
        const currentCid = String(p.connection_id || '');
        const origCid = String(orig.connection_id || '');
        const looksMongo = (s: string) => /^[a-fA-F0-9]{24}$/.test(s);
        if (looksMongo(origCid) && !looksMongo(currentCid)) {
          p.connection_id = origCid;
        }
        parameters = p as Record<string, unknown>;
      }

      return {
        uid,
        node_instance_id: uiIdToInstanceId.get(n.id),
        node_id: adapted.node_id,
        node_type: adapted.node_type as StrictNodeType,
        parameters,
        display_name: n.display_name || undefined, // Persist the alias
      };
    }

    let parameters: Record<string, unknown> = rawParams;
    if (n.name === 'Facebook Ads') {
      parameters = normalizeFacebookParameters(rawParams as RawFacebookParams);
    }
    backendNodeIdByUiId.set(n.id, n.id);
    const uid = n.id;
    backendUidByUiId.set(n.id, uid);
    const nodeOccurrence = ((occurrenceCounter[n.id] || 0) + 1);
    occurrenceCounter[n.id] = nodeOccurrence;
    
    if (n.id === 'sql') {
      const origArr = originalByType['sql'] || [];
      const orig = (origArr[nodeOccurrence - 1]?.parameters || {}) as RawSqlParams;
      const sqlParams = rawParams as RawSqlParams;
      parameters = {
        table_name: sqlParams.table_name || orig.table_name || '',
        sql_query: sqlParams.sql_query || sqlParams.query || orig.sql_query || orig.query || '',
      };
    }
    return {
      uid,
      node_instance_id: uiIdToInstanceId.get(n.id),
      node_id: n.id,
      node_type: fallbackNodeType,
      parameters,
      display_name: n.display_name || undefined, // Persist the alias
    };
  });

  let connectionList: Array<{ from_node: number; to_node: number }> | undefined = undefined;
  if (uiConnections && uiConnections.length) {
    connectionList = [];
    for (const c of uiConnections) {
      const fromId = uiIdToInstanceId.get(c.sourceNodeId);
      const toId = uiIdToInstanceId.get(c.targetNodeId);
      if (fromId && toId) connectionList.push({ from_node: fromId, to_node: toId });
    }
  }

  const wf: StrictWorkflowData = {
    workflow_id: coerceString(original?.workflow_id),
    job_id: coerceString(original?.job_id),
    job_name: coerceString(original?.job_name),
    application_name: coerceString(original?.application_name),
    name: coerceString(original?.name ?? original?.job_name),
    description: coerceString(original?.description ?? ''),
    status: (original?.status as WorkflowStatus) ?? WorkflowStatus.ACTIVE,
    created_at: coerceString(original?.created_at ?? new Date().toISOString()),
    updated_at: coerceString(original?.updated_at ?? new Date().toISOString()),
    schedule_expression: coerceString(original?.schedule_expression ?? '0 0 * * *'),
    environment_tag: coerceString(original?.environment_tag ?? 'production'),
    execution_mode: coerceString(original?.execution_mode ?? 'sequential'),
    user_id: coerceString(original?.user_id ?? ''),
    project_id: coerceString(original?.project_id),
    resources: {
      memory_allocation: typeof original?.resources?.memory_allocation === 'number' ? original.resources.memory_allocation : 2048,
      cpu_cores: typeof original?.resources?.cpu_cores === 'number' ? original.resources.cpu_cores : 1,
    },
    nodes,
    ...(connectionList ? { connections: connectionList } : {}),
  };

  if (original?._id) {
    // Handle both string and object _id formats
    if (typeof original._id === 'string') {
      wf._id = { $oid: original._id };
    } else {
      wf._id = original._id;
    }
  }

  return wf;
}
