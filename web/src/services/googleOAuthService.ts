/**
 * Unified Google OAuth Service
 * Handles OAuth flow for all Google services (Ads, Sheets, BigQuery)
 */
import { BaseApiService } from './baseApiService';
import { openOAuthPopupWithReload } from '../utils/oauthPopup';

export type GoogleServiceType = 'google_ads' | 'bigquery' | 'google_sheets';

export class GoogleOAuthService extends BaseApiService {
  constructor() {
    super();
  }

  public async connectWithPopup(
    provider: GoogleServiceType,
    body: { connection_name: string }
  ): Promise<void> {
    const endpoint = `/api/google/${provider}/login`;
    try {
      const { data } = await this.post<{ oauth_url: string }>(endpoint, body);
      await openOAuthPopupWithReload(data.oauth_url, {
        title: 'GoogleOAuthPopup',
        width: 500,
        height: 600,
      });
    } catch (error) {
      console.error(`Google OAuth (${provider}) initialization failed:`, error);
      throw error;
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();

