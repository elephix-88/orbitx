import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, FolderOpen, Calendar, MapPin } from 'lucide-react';
import { Select } from '@/components/shared/form/Select';
import { Input } from '@/components/shared/form/Input';
import { FormGrid } from '@/components/shared/form/Grid';
import { bigQueryService } from '../../services/bigQueryService';

interface BigQueryProject {
 project_id: string;
 project_name?: string;
 project_number?: string;
}

interface BigQueryDataset {
 dataset_id: string;
 friendly_name?: string;
 description?: string;
 location: string;
 creation_time?: string;
 last_modified_time?: string;
}

interface BigQuerySelectorProps {
 connectionId: string;
 selectedProject?: string;
 selectedDataset?: string;
 selectedTable?: string;
 onProjectChange: (_projectId: string) => void;
 onDatasetChange: (_datasetId: string) => void;
 onTableChange: (_tableId: string) => void;
}

export const BigQuerySelector: React.FC<BigQuerySelectorProps> = ({
 connectionId,
 selectedProject,
 selectedDataset,
 selectedTable,
 onProjectChange,
 onDatasetChange,
 onTableChange,
}) => {
 const [projects, setProjects] = useState<BigQueryProject[]>([]);
 const [datasets, setDatasets] = useState<BigQueryDataset[]>([]);
 const [projectsLoading, setProjectsLoading] = useState(false);
 const [datasetsLoading, setDatasetsLoading] = useState(false);
 const [projectsError, setProjectsError] = useState<string | null>(null);
 const [datasetsError, setDatasetsError] = useState<string | null>(null);

 const loadProjects = React.useCallback(async () => {
 if (!connectionId) return;

 setProjectsLoading(true);
 setProjectsError(null);
 try {
 const data = await bigQueryService.getProjects(connectionId);
 setProjects(data);
 } catch (error) {
 console.error('Error loading BigQuery projects:', error);
 setProjectsError(error instanceof Error ? error.message : 'Failed to load projects');
 } finally {
 setProjectsLoading(false);
 }
 }, [connectionId]);

 const loadDatasets = React.useCallback(async (projectId: string) => {
 if (!connectionId || !projectId) return;

 setDatasetsLoading(true);
 setDatasetsError(null);
 try {
 const data = await bigQueryService.getDatasets(connectionId, projectId);
 setDatasets(data);
 } catch (error) {
 console.error('Error loading BigQuery datasets:', error);
 setDatasetsError(error instanceof Error ? error.message : 'Failed to load datasets');
 } finally {
 setDatasetsLoading(false);
 }
 }, [connectionId]);

 // Load projects when connection changes
 useEffect(() => {
 if (connectionId) {
 loadProjects();
 }
 }, [connectionId, loadProjects]);

 // Load datasets when project changes
 useEffect(() => {
 if (connectionId && selectedProject) {
 loadDatasets(selectedProject);
 } else {
 setDatasets([]);
 }
 }, [connectionId, selectedProject, loadDatasets]);




 return (
 <div className="space-y-6">
 <FormGrid cols={2}>
 {/* Project Selection */}
 <div className="space-y-3">
 <div className="flex items-center justify-between mb-2">
 <label className="text-sm font-medium text-primary flex items-center gap-1">
 <FolderOpen className="w-4 h-4" />
 Project
 </label>
 <button
 onClick={loadProjects}
 disabled={projectsLoading}
 className="p-1 text-tertiary hover:text-secondary disabled:opacity-50 transition-colors"
 title="Refresh projects"
 >
 <RefreshCw className={`w-4 h-4 ${projectsLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>

 {projectsError && (
 <div className="text-sm text-error bg-danger-bg p-3 rounded-lg border border-danger-border/20 mb-3">
 {projectsError}
 </div>
 )}

 <Select
 value={selectedProject || ''}
 onChange={(val) => onProjectChange(String(val || ''))}
 options={projects.map((project) => ({
 value: project.project_id,
 label: project.project_name || project.project_id,
 }))}
 placeholder={projectsLoading ? 'Loading projects...' : 'Select a project...'}
 disabled={projectsLoading}
 />
 </div>

 {/* Dataset Selection */}
 {selectedProject && (
 <div className="space-y-3">
 <div className="flex items-center justify-between mb-2">
 <label className="text-sm font-medium text-primary flex items-center gap-1">
 <Database className="w-4 h-4" />
 Dataset
 </label>
 <button
 onClick={() => loadDatasets(selectedProject)}
 disabled={datasetsLoading}
 className="p-1 text-tertiary hover:text-secondary disabled:opacity-50 transition-colors"
 title="Refresh datasets"
 >
 <RefreshCw className={`w-4 h-4 ${datasetsLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>

 {datasetsError && (
 <div className="text-sm text-error bg-danger-bg p-3 rounded-lg border border-danger-border/20 mb-3">
 {datasetsError}
 </div>
 )}

 <Select
 value={selectedDataset || ''}
 onChange={(val) => onDatasetChange(String(val || ''))}
 options={datasets.map((dataset) => ({
 value: dataset.dataset_id,
 label: `${dataset.friendly_name || dataset.dataset_id} (${dataset.location})`,
 }))}
 placeholder={datasetsLoading ? 'Loading datasets...' : 'Select a dataset...'}
 disabled={datasetsLoading}
 />
 </div>
 )}
 </FormGrid>

 {/* Dataset Info */}
 {selectedDataset && (
 <div className="bg-bg-card/50 p-4 rounded-lg border border-primary/10">
 {(() => {
 const dataset = datasets.find(d => d.dataset_id === selectedDataset);
 if (!dataset) return null;
 
 return (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Database className="w-4 h-4 text-blue-primary" />
 <span className="font-medium text-primary">{dataset.friendly_name || dataset.dataset_id}</span>
 </div>
 {dataset.description && (
 <p className="text-sm text-secondary mb-3">{dataset.description}</p>
 )}
 <div className="flex flex-wrap items-center gap-4 text-xs text-tertiary">
 <span className="flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {dataset.location}
 </span>
 {dataset.creation_time && (
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 Created {new Date(dataset.creation_time).toLocaleDateString()}
 </span>
 )}
 </div>
 </div>
 );
 })()}
 </div>
 )}

 {/* Table Name Input */}
 {selectedDataset && (
 <div className="space-y-3 col-span-full">
 <Input
 label="Table Name"
 value={selectedTable || ''}
 onChange={(e) => onTableChange(e.target.value)}
 placeholder="Enter table name (e.g., my_table_name)"
 helperText="The table will be created automatically by the workflow engine if it doesn't exist."
 />
 </div>
 )}
 </div>
 );
};
