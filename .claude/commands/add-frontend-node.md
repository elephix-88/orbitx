# Add Frontend Node

You are a senior frontend engineer adding a new node type to the OrbitX workflow builder. You will scaffold the node-spec, editor component, and registry entry following the exact patterns in the codebase.

## Input

The user will provide:
- Node name (e.g., "LinkedIn Ads", "Postgres", "Filter")
- Category: SOURCE, TRANSFORM, or DESTINATION
- Backend `node_id` (e.g., "linkedin_ads", "postgres", "filter")
- Backend `node_type` (e.g., "source", "transform", "destinations")
- Config fields the editor needs (e.g., "connection_id, fields, time_config")

## Before Writing Any Code

Read these files first using `read_file` to confirm current patterns haven't changed:

```
web/src/workflow/node-specs/types.ts                        ← NodeSpec and Port types
web/src/workflow/registry.ts                                ← how specs are registered
web/src/workflow/connectionRules.ts                         ← connection rule system
web/src/data/nodeTypes.ts                                   ← legacy node type list
```

Then read one existing spec + editor in the same category as the new node:

- SOURCE: `web/src/workflow/node-specs/google.ads.ts` + `web/src/nodes/Editors/source/GoogleAdsEditor.tsx`
- TRANSFORM: `web/src/workflow/node-specs/transform.column-editor.ts` + `web/src/nodes/Editors/transform/ColumnEditorEditor.tsx`
- DESTINATION: `web/src/workflow/node-specs/dest.bigquery.ts` + `web/src/nodes/Editors/destination/BigQueryEditor.tsx`

## File Generation

### 1. Node Spec: `web/src/workflow/node-specs/{typeId}.ts`

**Naming convention for typeId:**
- Sources: `{platform}.{product}` (e.g., `google.ads`, `linkedin.ads`)
- Transforms: `transform.{name}` (e.g., `transform.sql`, `transform.filter`)
- Destinations: `dest.{name}` (e.g., `dest.bigquery`, `dest.postgres`)
- Logic nodes: `logic.{name}` (e.g., `logic.if`, `logic.switch`)

**File naming convention:** Replace dots with dots in filename (e.g., `google.ads.ts`, `dest.bigquery.ts`)

Follow this exact structure:

```typescript
import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const {Name}Editor = lazy(() => import('@/nodes/Editors/{category}/{Name}Editor'));

export const {camelCaseName}Spec: NodeSpec = {
  typeId: '{typeId}',
  displayName: '{Display Name}',
  category: '{CATEGORY}',
  icon: '{IconName}',
  color: '{hexColor}',
  ports: [
    // SOURCE: only output
    // { id: 'out', name: 'Output', io: 'output', dataType: 'records' },

    // TRANSFORM: input + output
    // { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    // { id: 'out', name: 'Output', io: 'output', dataType: 'records' },

    // DESTINATION: only input
    // { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
  ],
  defaults: {
    // Default values for all config fields
  },
  paramsSchema: z.object({
    // Zod schema matching the defaults
  }),
  ui: { editor: {Name}Editor },
  adapters: {
    toBackend: (p) => ({
      node_id: '{backend_node_id}',
      node_type: '{backend_node_type}',
      parameters: {
        // Map frontend param names to backend param names
        // Frontend uses camelCase, backend uses snake_case
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: '{typeId}',
      params: {
        // Map backend param names back to frontend param names
        // Include safe defaults for missing fields
      },
    }),
  },
};
```

**Color conventions:**
- SOURCE: `#3B82F6` (blue)
- TRANSFORM: `#F59E0B` (amber)
- DESTINATION: `#10B981` (green)

**Icon conventions:**
- Use Lucide icon names (e.g., `Database`, `Columns3`, `GitBranch`)
- For platform icons, use brand icon name (e.g., `GoogleAds`, `Facebook`, `TikTok`)

**Adapter rules (CRITICAL — most common source of bugs):**
- `toBackend` must handle missing/undefined fields with safe defaults
- `fromBackend` must handle multiple possible field name formats (for backwards compatibility)
- Always use `|| []` for array fields, `|| ''` for string fields
- Never assume a field exists in the parameters — always provide fallback

### 2. Editor Component: `web/src/nodes/Editors/{category}/{Name}Editor.tsx`

