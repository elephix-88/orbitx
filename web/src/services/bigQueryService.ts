import { BaseApiService } from './baseApiService';
import { openOAuthPopupWithCallbacks } from '../utils/oauthPopup';

interface GoogleOAuthResponse {
 oauth_url: string;
 connection_id: string;
 message: string;
}

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

class BigQueryService extends BaseApiService {
 async connectWithPopup(connectionName: string = 'BigQuery Connection'): Promise<void> {
 const response = await this.post<GoogleOAuthResponse>('/api/google/bigquery/login', {
 connection_name: connectionName,
 });

 if (!response.data.oauth_url) {
 throw new Error('No oauth_url received from server');
 }

 await openOAuthPopupWithCallbacks(
 response.data.oauth_url,
 () => {},
 undefined,
 {
 title: 'GoogleOAuthPopup',
 width: 500,
 height: 600,
 scrollable: true,
 pollInterval: 1000,
 }
 );
 }

 async getProjects(connectionId: string): Promise<BigQueryProject[]> {
 const response = await this.get<BigQueryProject[]>(`/api/google/bigquery/projects?connection_id=${connectionId}`);
 return response.data;
 }

 async getDatasets(connectionId: string, projectId: string): Promise<BigQueryDataset[]> {
 const response = await this.get<BigQueryDataset[]>(`/api/google/bigquery/projects/${projectId}/datasets?connection_id=${connectionId}`);
 return response.data;
 }

 async validateConnection(connectionId: string): Promise<{ is_valid: boolean; message: string }> {
 const response = await this.get<{ connection_id: string; is_valid: boolean; message: string }>(`/api/google/bigquery/validate?connection_id=${connectionId}`);
 return { is_valid: response.data.is_valid, message: response.data.message };
 }
}
 
 export const bigQueryService = new BigQueryService();