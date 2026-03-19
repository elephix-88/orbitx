import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Input } from '@/components/shared/form/Input';
import { useWorkflowStore } from '@/store/workflowStore';
import { getUpstreamColumnNames } from '@/utils/upstreamColumns';
import { Columns3, X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import type { ColumnConversion, NewColumn, DataType } from '@/workflow/node-specs/transform.column-editor';

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Datetime' },
];

type ColumnEditorEditorProps = {
  nodeId?: string;
  onClose: () => void;
  setSelectedNode?: (node: null) => void;
  data?: {
    conversions?: ColumnConversion[];
    new_columns?: NewColumn[];
  };
  onChange?: (data: { conversions: ColumnConversion[]; new_columns: NewColumn[] }) => void;
  onDeleteNode?: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  compact?: boolean;
};

// Internal state for new columns
interface NewColumnRow {
  id: string;
  name: string;
  value: string;
  data_type: DataType;
}

// Internal row state for each column
interface ColumnRow {
  column: string;
  rename: string;
  cast: DataType | '';
  drop: boolean;
}

const ColumnEditorEditor: React.FC<ColumnEditorEditorProps> = ({
  nodeId,
  onClose,
  setSelectedNode,
  data,
  onChange,
  onDeleteNode,
  onValidate,
  compact = false,
}) => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const connections = useWorkflowStore((state) => state.connections);

  const availableColumns = useMemo(() => {
    if (!nodeId) return [];
    return getUpstreamColumnNames(nodeId, nodes, connections);
  }, [nodeId, nodes, connections]);

  // Create stable JSON string of initial data for comparison
  const initialDataJson = useRef<string>(
    JSON.stringify({ conversions: data?.conversions || [], new_columns: data?.new_columns || [] })
  );

  // Track if component has been initialized
  const isInitializedRef = useRef(false);

  // State: mapping of column -> { rename, cast, drop }
  const [columnRows, setColumnRows] = useState<Record<string, ColumnRow>>(() => {
    const initial: Record<string, ColumnRow> = {};
    if (data?.conversions) {
      data.conversions.forEach((conv) => {
        initial[conv.column] = {
          column: conv.column,
          rename: conv.rename || '',
          cast: conv.cast || '',
          drop: conv.drop || false,
        };
      });
    }
    return initial;
  });

  // State: new columns to add
  const [newColumns, setNewColumns] = useState<NewColumnRow[]>(() => {
    if (data?.new_columns) {
      return data.new_columns.map((nc, idx) => ({
        id: `new-${idx}-${Date.now()}`,
        name: nc.name,
        value: nc.value,
        data_type: nc.data_type,
      }));
    }
    return [];
  });

  const [touched, setTouched] = useState(false);

  // Initialize column rows when availableColumns first becomes available
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (availableColumns.length === 0) return;

    isInitializedRef.current = true;

    setColumnRows((prev) => {
      const newRows: Record<string, ColumnRow> = {};
      availableColumns.forEach((col) => {
        newRows[col] = prev[col] || { column: col, rename: '', cast: '', drop: false };
      });
      return newRows;
    });
  }, [availableColumns]);

  // Get only the non-empty conversions for saving
  const getActiveConversions = useCallback((): ColumnConversion[] => {
    const result: ColumnConversion[] = [];
    Object.values(columnRows).forEach((row) => {
      if (row.rename.trim() || row.cast || row.drop) {
        result.push({
          column: row.column,
          rename: row.rename.trim() || undefined,
          cast: row.cast || undefined,
          drop: row.drop || undefined,
        });
      }
    });
    return result;
  }, [columnRows]);

  // Get valid new columns (must have name and value)
  const getActiveNewColumns = useCallback((): NewColumn[] => {
    return newColumns
      .filter((nc) => nc.name.trim() && nc.value.trim())
      .map((nc) => ({
        name: nc.name.trim(),
        value: nc.value.trim(),
        data_type: nc.data_type,
      }));
  }, [newColumns]);

  // Check for duplicate new names (ignore dropped columns, include new columns)
  const getDuplicateRenames = useMemo(() => {
    const renames = Object.values(columnRows)
      .filter((r) => !r.drop) // Ignore dropped columns
      .map((r) => r.rename.trim())
      .filter((r) => r !== '');
    // Also include new column names
    const newColNames = newColumns.map((nc) => nc.name.trim()).filter((n) => n !== '');
    const allNames = [...renames, ...newColNames];
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    allNames.forEach((r) => {
      if (seen.has(r)) duplicates.add(r);
      seen.add(r);
    });
    return duplicates;
  }, [columnRows, newColumns]);

  // Check if new name conflicts with existing column names (that aren't being renamed or dropped)
  const getConflictingNames = useMemo(() => {
    const conflicts: string[] = [];
    // Check renamed columns
    Object.values(columnRows).forEach((row) => {
      if (row.drop) return; // Ignore dropped columns
      const newName = row.rename.trim();
      if (!newName) return;
      // Check if newName conflicts with another column that isn't being renamed or dropped
      availableColumns.forEach((col) => {
        const colRow = columnRows[col];
        if (col !== row.column && col === newName && !colRow?.rename.trim() && !colRow?.drop) {
          conflicts.push(newName);
        }
      });
    });
    // Check new columns against existing columns
    newColumns.forEach((nc) => {
      const newName = nc.name.trim();
      if (!newName) return;
      availableColumns.forEach((col) => {
        const colRow = columnRows[col];
        if (col === newName && !colRow?.rename.trim() && !colRow?.drop) {
          conflicts.push(newName);
        }
      });
    });
    return conflicts;
  }, [columnRows, availableColumns, newColumns]);

  // Check if data has changed
  const isDirty = useMemo(() => {
    const currentData = {
      conversions: getActiveConversions(),
      new_columns: getActiveNewColumns(),
    };
    return JSON.stringify(currentData) !== initialDataJson.current;
  }, [getActiveConversions, getActiveNewColumns]);

  // Check for incomplete new columns (has name but no value, or vice versa)
  const getIncompleteNewColumns = useMemo(() => {
    return newColumns.filter(
      (nc) => (nc.name.trim() && !nc.value.trim()) || (!nc.name.trim() && nc.value.trim())
    );
  }, [newColumns]);

  // At least one action (rename, cast, drop, or add new column) must be specified
  const hasAtLeastOneAction =
    Object.values(columnRows).some(
      (row) => row.rename.trim() !== '' || row.cast !== '' || row.drop
    ) || newColumns.some((nc) => nc.name.trim() && nc.value.trim());

  const isValid =
    hasAtLeastOneAction &&
    getDuplicateRenames.size === 0 &&
    getConflictingNames.length === 0 &&
    getIncompleteNewColumns.length === 0;

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
      if (!hasAtLeastOneAction) errors.push('Enter at least one rename, type change, or new column');
      if (getDuplicateRenames.size > 0)
        errors.push(`Duplicate names: ${[...getDuplicateRenames].join(', ')}`);
      if (getConflictingNames.length > 0)
        errors.push(`Conflicts with existing: ${getConflictingNames.join(', ')}`);
      if (getIncompleteNewColumns.length > 0)
        errors.push('New columns must have both name and value');
      onValidateRef.current(isValid, errors);
    }
  }, [isValid, hasAtLeastOneAction, getDuplicateRenames, getConflictingNames, getIncompleteNewColumns]);

  // Memoize active data
  const activeConversions = useMemo(() => getActiveConversions(), [getActiveConversions]);
  const activeNewColumns = useMemo(() => getActiveNewColumns(), [getActiveNewColumns]);
  const activeDataJson = useMemo(
    () => JSON.stringify({ conversions: activeConversions, new_columns: activeNewColumns }),
    [activeConversions, activeNewColumns]
  );

  // Track previous value to prevent infinite loops in compact mode
  const prevActiveDataRef = useRef<string>(activeDataJson);

  // In compact mode, propagate changes to parent
  useEffect(() => {
    if (!compact) return;
    if (activeDataJson === prevActiveDataRef.current) return;

    prevActiveDataRef.current = activeDataJson;

    if (onChangeRef.current) {
      onChangeRef.current({ conversions: activeConversions, new_columns: activeNewColumns });
    }
  }, [compact, activeDataJson, activeConversions, activeNewColumns]);

  const handleRenameChange = (column: string, newName: string) => {
    setColumnRows((prev) => ({
      ...prev,
      [column]: { ...prev[column], rename: newName },
    }));
  };

  const handleCastChange = (column: string, cast: DataType | '') => {
    setColumnRows((prev) => ({
      ...prev,
      [column]: { ...prev[column], cast },
    }));
  };

  const handleDropToggle = (column: string) => {
    setColumnRows((prev) => ({
      ...prev,
      [column]: { ...prev[column], drop: !prev[column]?.drop },
    }));
  };

  // New column handlers
  const handleAddNewColumn = () => {
    setNewColumns((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', value: '', data_type: 'string' },
    ]);
  };

  const handleNewColumnChange = (
    id: string,
    field: 'name' | 'value' | 'data_type',
    value: string
  ) => {
    setNewColumns((prev) =>
      prev.map((nc) => (nc.id === id ? { ...nc, [field]: value } : nc))
    );
  };

  const handleRemoveNewColumn = (id: string) => {
    setNewColumns((prev) => prev.filter((nc) => nc.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isValid || !isDirty) return;

    if (onChange) {
      onChange({ conversions: getActiveConversions(), new_columns: getActiveNewColumns() });
    }

    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  const handleClose = () => {
    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  const hasUpstreamColumns = availableColumns.length > 0;

  const formContent = (
    <div className="flex flex-col gap-4">
      {hasUpstreamColumns ? (
        <>
          <p className="text-sm text-text-secondary">
            Rename columns, change their data type, drop columns, or add new columns with constant values.
          </p>

          {/* Column table */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_130px_36px] gap-2 px-4 py-3 bg-surface-secondary border-b border-border">
              <span className="text-sm font-medium text-text-secondary">
                Original Column
              </span>
              <span className="text-sm font-medium text-text-secondary">New Name</span>
              <span className="text-sm font-medium text-text-secondary">Data Type</span>
              <span className="text-sm font-medium text-text-secondary text-center">Drop</span>
            </div>

            {/* Column rows */}
            <div className="divide-y divide-border">
              {availableColumns.map((columnName) => {
                const row = columnRows[columnName] || {
                  column: columnName,
                  rename: '',
                  cast: '',
                  drop: false,
                };
                const isDuplicateRename =
                  row.rename.trim() !== '' && getDuplicateRenames.has(row.rename.trim());
                const isConflict = getConflictingNames.includes(row.rename.trim());
                const hasSelectedCast = row.cast !== '';
                const isDropped = row.drop;

                return (
                  <div
                    key={columnName}
                    className={`grid grid-cols-[1fr_1fr_130px_36px] gap-2 px-4 py-3 items-center transition-colors ${
                      isDropped
                        ? 'bg-red-50 dark:bg-red-950/30'
                        : 'hover:bg-surface-secondary/50'
                    }`}
                  >
                    {/* Original column name */}
                    <div className="flex items-center">
                      <code
                        className={`text-sm font-mono px-2 py-1 rounded truncate ${
                          isDropped
                            ? 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 line-through'
                            : 'text-text-primary bg-surface-secondary'
                        }`}
                      >
                        {columnName}
                      </code>
                    </div>

                    {/* New name input */}
                    <div>
                      <Input
                        value={row.rename}
                        onChange={(e) => handleRenameChange(columnName, e.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder={columnName}
                        disabled={isDropped}
                        className={`text-sm ${
                          isDropped
                            ? 'opacity-50 cursor-not-allowed'
                            : (isDuplicateRename || isConflict) && touched
                            ? 'border-error focus:border-error focus:ring-error/20'
                            : ''
                        }`}
                      />
                    </div>

                    {/* Cast dropdown */}
                    <div>
                      <select
                        value={row.cast}
                        onChange={(e) =>
                          handleCastChange(columnName, e.target.value as DataType | '')
                        }
                        disabled={isDropped}
                        className={`w-full h-9 px-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                          isDropped
                            ? 'opacity-50 cursor-not-allowed'
                            : hasSelectedCast
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <option value="" className="text-slate-400 dark:text-slate-500">
                          -
                        </option>
                        {DATA_TYPES.map((type) => (
                          <option
                            key={type.value}
                            value={type.value}
                            className="text-slate-900 dark:text-slate-100"
                          >
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Drop button */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleDropToggle(columnName)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                          isDropped
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                        title={isDropped ? 'Restore column' : 'Drop column'}
                      >
                        {isDropped ? <RotateCcw size={14} /> : <X size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-text-tertiary">
            <span>
              {Object.values(columnRows).filter((r) => r.rename.trim() || r.cast || r.drop).length} of{' '}
              {availableColumns.length} columns will be modified
              {Object.values(columnRows).filter((r) => r.drop).length > 0 && (
                <span className="text-red-500 ml-1">
                  ({Object.values(columnRows).filter((r) => r.drop).length} dropped)
                </span>
              )}
              {newColumns.filter((nc) => nc.name.trim() && nc.value.trim()).length > 0 && (
                <span className="text-green-600 dark:text-green-400 ml-1">
                  (+{newColumns.filter((nc) => nc.name.trim() && nc.value.trim()).length} new)
                </span>
              )}
            </span>
          </div>

          {/* Add New Columns Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border">
              <span className="text-sm font-medium text-text-secondary">Add New Columns</span>
              <button
                type="button"
                onClick={handleAddNewColumn}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <Plus size={14} />
                Add Column
              </button>
            </div>

            {newColumns.length > 0 ? (
              <div className="divide-y divide-border">
                {/* New columns header */}
                <div className="grid grid-cols-[1fr_1fr_130px_36px] gap-2 px-4 py-2 bg-surface-secondary/50">
                  <span className="text-xs font-medium text-text-tertiary">Column Name</span>
                  <span className="text-xs font-medium text-text-tertiary">Value</span>
                  <span className="text-xs font-medium text-text-tertiary">Data Type</span>
                  <span className="text-xs font-medium text-text-tertiary text-center"></span>
                </div>
                {newColumns.map((nc) => {
                  const isDuplicate = nc.name.trim() !== '' && getDuplicateRenames.has(nc.name.trim());
                  const isConflict = getConflictingNames.includes(nc.name.trim());
                  const isIncomplete =
                    (nc.name.trim() && !nc.value.trim()) || (!nc.name.trim() && nc.value.trim());

                  return (
                    <div
                      key={nc.id}
                      className="grid grid-cols-[1fr_1fr_130px_36px] gap-2 px-4 py-3 items-center bg-green-50/50 dark:bg-green-950/20"
                    >
                      {/* Column name */}
                      <div>
                        <Input
                          value={nc.name}
                          onChange={(e) => handleNewColumnChange(nc.id, 'name', e.target.value)}
                          onBlur={() => setTouched(true)}
                          placeholder="column_name"
                          className={`text-sm ${
                            (isDuplicate || isConflict || (isIncomplete && touched)) &&
                            'border-error focus:border-error focus:ring-error/20'
                          }`}
                        />
                      </div>

                      {/* Value */}
                      <div>
                        <Input
                          value={nc.value}
                          onChange={(e) => handleNewColumnChange(nc.id, 'value', e.target.value)}
                          onBlur={() => setTouched(true)}
                          placeholder="constant value"
                          className={`text-sm ${
                            isIncomplete && touched && 'border-error focus:border-error focus:ring-error/20'
                          }`}
                        />
                      </div>

                      {/* Data type */}
                      <div>
                        <select
                          value={nc.data_type}
                          onChange={(e) =>
                            handleNewColumnChange(nc.id, 'data_type', e.target.value)
                          }
                          className="w-full h-9 px-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        >
                          {DATA_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Remove button */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveNewColumn(nc.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remove column"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-4 text-center text-sm text-text-tertiary">
                No new columns added. Click "Add Column" to create a column with a constant value.
              </div>
            )}
          </div>

          {/* Validation messages */}
          {touched && !hasAtLeastOneAction && (
            <span className="text-xs text-error">
              Enter at least one rename, type change, drop, or add a new column.
            </span>
          )}
          {touched && getDuplicateRenames.size > 0 && (
            <span className="text-xs text-error">
              Duplicate column names: {[...getDuplicateRenames].join(', ')}
            </span>
          )}
          {touched && getConflictingNames.length > 0 && (
            <span className="text-xs text-error">
              Name conflicts with existing column: {getConflictingNames.join(', ')}
            </span>
          )}
          {touched && getIncompleteNewColumns.length > 0 && (
            <span className="text-xs text-error">
              New columns must have both name and value filled in.
            </span>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-text-tertiary mb-2">
            No columns detected from upstream node.
          </p>
          <p className="text-xs text-text-tertiary">
            Connect a source node to see available columns.
          </p>
        </div>
      )}
    </div>
  );

  if (compact) {
    return <div className="space-y-4">{formContent}</div>;
  }

  return (
    <BaseEditorWrapper
      title="Column Editor"
      icon={<Columns3 size={28} className="text-purple-500" />}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isValid={isValid && isDirty}
      initialValues={{ conversions: data?.conversions || [], new_columns: data?.new_columns || [] }}
      currentValues={{ conversions: getActiveConversions(), new_columns: getActiveNewColumns() }}
      onDeleteNode={onDeleteNode}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default ColumnEditorEditor;
