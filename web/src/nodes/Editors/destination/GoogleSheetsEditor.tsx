import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Select } from '@/components/shared/form/Select';
import { Input } from '@/components/shared/form/Input';
import { Settings, Table as TableIcon, RefreshCw, ExternalLink } from 'lucide-react';
import { GoogleSheetsIcon } from '@/components/icons/BrandIcons';
import { fetchClient } from '@/lib/fetchClient';
import { useNodeDataCache } from '@/store/nodeDataCache';
import { prefetchConnections } from '@/services/nodeDataPrefetch';

// Types
interface GoogleSheetsFormData {
 connection_id: string;
 spreadsheet_id: string;
 worksheet_name: string;
 worksheet_id: string;
 range: string;
 insert_mode: string;
}

interface GoogleSheetsNodeData {
 connection_id?: string;
 spreadsheet_id?: string;
 spreadsheetId?: string;
 worksheet_name?: string;
 worksheet?: string;
 worksheet_id?: string;
 range?: string;
 insert_mode?: string;
 write_mode?: string;
 writeMode?: string;
}

interface GoogleSheetsEditorProps {
 nodeId?: string;
 data: GoogleSheetsNodeData;
 onChange: (data: GoogleSheetsFormData) => void;
 onClose: () => void;
 onValidate?: (valid: boolean, errors: string[]) => void;
 /** When true, renders only the form without BaseEditorWrapper */
 compact?: boolean;
}

interface ConnectionOption {
 id: string;
 name: string;
}

interface GoogleSheetsFile {
 id: string;
 name: string;
 web_view_link: string;
 created_time?: string;
 modified_time?: string;
 mime_type: string;
}

interface GoogleSheetsWorksheet {
 sheet_id: number;
 title: string;
 index: number;
 sheet_type: string;
 grid_properties?: {
 rowCount?: number;
 columnCount?: number;
 };
}

interface GoogleSheetsSpreadsheet {
 spreadsheet_id: string;
 name: string;
 spreadsheet_url: string;
 created_time?: string;
 modified_time?: string;
 worksheets: GoogleSheetsWorksheet[];
}

