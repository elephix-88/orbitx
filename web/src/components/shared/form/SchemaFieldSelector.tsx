import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Check, Key, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SchemaField {
  id: string;
  label: string;
  type?: string;
  isKey?: boolean;
  group?: string;
  description?: string;
}

interface SchemaFieldSelectorProps {
  fields: SchemaField[];
  selectedIds: string[];
  onChange: (_ids: string[]) => void;
  loading?: boolean;
  className?: string;
  placeholder?: string;
}

export function SchemaFieldSelector({
  fields,
  selectedIds,
  onChange,
  loading = false,
  className,
  placeholder = "Search fields..."
}: SchemaFieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // On first load, expand groups that contain selected fields
  React.useEffect(() => {
    if (fields.length > 0 && !initialized) {
      const selectedFieldIds = new Set(selectedIds);
      const groupsWithSelections = new Set<string>();

      fields.forEach(f => {
        if (selectedFieldIds.has(f.id)) {
          groupsWithSelections.add(f.group || 'General');
        }
      });

      setExpandedGroups(groupsWithSelections);
      setInitialized(true);
    }
  }, [fields, selectedIds, initialized]);

  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) {
      next.delete(group);
    } else {
      next.add(group);
    }
    setExpandedGroups(next);
  };

  const groupedFields = useMemo(() => {
    const filtered = fields.filter(f =>
      !searchTerm ||
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.group && f.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groups: Record<string, SchemaField[]> = {};
    filtered.forEach(f => {
      const g = f.group || 'General';
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    });

    return groups;
  }, [fields, searchTerm]);

  // Count selected fields per group
  const selectedCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    fields.forEach(f => {
      const g = f.group || 'General';
      if (!counts[g]) counts[g] = 0;
      if (selectedIds.includes(f.id)) counts[g]++;
    });
    return counts;
  }, [fields, selectedIds]);

  const handleSelectAll = (groupFields: SchemaField[]) => {
    const idsToAdd = groupFields.map(f => f.id).filter(id => !selectedIds.includes(id));
    onChange([...selectedIds, ...idsToAdd]);
  };

  const handleClearGroup = (groupFields: SchemaField[]) => {
    const idsToRemove = new Set(groupFields.map(f => f.id));
    onChange(selectedIds.filter(id => !idsToRemove.has(id)));
  };

  const toggleField = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(current => current !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const clearSearch = () => setSearchTerm('');

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="flex items-center gap-3 text-text-tertiary">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading fields...</span>
        </div>
      </div>
    );
  }

  const groupNames = Object.keys(groupedFields).sort();
  const hasGroups = groupNames.length > 1 || (groupNames.length === 1 && groupNames[0] !== 'General');

  return (
    <div className={cn("space-y-2", className)}>
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-surface-primary/95 backdrop-blur-sm pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-secondary border border-border-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 text-text-primary placeholder:text-text-tertiary transition-all text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Fields List - Flat design */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-lg overflow-hidden">
        {groupNames.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            No fields found matching "{searchTerm}"
          </div>
        ) : (
          groupNames.map((group, groupIndex) => {
            const groupFields = groupedFields[group];
            const isExpanded = expandedGroups.has(group) || searchTerm.length > 0;
            const selectedInGroup = selectedCountByGroup[group] || 0;
            const allSelected = groupFields.every(f => selectedIds.includes(f.id));
            const someSelected = selectedInGroup > 0 && !allSelected;

            return (
              <div key={group}>
                {/* Group Header */}
                {hasGroups && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className={cn(
                      "w-full px-3 py-2.5 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors",
                      groupIndex > 0 && "border-t border-border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}>
                        <ChevronRight className="w-4 h-4 text-text-tertiary" />
                      </div>

                      <span className="text-sm font-medium text-text-primary">
                        {group}
                      </span>

                      <span className="text-xs text-text-tertiary">
                        {groupFields.length}
                      </span>

                      {selectedInGroup > 0 && (
                        <span className="text-xs text-brand-500 font-medium">
                          {selectedInGroup} selected
                        </span>
                      )}
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        allSelected ? handleClearGroup(groupFields) : handleSelectAll(groupFields);
                      }}
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded transition-colors",
                        allSelected
                          ? "text-red-500 hover:bg-red-500/10"
                          : "text-brand-500 hover:bg-brand-500/10"
                      )}
                    >
                      {allSelected ? 'Clear All' : someSelected ? 'Select Rest' : 'Select All'}
                    </div>
                  </button>
                )}

                {/* Fields */}
                {(!hasGroups || isExpanded) && (
                  <div className={cn(
                    hasGroups && "border-t border-border-primary/30"
                  )}>
                    {groupFields.map(field => {
                      const isSelected = selectedIds.includes(field.id);
                      return (
                        <label
                          key={field.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-b border-border-primary/20 last:border-b-0",
                            isSelected
                              ? "bg-brand-500/5 hover:bg-brand-500/10"
                              : "hover:bg-surface-secondary/50"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                            isSelected
                              ? "bg-brand-500 border-brand-500 text-white"
                              : "border-border-primary bg-surface-primary"
                          )}>
                            {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() => toggleField(field.id)}
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={cn(
                              "text-sm truncate",
                              isSelected ? "text-brand-600 dark:text-brand-400 font-medium" : "text-text-primary"
                            )}>
                              {field.label}
                            </span>

                            {field.isKey && (
                              <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>

                          {field.type && (
                            <span className="text-[10px] text-text-tertiary flex-shrink-0">
                              {field.type}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
