import React, { useEffect, useMemo, useState, useRef } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Select } from '@/components/shared/form/Select';
import { Input } from '@/components/shared/form/Input';
import { BigQuerySelector } from '@/components/connections/BigQuerySelector';
import { FormField } from '@/components/shared/form/FormCard';
import { ExternalLink, Zap, CheckCircle, Table, Upload, ArrowRightFromLine } from 'lucide-react';
import { BigQueryIcon } from '@/components/icons/BrandIcons';
import { useNodeDataCache } from '@/store/nodeDataCache';
import { prefetchConnections } from '@/services/nodeDataPrefetch';

// Types
interface BigQueryFormData {
 project_id: string;
 dataset: string;
 destination_table: string;
 location: string;
 insert_mode: string;
 connection_id: string;
 batch_size?: number;
 num_partitions?: number;
 pass_through: boolean;
}

interface BigQueryNodeData {
 project_id?: string;
 projectId?: string;
 dataset?: string;
 destination_table?: string;
 table?: string;
 location?: string;
 insert_mode?: string;
 write_disposition?: string;
 writeDisposition?: string;
 connection_id?: string;
 batch_size?: number | string;
 num_partitions?: number | string;
 pass_through?: boolean;
}

interface BigQueryEditorProps {
 nodeId?: string;
 data: BigQueryNodeData;
 onChange: (data: BigQueryFormData) => void;
 onClose: () => void;
 onValidate?: (valid: boolean, errors: string[]) => void;
 /** When true, renders only the form without BaseEditorWrapper */
 compact?: boolean;
}

interface ConnectionOption {
 id: string;
 name: string;
}