const GoogleSheetsEditor: React.FC<GoogleSheetsEditorProps> = ({ data, onChange, onClose, onValidate, compact = false }) => {
 // Cache store
 const cache = useNodeDataCache();
 const cachedConnections = cache.connections;

 // Track if initial data has been loaded to prevent re-sync loops
 const initializedRef = useRef(false);

 const [formData, setFormData] = useState<GoogleSheetsFormData>({
 connection_id: data?.connection_id || '',
 spreadsheet_id: data?.spreadsheet_id || data?.spreadsheetId || '',
 worksheet_name: data?.worksheet_name || data?.worksheet || '',
 worksheet_id: data?.worksheet_id || '',
 range: data?.range || '',
 insert_mode: data?.insert_mode || data?.write_mode || data?.writeMode || 'append',
 });

 const [connections, setConnections] = useState<ConnectionOption[]>([]);
 const [connectionsLoading, setConnectionsLoading] = useState(true);
 const [connectionsReady, setConnectionsReady] = useState(false);

 const [spreadsheets, setSpreadsheets] = useState<GoogleSheetsFile[]>([]);
 const [spreadsheetsLoading, setSpreadsheetsLoading] = useState(false);
 const [worksheets, setWorksheets] = useState<GoogleSheetsWorksheet[]>([]);
 const [worksheetsLoading, setWorksheetsLoading] = useState(false);
 const [spreadsheetsError, setSpreadsheetsError] = useState<string | null>(null);

 // Sync connections from cache - only update connections list, not formData
 useEffect(() => {
 if (cachedConnections?.data) {
 const gsConnections = cachedConnections.data
 .filter(c => {
 const serviceName = c.service_name?.toLowerCase() || '';
 return serviceName.includes('googlesheet') || serviceName.includes('google_sheet');
 })
 .map(c => ({ id: c.id, name: c.name }));
 setConnections(gsConnections);
 setConnectionsLoading(cachedConnections.isLoading);
 }
 }, [cachedConnections]);

 // Validate connection_id against loaded connections, clear stale ones
 useEffect(() => {
 if (connections.length === 0 && !connectionsLoading) {
 setConnectionsReady(true);
 return;
 }
 if (connections.length === 0) return;
 const currentValid = connections.some(c => c.id === formData.connection_id);
 if (!currentValid) {
 const nextId = connections.length === 1 ? connections[0].id : '';
 setFormData((prev) => ({ ...prev, connection_id: nextId }));
 }
 setConnectionsReady(true);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [connections, connectionsLoading]);

 // Load connections on mount - use cache first
 useEffect(() => {
 if (!cachedConnections?.data || cachedConnections.data.length === 0) {
 prefetchConnections();
 }
 }, []);

 const loadSpreadsheets = useCallback(async () => {
 if (!formData.connection_id) return;
 
 setSpreadsheetsLoading(true);
 setSpreadsheetsError(null);
 try {
 // Use fetchClient - handles auth headers automatically
 const resp = await fetchClient(
 `/api/google/sheets/spreadsheets?connection_id=${encodeURIComponent(formData.connection_id)}`
 );

 if (!resp.ok) {
 throw new Error(`Failed to load spreadsheets: ${resp.statusText}`);
 }

 const sheets = await resp.json();
 const arr: GoogleSheetsFile[] = Array.isArray(sheets) ? sheets : [];
 setSpreadsheets(arr);

 if (!formData.spreadsheet_id && arr.length === 1) {
 setFormData((prev) => ({ 
 ...prev, 
 spreadsheet_id: arr[0].id,
 worksheet_name: '',
 worksheet_id: ''
 }));
 }
 } catch (error) {
 setSpreadsheetsError(error instanceof Error ? error.message : 'Failed to load spreadsheets');
 setSpreadsheets([]);
 } finally {
 setSpreadsheetsLoading(false);
 }
 }, [formData.connection_id, formData.spreadsheet_id]);

 const loadWorksheets = useCallback(async () => {
 if (!formData.connection_id || !formData.spreadsheet_id) return;
 
 setWorksheetsLoading(true);
 try {
 // Use fetchClient - handles auth headers automatically
 const resp = await fetchClient(
 `/api/google/sheets/spreadsheets/${encodeURIComponent(formData.spreadsheet_id)}?connection_id=${encodeURIComponent(formData.connection_id)}`
 );

 if (!resp.ok) {
 throw new Error(`Failed to load worksheets: ${resp.statusText}`);
 }

 const spreadsheetDetails: GoogleSheetsSpreadsheet = await resp.json();
 setWorksheets(spreadsheetDetails.worksheets || []);

 if (!formData.worksheet_name && spreadsheetDetails.worksheets.length === 1) {
 const firstWorksheet = spreadsheetDetails.worksheets[0];
 setFormData((prev) => ({ 
 ...prev, 
 worksheet_name: firstWorksheet.title,
 worksheet_id: firstWorksheet.sheet_id.toString()
 }));
 }
 } catch (error) {
 console.error('Error loading worksheets:', error);
 setWorksheets([]);
 } finally {
 setWorksheetsLoading(false);
 }
 }, [formData.connection_id, formData.spreadsheet_id, formData.worksheet_name]);

 // Only sync from props on initial mount or when data.connection_id changes externally
 useEffect(() => {
 if (!initializedRef.current) {
 initializedRef.current = true;
 return;
 }
 // Only update if connection_id from props is different and non-empty
 if (data?.connection_id && data.connection_id !== formData.connection_id) {
 setFormData((prev) => ({
 ...prev,
 connection_id: data?.connection_id || prev.connection_id,
 spreadsheet_id: data?.spreadsheet_id || data?.spreadsheetId || prev.spreadsheet_id,
 worksheet_name: data?.worksheet_name || data?.worksheet || prev.worksheet_name,
 worksheet_id: data?.worksheet_id || prev.worksheet_id,
 range: data?.range ?? prev.range,
 insert_mode: data?.insert_mode || data?.write_mode || data?.writeMode || prev.insert_mode,
 }));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [data?.connection_id]);

 useEffect(() => {
 if (!connectionsReady || !formData.connection_id) {
 setSpreadsheets([]);
 setWorksheets([]);
 return;
 }
 loadSpreadsheets();
 }, [connectionsReady, formData.connection_id, loadSpreadsheets]);

 useEffect(() => {
 if (!connectionsReady || !formData.connection_id || !formData.spreadsheet_id) {
 setWorksheets([]);
 return;
 }
 loadWorksheets();
 }, [connectionsReady, formData.connection_id, formData.spreadsheet_id, loadWorksheets]);

 const handleChange = (updates: Partial<GoogleSheetsFormData>) => {
 setFormData((prev) => ({ ...prev, ...updates }));
 };

 const canonical = (d: GoogleSheetsFormData | GoogleSheetsNodeData): GoogleSheetsFormData => ({
 connection_id: d?.connection_id || '',
 spreadsheet_id: (d as GoogleSheetsFormData)?.spreadsheet_id || (d as GoogleSheetsNodeData)?.spreadsheetId || '',
 worksheet_name: (d as GoogleSheetsFormData)?.worksheet_name || (d as GoogleSheetsNodeData)?.worksheet || '',
 worksheet_id: d?.worksheet_id || '',
 range: d?.range || '',
 insert_mode: ((): string => {
 const form = d as GoogleSheetsFormData;
 const node = d as GoogleSheetsNodeData;
 if (form?.insert_mode) return form.insert_mode;
 if (node?.write_mode) return node.write_mode;
 if (node?.writeMode) return node.writeMode;
 return 'append';
 })(),
 });

 // Memoize canonical form data to prevent unnecessary recalculations
 const canonicalFormData = useMemo(() => canonical(formData), [formData]);

 // Calculate validation - memoize both isValid and errors together for consistency
 const { isValid, validationErrors } = useMemo(() => {
 const errors: string[] = [];
 if (!canonicalFormData.connection_id.trim()) errors.push('Please select a connection');
 if (!canonicalFormData.spreadsheet_id.trim()) errors.push('Please select a spreadsheet');
 if (!canonicalFormData.worksheet_name.trim()) errors.push('Please select a worksheet');
 return { isValid: errors.length === 0, validationErrors: errors };
 }, [canonicalFormData]);

 // Notify parent of validation changes - use ref to avoid onValidate in deps
 const onValidateRef = useRef(onValidate);
 onValidateRef.current = onValidate;

 // Track previous validation to avoid unnecessary calls
 const prevValidationRef = useRef<{ isValid: boolean; errorCount: number } | null>(null);

 useEffect(() => {
 // Only call onValidate if validation state actually changed
 const currentValidation = { isValid, errorCount: validationErrors.length };
 if (
 onValidateRef.current &&
 (!prevValidationRef.current ||
 prevValidationRef.current.isValid !== currentValidation.isValid ||
 prevValidationRef.current.errorCount !== currentValidation.errorCount)
 ) {
 prevValidationRef.current = currentValidation;
 onValidateRef.current(isValid, validationErrors);
 }
 }, [isValid, validationErrors]);

 // In compact mode, propagate changes immediately - use ref to avoid onChange in deps
 const onChangeRef = useRef(onChange);
 onChangeRef.current = onChange;

 // Track if we've done initial mount to avoid propagating on first render
 const hasMountedRef = useRef(false);

 useEffect(() => {
 // Skip the first render to avoid overwriting parent data with empty form
 if (!hasMountedRef.current) {
 hasMountedRef.current = true;
 return;
 }
 if (compact && onChangeRef.current) {
 onChangeRef.current(canonicalFormData);
 }
 }, [compact, canonicalFormData]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!isValid) return;
 onChange(canonical(formData));
 onClose();
 };

 // Form content - shared between compact and full mode
 const formContent = (
 <div className="space-y-4 sm:space-y-6">
 {/* Connection */}
 <div className="space-y-3 sm:space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-primary/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-primary/10 text-blue-primary ">
 <Settings className="w-4 h-4" />
 </div>
 <div>
 <h3 className="text-sm font-semibold text-primary">Connection</h3>
 <p className="text-xs text-secondary">Select your Google Sheets connection</p>
 </div>
 </div>
 {formData.connection_id && (
 <div className="sm:ml-auto">
 <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success-bg text-success text-xs font-medium">
 <ExternalLink className="w-3 h-3" />
 Connected
 </div>
 </div>
 )}
 </div>
 
 <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
 <div className="flex-1 min-w-0">
 <Select
 value={formData.connection_id || ''}
 onChange={(val) => handleChange({ connection_id: String(val || '') })}
 options={
 connectionsLoading
 ? []
 : connections.map((c) => ({ value: c.id, label: c.name }))
 }
 placeholder={connectionsLoading ? 'Loading connections...' : 'Choose a Google Sheets connection'}
 />
 </div>
 <div className="flex-shrink-0">
 <a 
 href="/connections" 
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-primary hover:text-blue-primary hover:bg-blue-soft rounded-lg transition-colors border border-blue-border whitespace-nowrap h-10"
 title="Manage connections"
 >
 <ExternalLink className="w-3 h-3" />
 <span className="hidden sm:inline">Manage</span>
 </a>
 </div>
 </div>
 
 {(!connectionsLoading && connections.length === 0) && (
 <div className="p-3 rounded-lg bg-warning-bg border border-warning/20">
 <p className="text-sm text-warning">
 No Google Sheets connections found. Please create one in the Connections page.
 </p>
 </div>
 )}
 </div>

 {/* Spreadsheet Selection */}
 <div className="space-y-3 sm:space-y-4">
 <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-primary/20">
 <div className="p-2 rounded-lg bg-success-bg text-success">
 <TableIcon className="w-4 h-4" />
 </div>
 <div>
 <h3 className="text-sm font-semibold text-primary">Spreadsheet & Worksheet</h3>
 <p className="text-xs text-secondary">Choose the target spreadsheet and worksheet</p>
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="flex-1">
 <Select
 label="Spreadsheet"
 value={formData.spreadsheet_id || ''}
 onChange={(val) => handleChange({ 
 spreadsheet_id: String(val || ''), 
 worksheet_name: '',
 worksheet_id: ''
 })}
 options={
 spreadsheetsLoading
 ? []
 : spreadsheets.map((s) => ({ 
 value: s.id, 
 label: s.name 
 }))
 }
 placeholder={
 !formData.connection_id 
 ? 'Select a connection first'
 : spreadsheetsLoading 
 ? 'Loading spreadsheets...' 
 : spreadsheets.length === 0
 ? 'No spreadsheets found'
 : 'Select a spreadsheet'
 }
 disabled={!formData.connection_id || spreadsheetsLoading}
 />
 </div>
 {formData.connection_id && (
 <button
 type="button"
 onClick={loadSpreadsheets}
 disabled={spreadsheetsLoading}
 className="p-2 text-blue-primary hover:text-blue-800 disabled:text-gray-400"
 title="Refresh spreadsheets"
 >
 <RefreshCw className={`w-4 h-4 ${spreadsheetsLoading ? 'animate-spin' : ''}`} />
 </button>
 )}
 </div>

 {spreadsheetsError && (
 <div className="text-sm text-red-600 bg-red-500/10 border border-red-200/50 rounded-md p-2">
 {spreadsheetsError}
 </div>
 )}

 <div className="flex items-center gap-3">
 <div className="flex-1">
 <Select
 label="Worksheet"
 value={formData.worksheet_name || ''}
 onChange={(val) => {
 const selectedWorksheet = worksheets.find(w => w.title === val);
 handleChange({ 
 worksheet_name: String(val || ''),
 worksheet_id: selectedWorksheet ? selectedWorksheet.sheet_id.toString() : ''
 });
 }}
 options={
 worksheetsLoading
 ? []
 : worksheets.map((w) => ({ 
 value: w.title, 
 label: `${w.title} (${w.grid_properties?.rowCount || '?'} rows × ${w.grid_properties?.columnCount || '?'} cols)`
 }))
 }
 placeholder={
 !formData.spreadsheet_id 
 ? 'Select a spreadsheet first'
 : worksheetsLoading 
 ? 'Loading worksheets...' 
 : worksheets.length === 0
 ? 'No worksheets found'
 : 'Select a worksheet'
 }
 disabled={!formData.spreadsheet_id || worksheetsLoading}
 />
 </div>
 {formData.spreadsheet_id && (
 <button
 type="button"
 onClick={loadWorksheets}
 disabled={worksheetsLoading}
 className="p-2 text-blue-primary hover:text-blue-800 disabled:text-gray-400"
 title="Refresh worksheets"
 >
 <RefreshCw className={`w-4 h-4 ${worksheetsLoading ? 'animate-spin' : ''}`} />
 </button>
 )}
 </div>

 {formData.spreadsheet_id && spreadsheets.length > 0 && (
 <div className="text-xs text-text-2 bg-bg-card/50 rounded-md p-3 border border-line-1">
 <div className="font-medium text-text-1">Selected Spreadsheet:</div>
 <div className="mt-1">
 {(() => {
 const selected = spreadsheets.find(s => s.id === formData.spreadsheet_id);
 return selected ? (
 <div>
 <div className="text-text-1">{selected.name}</div>
 <a
 href={selected.web_view_link}
 target="_blank"
 rel="noopener noreferrer"
 className="text-blue-primary hover:text-blue-primary inline-flex items-center gap-1"
 >
 Open in Google Sheets
 <ExternalLink className="w-3 h-3" />
 </a>
 </div>
 ) : 'Unknown spreadsheet';
 })()}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Data Configuration */}
 <div className="space-y-3 sm:space-y-4">
 <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-line-1">
 <div className="p-2 rounded-lg bg-warning-bg text-warning">
 <Settings className="w-4 h-4" />
 </div>
 <div>
 <h3 className="text-sm font-semibold text-text-1">Data Configuration</h3>
 <p className="text-xs text-text-2">Configure how data should be written to the sheet</p>
 </div>
 </div>

 <div className="space-y-3">
 <Input
 label="Range (optional)"
 value={formData.range || ''}
 onChange={(e) => handleChange({ range: e.currentTarget.value })}
 placeholder="e.g. A1:Z100, Sheet1!A1:C, or leave empty for entire sheet"
 helperText="Specify the range where data should be written. Leave empty to use the entire sheet."
 />
 
 <div className="bg-bg-card/50 rounded-lg p-3 border border-line-1">
 <p className="text-xs font-medium text-text-2 mb-2">Range Examples:</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-3">
 <button 
 type="button"
 onClick={() => handleChange({ range: 'A1:Z' })}
 className="text-left hover:text-blue-primary hover:bg-blue-soft px-2 py-1 rounded transition-colors"
 >
 <code className="bg-bg-muted px-1 rounded border border-line-1">A1:Z</code> - Columns A to Z
 </button>
 <button 
 type="button"
 onClick={() => handleChange({ range: 'A1:C100' })}
 className="text-left hover:text-blue-primary hover:bg-blue-soft px-2 py-1 rounded transition-colors"
 >
 <code className="bg-bg-muted px-1 rounded border border-line-1">A1:C100</code> - Specific range
 </button>
 <button 
 type="button"
 onClick={() => handleChange({ range: 'Data!A1:Z' })}
 className="text-left hover:text-blue-primary hover:bg-blue-soft px-2 py-1 rounded transition-colors"
 >
 <code className="bg-bg-muted px-1 rounded border border-line-1">Data!A1:Z</code> - Named sheet
 </button>
 <button 
 type="button"
 onClick={() => handleChange({ range: '' })}
 className="text-left hover:text-blue-primary hover:bg-blue-soft px-2 py-1 rounded transition-colors"
 >
 <code className="bg-bg-muted px-1 rounded border border-line-1">Empty</code> - Entire sheet
 </button>
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <Select
 label="Insert Mode"
 value={formData.insert_mode || 'append'}
 onChange={(val) => handleChange({ insert_mode: String(val || 'append') })}
 options={[
 { value: 'append', label: 'Append - Add new rows at the end' },
 { value: 'truncate', label: 'Truncate - Clear sheet and insert new data' },
 { value: 'upsert', label: 'Upsert - Update existing or insert new rows' },
 ]}
 />
 
 <div className="bg-blue-primary/10 rounded-lg p-3 border border-blue-primary/20">
 <div className="text-xs text-blue-primary ">
 {formData.insert_mode === 'append' && (
 <>
 <strong>Append Mode:</strong> New data will be added as new rows at the end of the existing data. 
 Existing data remains unchanged.
 </>
 )}
 {formData.insert_mode === 'truncate' && (
 <>
 <strong>Truncate Mode:</strong> All existing data in the sheet will be cleared first, 
 then new data will be inserted from the beginning.
 </>
 )}
 {formData.insert_mode === 'upsert' && (
 <>
 <strong>Upsert Mode:</strong> Existing rows will be updated if they match, 
 otherwise new rows will be inserted. Requires a unique identifier column.
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );

 // Compact mode - render just the form without wrapper
 if (compact) {
 return <div className="space-y-4">{formContent}</div>;
 }

 // Full mode - render with BaseEditorWrapper
 return (
 <BaseEditorWrapper
 title="Google Sheets"
 icon={<GoogleSheetsIcon size={28} />}
 onClose={onClose}
 onSubmit={handleSubmit}
 isValid={isValid}
 initialValues={canonical(data)}
 currentValues={canonical(formData)}
 >
 {formContent}
 </BaseEditorWrapper>
 );
};

export default GoogleSheetsEditor;
