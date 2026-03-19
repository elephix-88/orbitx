import { BaseApiService } from './baseApiService';
import { openOAuthPopupWithCallbacks } from '../utils/oauthPopup';

export class TikTokOAuthService extends BaseApiService {
  constructor() {
    super();
  }

  public async connectWithPopup(connectionName: string): Promise<void> {
    const endpoint = `/api/tiktok/login`;
    const { data } = await this.post<{ oauth_url: string }>(endpoint, {
      connection_name: connectionName,
    });

    return new Promise((resolve, reject) => {
      openOAuthPopupWithCallbacks(
        data.oauth_url,
        resolve,
        (error) => reject(new Error(error)),
        {
          title: 'TikTokOAuthPopup',
          width: 600,
          height: 700,
        }
      );
    });
  }
}

export const tiktokOAuthService = new TikTokOAuthService();
