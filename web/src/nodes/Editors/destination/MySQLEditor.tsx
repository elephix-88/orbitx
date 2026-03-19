// src/nodes/Editors/destination/MySQLEditor.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Field, TextInput } from '@/components/shared/form/Field';
import { MySQLIcon } from '@/components/icons/BrandIcons';

// กำหนด Type สำหรับ Props ของ MySQLEditor
type MySQLEditorProps = {
  nodeId?: string;
  onClose: () => void; // Function สำหรับปิด Modal
  setSelectedNode?: (node: null) => void; // Optional: สำหรับการ clear selected node ใน ReactFlow
  data?: Record<string, unknown>; // Optional: initial data for the node
  onChange?: (_data: any) => void; // Optional: Function สำหรับส่งข้อมูลที่แก้ไขกลับไป
  onDeleteNode?: () => void; // Optional: สำหรับการลบ Node
  onValidate?: (valid: boolean, errors: string[]) => void;
  /** When true, renders only the form without BaseEditorWrapper */
  compact?: boolean;
};

const stable = (v: any): any => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o,k)=>{o[k]=stable(v[k]);return o;},{} as any) : v;

const MySQLEditor: React.FC<MySQLEditorProps> = ({
  onClose,
  setSelectedNode,
  data,
  onChange,
  onDeleteNode,
  onValidate,
  compact = false,
}) => {
  const [host, setHost] = useState((data?.host as string) || '');
  const [database, setDatabase] = useState((data?.database as string) || '');
  const [table, setTable] = useState((data?.table as string) || '');
  const [username, setUsername] = useState((data?.username as string) || '');
  const [port, setPort] = useState((data?.port as string) || '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (data) {
      setHost((data.host as string) || '');
      setDatabase((data.database as string) || '');
      setTable((data.table as string) || '');
      setUsername((data.username as string) || '');
      setPort((data.port as string) || '');
    }
  }, [data]);

  const isValid =
    host.trim().length > 0 &&
    database.trim().length > 0 &&
    table.trim().length > 0 &&
    username.trim().length > 0;

  const canonical = (d: any) => ({ host: d.host||'', port: d.port||'', database: d.database||'', table: d.table||'', username: d.username||'' });
  const isDirty = useMemo(() => {
    const current = { host, port, database, table, username } as any;
    return JSON.stringify(stable(canonical(current))) !== JSON.stringify(stable(canonical(data||{})));
  }, [host, port, database, table, username, data]);

  // Use refs for callbacks to avoid infinite loops
  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track previous validation state to avoid unnecessary calls
  const prevValidationRef = useRef<{ isValid: boolean; errorCount: number } | null>(null);

  // Notify parent of validation changes
  useEffect(() => {
    const errors: string[] = [];
    if (!host.trim()) errors.push('Host is required');
    if (!database.trim()) errors.push('Database is required');
    if (!table.trim()) errors.push('Table is required');
    if (!username.trim()) errors.push('Username is required');

    const currentValidation = { isValid, errorCount: errors.length };
    if (
      onValidateRef.current &&
      (!prevValidationRef.current ||
        prevValidationRef.current.isValid !== currentValidation.isValid ||
        prevValidationRef.current.errorCount !== currentValidation.errorCount)
    ) {
      prevValidationRef.current = currentValidation;
      onValidateRef.current(isValid, errors);
    }
  }, [isValid, host, database, table, username]);

  // Track if we've done initial mount to avoid propagating on first render
  const hasMountedRef = useRef(false);

  // In compact mode, propagate changes immediately
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (compact && onChangeRef.current) {
      onChangeRef.current({ host, database, table, username, port });
    }
  }, [compact, host, database, table, username, port]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || !isDirty) return;

    if (onChange) {
      onChange({ host, database, table, username, port });
    }

    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  const handleClose = () => {
    if (setSelectedNode) setSelectedNode(null);
    else onClose();
  };

  // Form content - shared between compact and full mode
  const formContent = (
    <>
      <Field label="Host" htmlFor="host" error={touched && !host.trim() ? 'Host is required.' : ''}>
        <TextInput id="host" value={host} onChange={(e) => setHost(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. localhost" hasError={touched && !host.trim()} />
      </Field>

      <Field label="Port (Optional)" htmlFor="port">
        <TextInput id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="e.g. 3306" />
      </Field>

      <Field label="Database" htmlFor="database" error={touched && !database.trim() ? 'Database is required.' : ''}>
        <TextInput id="database" value={database} onChange={(e) => setDatabase(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. mydatabase" hasError={touched && !database.trim()} />
      </Field>

      <Field label="Table" htmlFor="table" error={touched && !table.trim() ? 'Table is required.' : ''}>
        <TextInput id="table" value={table} onChange={(e) => setTable(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. mytable" hasError={touched && !table.trim()} />
      </Field>

      <Field label="Username" htmlFor="username" error={touched && !username.trim() ? 'Username is required.' : ''}>
        <TextInput id="username" value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. root" hasError={touched && !username.trim()} />
      </Field>
    </>
  );

  // Compact mode - render just the form without wrapper
  if (compact) {
    return <div className="space-y-4">{formContent}</div>;
  }

  // Full mode - render with BaseEditorWrapper
  return (
    <BaseEditorWrapper
      title="MySQL"
      icon={<MySQLIcon size={28} />}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isValid={isValid && isDirty}
      initialValues={canonical(data || {})}
      currentValues={canonical({ host, port, database, table, username })}
      onDeleteNode={onDeleteNode}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default MySQLEditor;