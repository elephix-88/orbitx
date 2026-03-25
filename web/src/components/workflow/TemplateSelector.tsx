// =============================================================================
// TemplateSelector - Workflow Template Picker
// =============================================================================
// Modal component for browsing and selecting workflow templates.
// Displays templates with preview, difficulty, and setup time estimates.

import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Clock,
  ArrowRight,
  ChevronRight,
  Search,
  Filter,
  BarChart3,
  Database,
  TrendingUp,
  Merge,
  CheckCircle,
  Workflow,
} from 'lucide-react';
import { FacebookIcon } from '@/components/icons/BrandIcons';
import { cn } from '@/lib/utils';
import {
  workflowTemplates,
  WorkflowTemplate,
  categoryLabels,
  difficultyConfig,
} from '@/data/workflowTemplates';

// =============================================================================
// Types
// =============================================================================

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

// =============================================================================
// Icon Mapping
// =============================================================================

const iconMap: Record<string, React.ElementType> = {
  Facebook: FacebookIcon,
  BarChart3: BarChart3,
  Database: Database,
  TrendingUp: TrendingUp,
  Merge: Merge,
  Workflow: Workflow,
};

const getIcon = (iconName: string): React.ElementType => {
  return iconMap[iconName] || Workflow;
};

// =============================================================================
// Component
// =============================================================================

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WorkflowTemplate['category'] | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    let filtered = [...workflowTemplates];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.sources.some((s) => s.toLowerCase().includes(query)) ||
          t.destinations.some((d) => d.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const handleSelectTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-primary rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10">
              <Sparkles className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Start from Template
              </h2>
              <p className="text-sm text-text-secondary">
                Choose a pre-built workflow to get started quickly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Main content - responsive layout */}
        <div className="flex flex-col md:flex-row md:divide-x divide-border h-[calc(85vh-80px)]">
          {/* Left Panel: Template List */}
          <div className="w-full md:w-2/5 flex flex-col h-1/2 md:h-full border-b md:border-b-0 border-border">
            {/* Search & Filter */}
            <div className="p-4 space-y-3 border-b border-border">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-surface-secondary border-0 text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-tertiary" />
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
                      selectedCategory === 'all'
                        ? 'bg-primary-400 text-neutral-950'
                        : 'text-text-secondary hover:bg-surface-secondary'
                    )}
                  >
                    All
                  </button>
                  {(Object.entries(categoryLabels) as [WorkflowTemplate['category'], string][]).map(
                    ([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
                          selectedCategory === key
                            ? 'bg-primary-400 text-neutral-950'
                            : 'text-text-secondary hover:bg-surface-secondary'
                        )}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Template List - fixed height with scroll */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Workflow className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No templates found</p>
                </div>
              ) : (
                filteredTemplates.map((template) => {
                  const Icon = getIcon(template.icon);
                  const isSelected = selectedTemplate?.id === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl transition-all',
                        isSelected
                          ? 'bg-primary-400/10 border-2 border-primary-400'
                          : 'hover:bg-surface-secondary border-2 border-transparent'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            isSelected
                              ? 'bg-primary-400 text-neutral-950'
                              : 'bg-surface-secondary text-text-secondary'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-text-primary text-sm truncate">
                              {template.name}
                            </h4>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Template Details */}
          <div className="w-full md:w-3/5 flex flex-col h-1/2 md:h-full min-h-0">
            {selectedTemplate ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {/* Template Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      {(() => {
                        const Icon = getIcon(selectedTemplate.icon);
                        return (
                          <div className="p-3 rounded-xl bg-brand-500/10">
                            <Icon className="w-6 h-6 text-brand-500" />
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="text-xl font-semibold text-text-primary">
                          {selectedTemplate.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              difficultyConfig[selectedTemplate.difficulty].color
                            )}
                          >
                            {difficultyConfig[selectedTemplate.difficulty].label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-text-secondary">
                            <Clock className="w-3.5 h-3.5" />
                            {selectedTemplate.estimatedSetupTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  {/* Data Flow */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-text-primary mb-3">
                      Data Flow
                    </h4>
                    <div className="flex items-center gap-3 p-4 bg-surface-secondary rounded-xl">
                      {/* Sources */}
                      <div className="flex-1">
                        <div className="text-xs text-text-secondary mb-2">Sources</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.sources.map((source) => (
                            <span
                              key={source}
                              className="px-2.5 py-1 text-xs font-medium bg-blue-900/30 text-blue-400 rounded-lg"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-text-tertiary" />

                      {/* Destinations */}
                      <div className="flex-1">
                        <div className="text-xs text-text-secondary mb-2">Destinations</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.destinations.map((dest) => (
                            <span
                              key={dest}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-900/30 text-emerald-400 rounded-lg"
                            >
                              {dest}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Setup Tips */}
                  {selectedTemplate.setupTips && selectedTemplate.setupTips.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-text-primary mb-3">
                        Setup Tips
                      </h4>
                      <ul className="space-y-2">
                        {selectedTemplate.setupTips.map((tip, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-text-secondary"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-400/15 text-primary-400 text-xs flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="p-4 border-t border-border bg-surface-secondary">
                  <button
                    onClick={handleSelectTemplate}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-400 hover:bg-primary-500 text-neutral-950 font-medium rounded-xl transition-colors"
                  >
                    Use This Template
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
                    <Workflow className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <h4 className="text-lg font-medium text-text-primary mb-2">
                    Select a Template
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Choose a template from the list to see its details and start building your workflow.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
