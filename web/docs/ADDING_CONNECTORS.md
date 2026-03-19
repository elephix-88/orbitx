# Adding New Connectors to OrbitX

This guide explains how to add a new data connector (e.g., LinkedIn Ads, TikTok Ads) to the OrbitX frontend.

## Prerequisites

Before starting, ensure:
1. Backend API endpoints are implemented for the connector
2. OAuth connection flow is set up (if required)
3. You understand the connector's data schema

## Quick Start

Adding a new connector involves 4 steps:

1. **Create the Editor Component** - Using the editor factory
2. **Create the Node Spec** - Using the node spec helper
3. **Register the Node** - Add to the registry
4. **Test** - Write tests using test utilities

**Estimated time: 2-4 hours**

---

## Step 1: Create the Editor Component

Use the `createConnectorEditor` factory for consistent editor behavior.

### Option A: Simple Editor (Factory Pattern)

For connectors with standard fields (connection, accounts, fields, date range):

```typescript
// src/nodes/Editors/source/LinkedInAdsEditor.tsx
import React from 'react';
import { Settings, Database } from 'lucide-react';
import { createConnectorEditor, DATE_PRESET_OPTIONS } from '@/components/editors/createConnectorEditor';
import { ConnectionSelector } from '@/components/forms/fields/ConnectionSelector';
import { AccountSelector } from '@/components/forms/fields/AccountSelector';
import { FieldSelector } from '@/components/forms/fields/FieldSelector';
import { DateRangeSelector, TimeConfig } from '@/components/forms/fields/DateRangeSelector';

// Define form data type
interface LinkedInAdsFormData {
  connectionId: string;
  accountIds: string[];
  fields: string[];
  timeConfig: TimeConfig;
}

// Define backend data type (for type safety)
interface LinkedInAdsNodeData {
  connection_id?: string;
  ad_account_id?: string[];
  fields?: string[];
  time_config?: TimeConfig;
}

export const LinkedInAdsEditor = createConnectorEditor<LinkedInAdsFormData, LinkedInAdsNodeData>({
  title: 'LinkedIn Ads',

  sections: [
    {
      id: 'connection',
      title: 'Connection',
      icon: <Settings className="w-5 h-5" />,
      iconColor: 'bg-blue-500/10 text-blue-500',
    },
    {
      id: 'data',
      title: 'Data Options',
      icon: <Database className="w-5 h-5" />,
      iconColor: 'bg-green-500/10 text-green-500',
    },
  ],

  fields: [
    {
      key: 'connectionId',
      label: 'LinkedIn Ads Connection',
      section: 'connection',
      type: 'connection',
      serviceName: 'LinkedInAds',
      required: true,
      render: ({ value, onChange }) => (
        <ConnectionSelector
          value={value as string}
          onChange={onChange}
          serviceName="LinkedInAds"
          label="LinkedIn Ads Connection"
        />
      ),
    },
    {
      key: 'accountIds',
      label: 'Ad Accounts',
      section: 'connection',
      type: 'account-select',
      required: true,
      render: ({ value, onChange, formData }) => (
        <AccountSelector
          value={value as string[]}
          onChange={onChange}
          connectionId={formData.connectionId}
          fetchUrl="/api/linkedin/accounts"
        />
      ),
    },
    {
      key: 'fields',
      label: 'Select Fields',
      section: 'data',
      type: 'field-select',
      render: ({ value, onChange }) => (
        <FieldSelector
          value={value as string[]}
          onChange={onChange}
          fetchUrl="/api/linkedin/fields"
          placeholder="Search LinkedIn Ads fields..."
        />
      ),
    },
    {
      key: 'timeConfig',
      label: 'Date Range',
      section: 'data',
      type: 'date-preset',
      options: DATE_PRESET_OPTIONS,
      render: ({ value, onChange }) => (
        <DateRangeSelector
          value={value as TimeConfig}
          onChange={onChange}
        />
      ),
    },
  ],

  defaultValues: {
    connectionId: '',
    accountIds: [],
    fields: [],
    timeConfig: { time_preset: 'last_7_days', time_increment: 1 },
  },

  fromNodeData: (nodeData) => ({
    connectionId: nodeData?.connection_id || '',
    accountIds: nodeData?.ad_account_id || [],
    fields: nodeData?.fields || [],
    timeConfig: nodeData?.time_config || { time_preset: 'last_7_days', time_increment: 1 },
  }),

  toCanonical: (formData) => ({
    connectionId: formData.connectionId || '',
    accountIds: Array.isArray(formData.accountIds) ? formData.accountIds : [],
    fields: Array.isArray(formData.fields) ? formData.fields : [],
    timeConfig: formData.timeConfig || { time_preset: 'last_7_days', time_increment: 1 },
  }),

  validate: (formData) => {
    return Boolean(formData.connectionId?.trim()) && formData.accountIds.length > 0;
  },
});

export default LinkedInAdsEditor;
```

