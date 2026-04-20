import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const GoogleSheetsEditor = lazy(() => import('@/nodes/Editors/destination/GoogleSheetsEditor'));

const LEGACY_INSERT_MODE_TO_ACTION: Record<string, string> = {
  append: 'overwrite',
  truncate: 'overwrite',
  overwrite: 'overwrite',
  upsert: 'overwrite',
};

function resolveAction(params: Record<string, unknown>): string {
  const action = params['action'];
  if (typeof action === 'string' && action) return action;
  const legacy = params['insert_mode'] ?? params['write_mode'] ?? params['writeMode'];
  if (typeof legacy === 'string' && legacy) {
    return LEGACY_INSERT_MODE_TO_ACTION[legacy.toLowerCase()] ?? 'append';
  }
  return 'append';
}

export const googleSheetsDestSpec: NodeSpec = {
  typeId: 'dest.googlesheets',
  displayName: 'Google Sheets',
  category: 'DESTINATION',
  icon: 'GoogleSheets',
  color: '#10B981',
  ports: [{ id: 'in', name: 'Input', io: 'input', dataType: 'records' }],
  defaults: {
    connection_id: '',
    action: 'append',
    spreadsheet_id: '',
    worksheet_name: '',
    new_spreadsheet_name: '',
    new_worksheet_name: 'Sheet1',
  },
  paramsSchema: z.object({ spreadsheet_id: z.string().default('') }),
  ui: { editor: GoogleSheetsEditor },
  adapters: {
    toBackend: (p) => ({
      node_id: 'google_sheet',
      node_type: 'destinations',
      parameters: {
        connection_id: p['connection_id'] || '',
        action: resolveAction(p),
        spreadsheet_id: p['spreadsheet_id'] || p['spreadsheetId'] || '',
        worksheet_name: p['worksheet_name'] || p['worksheet'] || '',
        new_spreadsheet_name: p['new_spreadsheet_name'] || '',
        new_worksheet_name: p['new_worksheet_name'] || 'Sheet1',
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'dest.googlesheets',
      params: {
        connection_id: parameters['connection_id'] || '',
        action: resolveAction(parameters),
        spreadsheet_id: parameters['spreadsheet_id'] || '',
        worksheet_name: parameters['worksheet_name'] || parameters['worksheet'] || '',
        new_spreadsheet_name: parameters['new_spreadsheet_name'] || '',
        new_worksheet_name: parameters['new_worksheet_name'] || 'Sheet1',
      },
    }),
  },
};
