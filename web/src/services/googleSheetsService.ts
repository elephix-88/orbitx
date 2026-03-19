import { BaseApiService } from './baseApiService';
import { openOAuthPopupWithData } from '../utils/oauthPopup';

export interface GoogleSheetsFile {
  id: string;
  name: string;
  web_view_link: string;
  created_time?: string;
  modified_time?: string;
  mime_type: string;
}

export interface GoogleSheetsWorksheet {
  sheet_id: number;
  title: string;
  index: number;
  sheet_type: string;
  grid_properties?: {
    rowCount?: number;
    columnCount?: number;
  };
}

export interface GoogleSheetsSpreadsheet {
  spreadsheet_id: string;
  name: string;
  spreadsheet_url: string;
  created_time?: string;
  modified_time?: string;
  worksheets: GoogleSheetsWorksheet[];
}

export interface OAuthLoginResponse {
  oauth_url: string;
  connection_id: string;
  message: string;
}

class GoogleSheetsService extends BaseApiService {
  async connectWithPopup(connectionName: string = 'Google Sheets Connection'): Promise<{ connection_id: string }> {
    const response = await this.post<OAuthLoginResponse>('/api/google/sheets/login', {
      connection_name: connectionName,
    });

    if (!response.data.oauth_url) {
      throw new Error('No oauth_url received from server');
    }

    return openOAuthPopupWithData(
      response.data.oauth_url,
      { connection_id: response.data.connection_id },
      {
        title: 'GoogleOAuthPopup',
        width: 500,
        height: 600,
        scrollable: true,
        pollInterval: 1000,
      }
    );
  }

  async getSpreadsheets(connectionId: string): Promise<GoogleSheetsFile[]> {
    const response = await this.get<GoogleSheetsFile[]>(
      `/api/google/sheets/spreadsheets?connection_id=${encodeURIComponent(connectionId)}`
    );
    return response.data;
  }

  async getSpreadsheetDetails(connectionId: string, spreadsheetId: string): Promise<GoogleSheetsSpreadsheet> {
    const response = await this.get<GoogleSheetsSpreadsheet>(
      `/api/google/sheets/spreadsheets/${encodeURIComponent(spreadsheetId)}?connection_id=${encodeURIComponent(connectionId)}`
    );
    return response.data;
  }

  async validateConnection(connectionId: string): Promise<{ is_valid: boolean; message: string }> {
    const response = await this.get<{ connection_id: string; is_valid: boolean; message: string }>(
      `/api/google/sheets/validate?connection_id=${encodeURIComponent(connectionId)}`
    );
    return {
      is_valid: response.data.is_valid,
      message: response.data.message,
    };
  }
}

export const googleSheetsService = new GoogleSheetsService();


