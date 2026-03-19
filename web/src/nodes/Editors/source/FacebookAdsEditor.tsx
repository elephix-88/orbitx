// src/nodes/Editors/source/FacebookAdsEditor.tsx
import React, { useRef, useState, useEffect } from 'react';
import { FacebookAdsForm } from '../../../components/forms/FacebookAdsForm';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { FacebookIcon } from '@/components/icons/BrandIcons';

interface FacebookAdsFormData {
  connection_id: string;
  ad_account_id: string[];
  fields: string[];
  time_config: {
    time_preset: string;
    time_increment: number;
  };
}

type FacebookAdsEditorProps = {
  nodeId?: string;
  onClose?: () => void;
  setSelectedNode?: (node: null) => void;
  data?: Partial<FacebookAdsFormData>;
  onChange?: (_data: FacebookAdsFormData) => void;
  onDeleteNode?: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  /** When true, renders only the form without BaseEditorWrapper */
  compact?: boolean;
};

const FacebookAdsEditor: React.FC<FacebookAdsEditorProps> = ({
  data,
  onChange,
  onClose,
  onValidate,
  compact = false,
}) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const formData = data as FacebookAdsFormData;
  const [draft, setDraft] = useState<FacebookAdsFormData>({
    connection_id: formData.connection_id || '',
    ad_account_id: formData.ad_account_id || [],
    fields: formData.fields || [],
    time_config: formData.time_config || {
      time_preset: 'last_7_days',
      time_increment: 1
    },
  });

  const handleFormChange = (newData: FacebookAdsFormData) => {
    setDraft(newData);
    // In compact mode, immediately propagate changes
    if (compact && onChange) {
      onChange(newData);
    }
  };

  const handleValidation = (_valid: boolean, errors: string[]) => {
    setValidationErrors(errors);
    // Forward validation to parent if provided
    if (onValidate) {
      onValidate(_valid, errors);
    }
  };

  // Strict validation: connection must be selected from backend-provided list and at least one field selected
  const connectionId = draft.connection_id || (draft as any).accessToken || '';
  const fields = draft.fields || (draft as any).selectedFields || [];
  const isEditorValid = Boolean(connectionId.trim()) && Array.isArray(fields) && fields.length > 0;

  // Notify parent of validation state changes
  useEffect(() => {
    if (onValidate) {
      const errors: string[] = [];
      if (!connectionId.trim()) errors.push('Please select a connection');
      if (!Array.isArray(fields) || fields.length === 0) errors.push('Please select at least one field');
      onValidate(isEditorValid, errors);
    }
  }, [isEditorValid, connectionId, fields, onValidate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditorValid) return;
    if (onChange) onChange(draft);
    if (onClose) onClose();
  };

  const canonical = (d: Partial<FacebookAdsFormData> | undefined) => {
    const anyd = (d || {}) as any;
    const connection = d?.connection_id || anyd.token_id || anyd.connection_id || anyd.accessToken || '';
    const acct = Array.isArray(d?.ad_account_id) ? d.ad_account_id : (Array.isArray(anyd.ad_account_id) ? anyd.ad_account_id : (Array.isArray(anyd.adAccountId) ? anyd.adAccountId : []));
    const fieldsArr = Array.isArray(d?.fields)
      ? d!.fields
      : (Array.isArray(anyd.fields) ? anyd.fields : (Array.isArray(anyd.selectedFields) ? anyd.selectedFields : []));
    const timeConfig = d?.time_config || anyd?.time_config || { time_preset: 'last_7_days', time_increment: 1 };
    return {
      connection_id: connection,
      ad_account_id: acct,
      // Avoid re-sorting to prevent flickers on selection toggles
      fields: [...fieldsArr],
      time_config: timeConfig,
    };
  };
  const initialSnapshotRef = useRef(canonical(data) || canonical(draft));

  // Compact mode - render just the form without wrapper
  if (compact) {
    return (
      <div className="space-y-4">
        <FacebookAdsForm
          initialData={data}
          onChange={handleFormChange}
          onValidate={handleValidation}
        />
      </div>
    );
  }

  // Full mode - render with BaseEditorWrapper
  return (
    <BaseEditorWrapper
      title="Facebook Ads"
      icon={<FacebookIcon size={28} />}
      onClose={onClose ?? (() => {})}
      onSubmit={handleSubmit}
      isValid={isEditorValid}
      initialValues={initialSnapshotRef.current}
      currentValues={canonical(draft)}
    >
      <FacebookAdsForm
        initialData={data}
        onChange={handleFormChange}
        onValidate={handleValidation}
      />
      {validationErrors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-center">
                <span className="mr-2">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </BaseEditorWrapper>
  );
};

export default FacebookAdsEditor;