```typescript
import React, { useState, useEffect, useMemo, useRef } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Field, TextInput } from '@/components/shared/form/Field';
import { {Icon} } from 'lucide-react';

type {Name}EditorProps = {
  nodeId?: string;
  data?: Record<string, unknown>;
  onChange?: (data: Record<string, unknown>) => void;
  onClose: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  compact?: boolean;
};

const {Name}Editor: React.FC<{Name}EditorProps> = ({
  onClose,
  data,
  onChange,
  onValidate,
  compact = false,
}) => {
  // 1. State initialization from data prop
  const [field1, setField1] = useState((data?.field1 as string) || '');
  const [touched, setTouched] = useState(false);

  // 2. Sync data prop to state
  useEffect(() => {
    if (data) {
      setField1((data.field1 as string) || '');
    }
  }, [data]);

  // 3. Validation
  const isValid = field1.trim().length > 0;

  // 4. Dirty check
  const isDirty = useMemo(() => {
    return JSON.stringify({ field1 }) !== JSON.stringify({
      field1: (data?.field1 as string) || '',
    });
  }, [field1, data]);

  // 5. Callback refs to prevent infinite loops
  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 6. Notify parent of validation changes
  const prevValidationRef = useRef<{ isValid: boolean; errorCount: number } | null>(null);
  useEffect(() => {
    const errors: string[] = [];
    if (!field1.trim()) errors.push('Field1 is required');

    const current = { isValid, errorCount: errors.length };
    if (onValidateRef.current && (!prevValidationRef.current ||
        prevValidationRef.current.isValid !== current.isValid ||
        prevValidationRef.current.errorCount !== current.errorCount)) {
      prevValidationRef.current = current;
      onValidateRef.current(isValid, errors);
    }
  }, [isValid, field1]);

  // 7. Compact mode: propagate changes immediately
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (compact && onChangeRef.current) {
      onChangeRef.current({ field1 });
    }
  }, [compact, field1]);

  // 8. Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || !isDirty) return;
    if (onChange) onChange({ field1 });
    onClose();
  };

  const formContent = (
    <>
      <Field label="Field 1" htmlFor="field1"
             error={touched && !field1.trim() ? 'Field 1 is required.' : ''}>
        <TextInput id="field1" value={field1}
                   onChange={(e) => setField1(e.target.value)}
                   onBlur={() => setTouched(true)}
                   placeholder="Enter value"
                   hasError={touched && !field1.trim()} />
      </Field>
    </>
  );

  if (compact) {
    return <div className="space-y-4">{formContent}</div>;
  }

  return (
    <BaseEditorWrapper
      title="{Display Name}"
      icon={<{Icon} className="w-7 h-7" />}
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={isValid && isDirty}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default {Name}Editor;
```

**Editor rules (CRITICAL — most common source of bugs):**
- Always use `useRef` for `onChange` and `onValidate` callbacks to prevent infinite re-render loops
- Track `hasMountedRef` to skip first-render propagation in compact mode
- Track `prevValidationRef` to only fire onValidate when validation state actually changes
- Compact mode propagates changes immediately via useEffect; full mode only on submit
- Use `isDirty` to prevent submitting unchanged data
- Always sync `data` prop to state via useEffect (data can change from outside)

### 3. Registry Update: `web/src/workflow/registry.ts`

Add import and registry entry:

```typescript
import { {camelCaseName}Spec } from './node-specs/{typeId}';

// In nodeRegistry object:
'{typeId}': {camelCaseName}Spec,
```

### 4. Legacy Node Types (if still used): `web/src/data/nodeTypes.ts`

Add entry to the `nodeTypes` array:

```typescript
{
  type: '{category_lowercase}',
  name: '{Display Name}',
  description: '{Short description}',
  category: NodeCategory.{CATEGORY},
  icon: '{IconName}',
  color: '{hexColor}',
  inputs: [{category === 'source' ? '' : "{ id: 'in', name: 'Input' }"}],
  outputs: [{category === 'destination' ? '' : "{ id: 'out', name: 'Output' }"}],
  defaultData: { /* same as spec defaults */ },
}
```

## Checklist Before Finishing

- [ ] Node spec file created with correct typeId, ports, defaults, Zod schema, and adapters
- [ ] `toBackend` adapter handles all fields with safe defaults (no undefined values sent to API)
- [ ] `fromBackend` adapter handles missing fields and legacy field names
- [ ] Editor component created with both compact and full modes
- [ ] Editor uses callback refs for onChange/onValidate (prevents infinite loops)
- [ ] Editor has dirty checking (prevents submitting unchanged data)
- [ ] Editor has validation with error messages
- [ ] Registry updated with import and entry
- [ ] Legacy nodeTypes.ts updated if still in use
- [ ] Icon exists in Lucide or brand icons (check `web/src/components/icons/`)
- [ ] Run `cd web && npx tsc --noEmit` to verify TypeScript compiles
- [ ] Run `cd web && npm run lint` to verify ESLint passes

## Code Style Rules

- Use Tailwind CSS token classes — no hardcoded hex colors in TSX
- Use `cn()` from `web/src/lib/utils.ts` for conditional class merging
- Zod for validation schemas — no manual validation
- No `any` types — use `Record<string, unknown>` instead
- Lazy load editor components in node specs
