import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const GoogleSheetsEditor = lazy(() => import('@/nodes/Editors/destination/GoogleSheetsEditor'));

export const googleSheetsDestSpec: NodeSpec = {
  typeId: 'dest.googlesheets',
  displayName: 'Google Sheets',
  category: 'DESTINATION',
  icon: 'GoogleSheets',
  color: '#0F9D58',
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
        connection_id: (p as any)['connection_id'] || '',
        spreadsheet_id: (p as any)['spreadsheet_id'] || (p as any)['spreadsheetId'] || '',
        worksheet_name: (p as any)['worksheet_name'] || (p as any)['worksheet'] || '',
        range: (p as any)['range'] || '',
        insert_mode: ((): string => {
          const im = (p as any)['insert_mode'];
          if (im) return String(im);
          const wm = (p as any)['write_mode'] || (p as any)['writeMode'];
          if (wm) return String(wm);
          return 'append';
        })(),
      }
    }),
    // Map backend params back to UI params
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'dest.googlesheets',
      params: {
        connection_id: (parameters as any).connection_id || '',
        spreadsheet_id: (parameters as any).spreadsheet_id || '',
        worksheet_name: (parameters as any).worksheet_name || (parameters as any).worksheet || '',
        range: (parameters as any).range || '',
        insert_mode: ((): string => {
          const im = (parameters as any).insert_mode;
          if (im) return im;
          const wm = (parameters as any).write_mode || (parameters as any).writeMode;
          if (wm) return wm;
          return 'append';
        })(),
      }
    })
  }
};


