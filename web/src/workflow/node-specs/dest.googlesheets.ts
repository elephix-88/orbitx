import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const GoogleSheetsEditor = lazy(() => import('@/nodes/Editors/destination/GoogleSheetsEditor'));

export const googleSheetsDestSpec: NodeSpec = {
  typeId: 'dest.googlesheets',
  displayName: 'Google Sheets',
  category: 'DESTINATION',
  icon: 'GoogleSheets',
  color: '#10B981',
  ports: [{ id: 'in', name: 'Input', io: 'input', dataType: 'records' }],
  defaults: { connection_id: '', spreadsheet_id: '', worksheet_name: '', range: '', insert_mode: 'append' },
  paramsSchema: z.object({ spreadsheet_id: z.string().default('') }),
  ui: { editor: GoogleSheetsEditor },
  adapters: {
    // Map UI params to backend expected payload
    toBackend: (p) => ({
      node_id: 'google_sheet',
      node_type: 'destinations',
      parameters: {
        connection_id: p['connection_id'] || '',
        spreadsheet_id: p['spreadsheet_id'] || p['spreadsheetId'] || '',
        worksheet_name: p['worksheet_name'] || p['worksheet'] || '',
        range: p['range'] || '',
        insert_mode: ((): string => {
          const im = p['insert_mode'];
          if (im) return String(im);
          const wm = p['write_mode'] || p['writeMode'];
          if (wm) return String(wm);
          return 'append';
        })(),
      }
    }),
    // Map backend params back to UI params
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'dest.googlesheets',
      params: {
        connection_id: parameters['connection_id'] || '',
        spreadsheet_id: parameters['spreadsheet_id'] || '',
        worksheet_name: parameters['worksheet_name'] || parameters['worksheet'] || '',
        range: parameters['range'] || '',
        insert_mode: ((): string => {
          const im = parameters['insert_mode'];
          if (im) return String(im);
          const wm = parameters['write_mode'] || parameters['writeMode'];
          if (wm) return String(wm);
          return 'append';
        })(),
      }
    })
  }
};


