// src/nodes/Editors/transform/SqlTransformEditor.tsx
import React, { useState, useEffect, useMemo } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { DatabaseIcon } from '@/components/icons/BrandIcons';

// กำหนด Type สำหรับ Props ของ SqlTransformEditor
type SqlTransformEditorProps = {
  nodeId?: string;
  onClose: () => void;
  setSelectedNode?: (node: null) => void;
  data?: {
    query?: string;
    sql_query?: string;
    table_name?: string;
  };
  onChange?: (_data: { sql_query: string; table_name?: string }) => void;
  onDeleteNode?: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  /** When true, renders only the form without BaseEditorWrapper */
  compact?: boolean;
};

import { Input } from '@/components/shared/form/Input';
import { TextArea } from '@/components/shared/form/Field';

const SqlTransformEditor: React.FC<SqlTransformEditorProps> = ({
  onClose,
  setSelectedNode,
  data,
  onChange,
  onDeleteNode,
  onValidate,
  compact = false,
}) => {
  // สร้าง Internal state! โดยใช้ data?.query หรือ string ว่างเป็นค่าเริ่มต้น
  const [tableName, setTableName] = useState(data?.table_name || '');
  const [query, setQuery] = useState(data?.sql_query || data?.query || '');
  const [touched, setTouched] = useState(false);

  // Sync prop -> state if data changes
  // รวม data?.query เข้ากับ state ปัจจุบัน เพื่อให้แน่ใจว่าค่าถูกต้อง
  useEffect(() => {
    setTableName(data?.table_name || '');
    setQuery(data?.sql_query || data?.query || '');
  }, [data?.table_name, data?.sql_query, data?.query]);

  // ตรวจสอบความถูกต้อง: query ต้องไม่ว่างเปล่า
  const isValid = query.trim().length > 0;
  const stable = (v: any): any => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o,k)=>{o[k]=((v as any)[k]);return o;},{} as any) : v;
  const canonical = (d: any) => ({ table_name: d?.table_name||'', sql_query: d?.sql_query||d?.query||'' });
  const isDirty = useMemo(() => JSON.stringify(stable(canonical({ table_name: tableName, sql_query: query }))) !== JSON.stringify(stable(canonical(data||{}))), [tableName, query, data]);

  // Notify parent of validation changes
  useEffect(() => {
    if (onValidate) {
      const errors: string[] = [];
      if (!query.trim()) errors.push('SQL query is required');
      onValidate(isValid, errors);
    }
  }, [isValid, query, onValidate]);

  // In compact mode, propagate changes immediately
  useEffect(() => {
    if (compact && onChange) {
      onChange({ sql_query: query, table_name: tableName });
    }
  }, [compact, query, tableName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || !isDirty) return; // ถ้าข้อมูลไม่ถูกต้องหรือไม่มีการเปลี่ยน ไม่ต้องทำอะไรต่อ

    if (onChange) onChange({ sql_query: query, table_name: tableName });

    // ปิด Editor หลังจาก Save
    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  const handleClose = () => {
    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  // Form content - shared between compact and full mode
  const formContent = (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-text-secondary">
        Table Name (optional)
      </label>
      <Input
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
        placeholder="temp_table"
      />
      <label className="text-sm font-medium text-text-secondary">
        SQL Query
      </label>
      <TextArea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTouched(true)}
        className={`min-h-[8rem] font-mono ${
          touched && !isValid ? 'ring-error/50' : ''
        }`}
        placeholder="SELECT * FROM input"
        rows={10}
      />
      {touched && !isValid && (
        <span className="text-xs text-error mt-1">Query is required.</span>
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
      title="SQL Transform"
      icon={<DatabaseIcon size={28} />}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isValid={isValid && isDirty}
      initialValues={canonical(data || {})}
      currentValues={{ table_name: tableName, sql_query: query }}
      onDeleteNode={onDeleteNode}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default SqlTransformEditor;