### Option B: Custom Editor (Extended BaseEditorWrapper)

For connectors with complex/unique requirements:

```typescript
// src/nodes/Editors/source/CustomConnectorEditor.tsx
import React, { useState, useMemo, useRef } from 'react';
import BaseEditorWrapper from '@/components/editors/BaseEditorWrapper';
import { ConnectionSelector } from '@/components/forms/fields/ConnectionSelector';
// ... other imports

const CustomConnectorEditor: React.FC<EditorProps> = ({ data, onChange, onClose }) => {
  const [form, setForm] = useState({...});

  const isValid = useMemo(() => {
    // Custom validation logic
  }, [form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onChange(form);
    onClose();
  };

  return (
    <BaseEditorWrapper
      title="Custom Connector"
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={isValid}
      initialValues={form}
      currentValues={form}
    >
      {/* Custom form content */}
    </BaseEditorWrapper>
  );
};

export default CustomConnectorEditor;
```

---

## Step 2: Create the Node Spec

Use `createSourceNodeSpec` for source connectors:

```typescript
// src/workflow/node-specs/linkedin.ads.ts
import { z } from 'zod';
import LinkedInAdsEditor from '@/nodes/Editors/source/LinkedInAdsEditor';
import {
  createSourceNodeSpec,
  connectionFieldMapping,
  accountIdsFieldMapping,
  fieldsArrayMapping,
  timeConfigFieldMapping,
} from './createNodeSpec';

// Define Zod schema for validation
const linkedInAdsSchema = z.object({
  connectionId: z.string().optional(),
  accountIds: z.array(z.string()).default([]),
  fields: z.array(z.string()).default([]),
  timeConfig: z.object({
    time_preset: z.string().default('last_7_days'),
    time_increment: z.number().default(1),
  }).optional(),
});

export const linkedInAdsSourceSpec = createSourceNodeSpec({
  typeId: 'linkedin.ads',
  displayName: 'LinkedIn Ads',
  icon: 'Linkedin',
  color: '#0A66C2',
  backendNodeId: 'linkedin_ads',
  paramsSchema: linkedInAdsSchema,
  defaults: {
    connectionId: '',
    accountIds: [],
    fields: [],
    timeConfig: { time_preset: 'last_7_days', time_increment: 1 },
  },
  editor: LinkedInAdsEditor,
  fieldMappings: [
    connectionFieldMapping('connectionId', 'connection_id'),
    accountIdsFieldMapping('accountIds', 'ad_account_id'),
    fieldsArrayMapping('fields', 'fields'),
    timeConfigFieldMapping('timeConfig', 'time_config'),
  ],
});
```

---

## Step 3: Register the Node

Add the node spec to the registry:

```typescript
// src/workflow/registry.ts
import { linkedInAdsSourceSpec } from './node-specs/linkedin.ads';

export const nodeRegistry = {
  // Existing nodes...
  'linkedin.ads': linkedInAdsSourceSpec,
};
```

---

## Step 4: Write Tests

Use the test utilities for comprehensive testing:

```typescript
// tests/nodes/Editors/LinkedInAdsEditor.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@tests/utils/test-utils';
import { mockConnectionService } from '@tests/mocks/services';
import LinkedInAdsEditor from '@/nodes/Editors/source/LinkedInAdsEditor';

describe('LinkedInAdsEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectionService.getConnections.mockResolvedValue([
      { id: 'conn-1', name: 'LinkedIn Connection 1' },
    ]);
  });

  it('renders with default values', async () => {
    renderWithProviders(
      <LinkedInAdsEditor
        data={{}}
        onChange={mockOnChange}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('LinkedIn Ads')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('LinkedIn Ads Connection')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(
      <LinkedInAdsEditor
        data={{}}
        onChange={mockOnChange}
        onClose={mockOnClose}
      />
    );

    // Save button should be disabled without required fields
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('loads existing data correctly', async () => {
    renderWithProviders(
      <LinkedInAdsEditor
        data={{
          connection_id: 'conn-1',
          ad_account_id: ['acc-1', 'acc-2'],
          fields: ['impressions', 'clicks'],
        }}
        onChange={mockOnChange}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(mockConnectionService.getConnections).toHaveBeenCalled();
    });
  });

  it('submits correct data format', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <LinkedInAdsEditor
        data={{
          connection_id: 'conn-1',
          ad_account_id: ['acc-1'],
        }}
        onChange={mockOnChange}
        onClose={mockOnClose}
      />
    );

    // Wait for form to be valid
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

---

## Available Form Field Components

### ConnectionSelector

Fetches and displays OAuth connections for a specific service.

```typescript
<ConnectionSelector
  value={connectionId}
  onChange={setConnectionId}
  serviceName="GoogleAds"  // Filter by service
  label="Google Ads Connection"
  autoSelectSingle={true}  // Auto-select if only one
/>
```

### AccountSelector

Multi-select for ad accounts fetched from an API.

```typescript
<AccountSelector
  value={accountIds}
  onChange={setAccountIds}
  connectionId={connectionId}  // Dependency
  fetchUrl="/api/google/google_ads/accounts"
  label="Ad Accounts"
/>
```

### FieldSelector

Multi-select for data fields with search.

```typescript
<FieldSelector
  value={fields}
  onChange={setFields}
  fetchUrl="/api/google/google_ads/fields"
  label="Select Fields"
  maxHeight="400px"
/>
```

### DateRangeSelector

Date preset and time increment selector.

```typescript
<DateRangeSelector
  value={timeConfig}
  onChange={setTimeConfig}
  showIncrement={true}  // Show daily/weekly breakdown
/>
```

---

## Field Mapping Utilities

For converting between frontend and backend field formats:

```typescript
import { createFieldMapper, ensureArray, ensureString } from '@/utils/fieldMapping';

const mapper = createFieldMapper<FrontendType, BackendType>([
  { frontend: 'connectionId', backend: 'connection_id' },
  { frontend: 'accountIds', backend: 'ad_account_id', toBackend: ensureArray },
  { frontend: 'startDate', backend: 'start_date', defaultValue: null },
]);

// Convert frontend -> backend
const backendData = mapper.toBackend(formData);

// Convert backend -> frontend
const frontendData = mapper.fromBackend(apiResponse);
```

---

## Checklist

Before merging, verify:

- [ ] Editor renders correctly with default values
- [ ] Editor loads existing node data correctly
- [ ] Validation prevents saving invalid data
- [ ] Save button submits correct data format
- [ ] Cancel button closes without saving
- [ ] All fields are properly labeled
- [ ] Loading states are handled
- [ ] Error states are displayed
- [ ] Tests pass with good coverage
- [ ] Node appears in the workflow palette
- [ ] Can create and save a workflow with the new node

---

## Common Issues

### Fields not mapping correctly

Check that `fieldMappings` in the node spec match the backend API format. Use the browser devtools to inspect API requests/responses.

### Connection not showing

Ensure the `serviceName` matches exactly what the backend uses (case-sensitive).

### Accounts not loading

Verify the `fetchUrl` includes the correct query parameter format for the connection ID.

### Form not validating

Check the `validate` function returns `true` only when all required fields are filled.