const BigQueryEditor: React.FC<BigQueryEditorProps> = ({ data, onChange, onClose, onValidate, compact = false }) => {
 // Cache store
 const cache = useNodeDataCache();
 const cachedConnections = cache.connections;

 // Track if initial data has been loaded to prevent re-sync loops
 const initializedRef = useRef(false);

 const [formData, setFormData] = useState<BigQueryFormData>(() => ({
 project_id: data?.project_id || data?.projectId || '',
 dataset: data?.dataset || '',
 destination_table: data?.destination_table || data?.table || '',
 location: data?.location || 'US',
 insert_mode: data?.insert_mode || 'append',
 connection_id: data?.connection_id || '',
 batch_size: typeof data?.batch_size === 'number' ? data.batch_size : undefined,
 num_partitions: typeof data?.num_partitions === 'number' ? data.num_partitions : undefined,
 pass_through: data?.pass_through || false,
 }));

 const [connections, setConnections] = useState<ConnectionOption[]>([]);
 const [connectionsLoading, setConnectionsLoading] = useState(false);

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
 project_id: data?.project_id || data?.projectId || prev.project_id,
 dataset: data?.dataset || prev.dataset,
 destination_table: data?.destination_table || data?.table || prev.destination_table,
 location: data?.location || prev.location,
 insert_mode: data?.insert_mode || prev.insert_mode,
 connection_id: data?.connection_id || prev.connection_id,
 batch_size: typeof data?.batch_size === 'number' ? data.batch_size : prev.batch_size,
 num_partitions: typeof data?.num_partitions === 'number' ? data.num_partitions : prev.num_partitions,
 }));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [data?.connection_id]);

 // Sync connections from cache - only update connections list, not formData
 useEffect(() => {
 if (cachedConnections?.data) {
 const bqConnections = cachedConnections.data
 .filter(c => {
 const serviceName = c.service_name?.toLowerCase() || '';
 const name = c.name?.toLowerCase() || '';
 return serviceName.includes('bigquery') || name.includes('bigquery');
 })
 .map(c => ({ id: c.id, name: c.name }));
 setConnections(bqConnections);
 setConnectionsLoading(cachedConnections.isLoading);
 }
 }, [cachedConnections]);

 // Auto-select or clear stale connection when connections load
 useEffect(() => {
 if (connections.length === 0) return;
 const currentValid = connections.some(c => c.id === formData.connection_id);
 if (!currentValid) {
 const nextId = connections.length === 1 ? connections[0].id : '';
 setFormData((prev) => ({ ...prev, connection_id: nextId }));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [connections]);

 // Load connections on mount - use cache first
 useEffect(() => {
 if (!cachedConnections?.data || cachedConnections.data.length === 0) {
 prefetchConnections();
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleChange = (updates: Partial<BigQueryFormData>) => {
 setFormData((prev) => ({ ...prev, ...updates }));
 };

 const canonical = (d: BigQueryFormData | BigQueryNodeData): BigQueryFormData => {
 const formD = d as BigQueryFormData;
 const nodeD = d as BigQueryNodeData;

 return {
 connection_id: d?.connection_id || '',
 project_id: formD?.project_id || nodeD?.projectId || '',
 dataset: d?.dataset || '',
 destination_table: formD?.destination_table || nodeD?.table || '',
 location: d?.location || 'US',
 insert_mode: ((): string => {
 if (formD?.insert_mode) return formD.insert_mode;
 const wd = nodeD?.write_disposition || nodeD?.writeDisposition;
 if (wd === 'WRITE_TRUNCATE') return 'truncate';
 if (wd === 'WRITE_APPEND' || wd === 'WRITE_EMPTY') return 'append';
 return 'append';
 })(),
 batch_size: typeof d?.batch_size === 'number' ? d.batch_size : (d?.batch_size ? Number(d.batch_size) : undefined),
 num_partitions: typeof d?.num_partitions === 'number' ? d.num_partitions : (d?.num_partitions ? Number(d.num_partitions) : undefined),
 pass_through: d?.pass_through || false,
 };
 };

 // Memoize canonical form data to prevent unnecessary recalculations
 const canonicalFormData = useMemo(() => canonical(formData), [formData]);

 // Calculate validation - memoize both isValid and errors together for consistency
 const { isValid, validationErrors } = useMemo(() => {
 const errors: string[] = [];
 if (!canonicalFormData.connection_id.trim()) errors.push('Please select a connection');
 if (!canonicalFormData.project_id.trim()) errors.push('Please select a project');
 if (!canonicalFormData.dataset.trim()) errors.push('Please select a dataset');
 if (!canonicalFormData.destination_table.trim()) errors.push('Please enter a table name');
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
 <div className="max-w-4xl mx-auto space-y-8">
 {/* Connection */}
 <FormField
 label="Connection"
 icon={Zap}
 iconColor="text-blue-primary "
 description="Select your BigQuery connection"
 >
 <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
 <div className="flex-1 min-w-0">
 <Select
 value={formData.connection_id || ''}
 onChange={(val) => handleChange({ connection_id: String(val || '') })}
 options={
 connectionsLoading
 ? []
 : connections.map((c) => ({ value: c.id, label: `${c.name}` }))
 }
 placeholder={connectionsLoading ? 'Loading connections...' : 'Choose a BigQuery connection'}
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
 
 {formData.connection_id && (
 <div className="mt-2">
 <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success-bg text-success text-xs font-medium w-fit">
 <CheckCircle className="w-3 h-3" />
 Connected
 </div>
 </div>
 )}
 
 {(!connectionsLoading && connections.length === 0) && (
 <div className="mt-2 p-3 rounded-lg bg-warning-bg border border-warning/20">
 <p className="text-sm text-warning">
 No BigQuery connections found. Please create one in the Connections page.
 </p>
 </div>
 )}
 </FormField>

 {/* Project, Dataset & Table Selection */}
 {formData.connection_id && (
 <FormField
 label="Destination"
 icon={Table}
 iconColor="text-success "
 description="Choose your BigQuery project, dataset, and table"
 >
 <div className="p-4 rounded-lg bg-bg-card/50 border border-line-1">
 <BigQuerySelector
 connectionId={formData.connection_id}
 selectedProject={formData.project_id}
 selectedDataset={formData.dataset}
 selectedTable={formData.destination_table}
 onProjectChange={(projectId) => handleChange({ project_id: projectId })}
 onDatasetChange={(datasetId) => handleChange({ dataset: datasetId })}
 onTableChange={(tableId) => handleChange({ destination_table: tableId })}
 />
 </div>
 
 {formData.destination_table && (
 <div className="mt-3 p-3 rounded-lg bg-blue-primary/10 border border-blue-primary/20">
 <p className="text-sm text-blue-primary flex items-center gap-2">
 <Zap className="w-4 h-4" />
 The table will be created automatically if it doesn't exist.
 </p>
 </div>
 )}
 </FormField>
 )}

 {/* Configuration */}
 <FormField
 label="Write Configuration"
 icon={Upload}
 iconColor="text-purple-600 "
 description="Configure how data should be written to BigQuery"
 >
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="space-y-3">
 <Select
 label="Insert Mode"
 helperText="How to write when table exists"
 value={formData.insert_mode || 'append'}
 onChange={(val) => handleChange({ insert_mode: String(val || 'append') })}
 options={[
 { value: 'append', label: 'Append' },
 { value: 'truncate', label: 'Truncate' },
 { value: 'upsert', label: 'Upsert' },
 ]}
 />

 {/* Insert Mode Explanation */}
 <div className="p-3 rounded-lg bg-bg-card/50 border border-line-1">
 <p className="text-xs text-text-2 leading-relaxed">
 {formData.insert_mode === 'append' && '📝 New data will be added to existing records'}
 {formData.insert_mode === 'truncate' && '🗑️ Table will be cleared before inserting new data'}
 {formData.insert_mode === 'upsert' && '🔄 Records will be updated or inserted based on key'}
 </p>
 </div>
 </div>

 <div className="space-y-3">
 <Input
 label="Batch Size (optional)"
 type="number"
 value={formData.batch_size || ''}
 onChange={(e) => handleChange({ batch_size: e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined })}
 placeholder="e.g. 1000"
 helperText="Number of records to process at once"
 />
 </div>
 </div>
 </FormField>

 {/* Pass Through */}
 <FormField
 label="Pass Through"
 icon={ArrowRightFromLine}
 iconColor="text-text-2 "
 description="Pass data to downstream nodes after writing to BigQuery"
 >
 <div className="space-y-3">
 <label className="flex items-center gap-3 cursor-pointer group">
 <div className="relative">
 <input
 type="checkbox"
 checked={formData.pass_through}
 onChange={(e) => handleChange({ pass_through: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-soft rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-line-2 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-primary-hover"></div>
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-medium text-text-1 group-hover:text-blue-primary transition-colors">
 Enable Pass Through
 </span>
 <span className="text-xs text-text-2">
 Allow connecting to downstream nodes (transforms or other destinations)
 </span>
 </div>
 </label>

 {formData.pass_through && (
 <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
 <p className="text-sm text-text-1 flex items-center gap-2">
 <ArrowRightFromLine className="w-4 h-4" />
 Data will pass through to downstream nodes after writing to BigQuery
 </p>
 </div>
 )}
 </div>
 </FormField>
 </div>
 );

 // Compact mode - render just the form without wrapper
 if (compact) {
 return <div className="space-y-4">{formContent}</div>;
 }

 // Full mode - render with BaseEditorWrapper
 return (
 <BaseEditorWrapper
 title="BigQuery"
 icon={<BigQueryIcon size={28} />}
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

export default BigQueryEditor;
