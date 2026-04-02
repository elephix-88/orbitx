import { BaseApiService } from './baseApiService';
import { openOAuthPopupWithCallbacks } from '../utils/oauthPopup';

export interface GoogleAdsAccount {
  resource_name: string;
  id: string;
  descriptive_name: string;
}

export interface GoogleAdsField {
  field: string;
  output_name: string;
  display_name: string;
  data_type: string;
  is_primary_key: boolean;
  is_breakdown: boolean;
  active: boolean;
  source: {
    base: string;
    select: string;
    allowed_bases: string[];
  };
}

interface GoogleOAuthResponse {
  oauth_url: string;
  connection_id: string;
  message: string;
}

class GoogleAdsService extends BaseApiService {
  async connectWithPopup(connectionName: string = 'Google Ads Connection'): Promise<void> {
    const response = await this.post<GoogleOAuthResponse>('/api/google/ads/login', {
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

  async getAccounts(connectionId: string): Promise<GoogleAdsAccount[]> {
    const response = await this.get<GoogleAdsAccount[]>(
      `/api/google/ads/accounts?connection_id=${encodeURIComponent(connectionId)}`
    );
    return response.data;
  }

  async getFields(): Promise<GoogleAdsField[]> {
    const response = await this.get<GoogleAdsField[]>('/api/google/ads/fields');
    return response.data;
  }
}

export const googleAdsService = new GoogleAdsService();