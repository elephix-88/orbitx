import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Input } from '@/components/shared/form/Input';
import { useWorkflowStore } from '@/store/workflowStore';
import { getUpstreamColumnNames } from '@/utils/upstreamColumns';
import { ArrowRight, Replace } from 'lucide-react';

type RenameEditorProps = {
 nodeId?: string;
 onClose: () => void;
 setSelectedNode?: (node: null) => void;
 data?: {
 column_mapping?: Record<string, string>;
 };
 onChange?: (data: { column_mapping: Record<string, string> }) => void;
 onDeleteNode?: () => void;
 onValidate?: (valid: boolean, errors: string[]) => void;
 /** When true, renders only the form without BaseEditorWrapper */
 compact?: boolean;
};

const RenameEditor: React.FC<RenameEditorProps> = ({
 nodeId,
 onClose,
 setSelectedNode,
 data,
 onChange,
 onDeleteNode,
 onValidate,
 compact = false,
}) => {
 // Get upstream columns from connected nodes
 const nodes = useWorkflowStore((state) => state.nodes);
 const connections = useWorkflowStore((state) => state.connections);

 const availableColumns = useMemo(() => {
 if (!nodeId) return [];
 return getUpstreamColumnNames(nodeId, nodes, connections);
 }, [nodeId, nodes, connections]);

 // Create a stable JSON string of initial column_mapping for dependency comparison
 // This prevents re-initialization when data object reference changes but values are same
 const initialColumnMappingJson = useRef<string>(
 JSON.stringify(data?.column_mapping || {})
 );

 // Track if component has been initialized
 const isInitializedRef = useRef(false);

 // State: mapping of oldName -> newName (empty string means no rename)
 const [columnRenames, setColumnRenames] = useState<Record<string, string>>(() => {
 // Initialize with existing mappings
 const initialRenames: Record<string, string> = {};
 if (data?.column_mapping) {
 Object.entries(data.column_mapping).forEach(([oldName, newName]) => {
 initialRenames[oldName] = newName;
 });
 }
 return initialRenames;
 });
 const [touched, setTouched] = useState(false);

 // Initialize column renames when availableColumns first becomes available
 // Only run once to prevent re-initialization loops
 useEffect(() => {
 if (isInitializedRef.current) return;
 if (availableColumns.length === 0) return;

 isInitializedRef.current = true;

 setColumnRenames((prev) => {
 const newRenames: Record<string, string> = {};
 // Start with all available columns having empty new names
 availableColumns.forEach((col) => {
 newRenames[col] = prev[col] || '';
 });
 return newRenames;
 });
 }, [availableColumns]);

 // Get only the non-empty renames for saving
 const getActiveRenames = useCallback((): Record<string, string> => {
 const result: Record<string, string> = {};
 Object.entries(columnRenames).forEach(([oldName, newName]) => {
 if (newName.trim() !== '') {
 result[oldName] = newName.trim();
 }
 });
 return result;
 }, [columnRenames]);

 // Check for duplicate new names
 const hasDuplicateNewNames = useMemo(() => {
 const newNames = Object.values(columnRenames)
 .map((n) => n.trim())
 .filter((n) => n !== '');
 return new Set(newNames).size !== newNames.length;
 }, [columnRenames]);

 // Check if new name conflicts with existing column names (that aren't being renamed)
 const getConflictingNames = useMemo(() => {
 const conflicts: string[] = [];
 Object.entries(columnRenames).forEach(([oldName, newName]) => {
 if (newName.trim() === '') return;
 // Check if newName conflicts with another column that isn't being renamed
 availableColumns.forEach((col) => {
 if (col !== oldName && col === newName.trim() && !columnRenames[col]?.trim()) {
 conflicts.push(newName.trim());
 }
 });
 });
 return conflicts;
 }, [columnRenames, availableColumns]);

 // Check if data has changed - use stable reference for comparison
 const isDirty = useMemo(() => {
 const currentMapping = getActiveRenames();
 const originalMapping = JSON.parse(initialColumnMappingJson.current);
 return JSON.stringify(currentMapping) !== JSON.stringify(originalMapping);
 }, [getActiveRenames]);

 // At least one rename must be specified
 const hasAtLeastOneRename = Object.values(columnRenames).some((v) => v.trim() !== '');

 const isValid = hasAtLeastOneRename && !hasDuplicateNewNames && getConflictingNames.length === 0;

 // Store callbacks in refs to avoid dependency issues
 const onValidateRef = useRef(onValidate);
 const onChangeRef = useRef(onChange);
 useEffect(() => {
 onValidateRef.current = onValidate;
 onChangeRef.current = onChange;
 });

 // Notify parent of validation changes
 useEffect(() => {
 if (onValidateRef.current) {
 const errors: string[] = [];
 if (!hasAtLeastOneRename) errors.push('Enter at least one column to rename');
 if (hasDuplicateNewNames) errors.push('Duplicate new column names are not allowed');
 if (getConflictingNames.length > 0) errors.push(`New name conflicts with existing column: ${getConflictingNames.join(', ')}`);
 onValidateRef.current(isValid, errors);
 }
 }, [isValid, hasAtLeastOneRename, hasDuplicateNewNames, getConflictingNames]);

 // Memoize active renames to prevent object recreation on every render
 const activeRenames = useMemo(() => getActiveRenames(), [getActiveRenames]);
 const activeRenamesJson = useMemo(() => JSON.stringify(activeRenames), [activeRenames]);

 // Track previous value to prevent infinite loops in compact mode
 const prevActiveRenamesRef = useRef<string>(activeRenamesJson);

 // In compact mode, propagate changes to parent only when user actually changes values
 // Skip the initial render and only trigger on subsequent changes
 useEffect(() => {
 // Skip if not compact mode
 if (!compact) return;

 // Skip if value hasn't actually changed
 if (activeRenamesJson === prevActiveRenamesRef.current) return;

 // Update ref and call onChange
 prevActiveRenamesRef.current = activeRenamesJson;

 if (onChangeRef.current) {
 onChangeRef.current({ column_mapping: activeRenames });
 }
 }, [compact, activeRenamesJson, activeRenames]);

 const handleRenameChange = (oldName: string, newName: string) => {
 setColumnRenames((prev) => ({
 ...prev,
 [oldName]: newName,
 }));
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setTouched(true);

 if (!isValid || !isDirty) {
 return;
 }

 if (onChange) {
 onChange({ column_mapping: getActiveRenames() });
 }

 if (setSelectedNode) setSelectedNode(null);
 else onClose();
 };

 const handleClose = () => {
 if (setSelectedNode) setSelectedNode(null);
 else onClose();
 };

 const hasUpstreamColumns = availableColumns.length > 0;

 // Form content - shared between compact and full mode
 const formContent = (
 <div className="flex flex-col gap-4">
 {hasUpstreamColumns ? (
 <>
 <p className="text-sm text-text-2">
 Enter new names for columns you want to rename. Leave empty to keep the original name.
 </p>

 {/* Column table */}
 <div className="border border-line-1 rounded-lg overflow-hidden">
 {/* Header */}
 <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 py-3 bg-bg-card border-b border-line-1">
 <span className="text-sm font-medium text-text-2">
 Original Column
 </span>
 <span></span>
 <span className="text-sm font-medium text-text-2">
 New Name
 </span>
 </div>

 {/* Column rows */}
 <div className="divide-y divide-border">
 {availableColumns.map((columnName) => {
 const newName = columnRenames[columnName] || '';
 const isDuplicate =
 newName.trim() !== '' &&
 Object.entries(columnRenames).some(
 ([k, v]) => k !== columnName && v.trim() === newName.trim()
 );
 const isConflict = getConflictingNames.includes(newName.trim());

 return (
 <div
 key={columnName}
 className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 py-3 items-center hover:bg-bg-card/50 transition-colors"
 >
 {/* Original column name */}
 <div className="flex items-center">
 <code className="text-sm font-mono text-text-1 bg-bg-card px-2 py-1 rounded">
 {columnName}
 </code>
 </div>

 {/* Arrow */}
 <div className="flex items-center justify-center px-2">
 <ArrowRight
 size={16}
 className={newName.trim() ? 'text-primary' : 'text-text-3'}
 />
 </div>

 {/* New name input */}
 <div>
 <Input
 value={newName}
 onChange={(e) => handleRenameChange(columnName, e.target.value)}
 onBlur={() => setTouched(true)}
 placeholder={columnName}
 className={`text-sm ${
 (isDuplicate || isConflict) && touched
 ? 'border-danger-border focus:border-danger-border focus:ring-error/20'
 : ''
 }`}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Summary */}
 <div className="flex items-center justify-between text-sm text-text-3">
 <span>
 {Object.values(columnRenames).filter((v) => v.trim() !== '').length} of{' '}
 {availableColumns.length} columns will be renamed
 </span>
 </div>

 {/* Validation messages */}
 {touched && !hasAtLeastOneRename && (
 <span className="text-xs text-error">
 Enter at least one new column name to rename.
 </span>
 )}
 {touched && hasDuplicateNewNames && (
 <span className="text-xs text-error">
 Duplicate new column names are not allowed.
 </span>
 )}
 {touched && getConflictingNames.length > 0 && (
 <span className="text-xs text-error">
 New name conflicts with existing column: {getConflictingNames.join(', ')}
 </span>
 )}
 </>
 ) : (
 <div className="text-center py-8">
 <p className="text-sm text-text-3 mb-2">
 No columns detected from upstream node.
 </p>
 <p className="text-xs text-text-3">
 Connect a source node (Facebook Ads, Google Ads) to see available columns.
 </p>
 </div>
 )}
 </div>
 );

 // Compact mode - render just the form without wrapper
 if (compact) {
 return <div className="space-y-4">{formContent}</div>;
 }

 // Full mode - render with BaseEditorWrapper
 return (
 <BaseEditorWrapper
 title="Rename Columns"
 icon={<Replace size={28} className="text-violet" />}
 onClose={handleClose}
 onSubmit={handleSubmit}
 isValid={isValid && isDirty}
 initialValues={{ column_mapping: data?.column_mapping || {} }}
 currentValues={{ column_mapping: getActiveRenames() }}
 onDeleteNode={onDeleteNode}
 >
 {formContent}
 </BaseEditorWrapper>
 );
};

export default RenameEditor;
