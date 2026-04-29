import { BaseApiService } from './baseApiService';

export interface FacebookAdsAccount {
 id: string;
 name: string;
 account_id: string;
 account_status: number;
}

class FacebookAdsService extends BaseApiService {
 async getAccounts(connectionId: string): Promise<FacebookAdsAccount[]> {
 const response = await this.get<FacebookAdsAccount[]>(
 `/api/facebook/ads/accounts?connection_id=${encodeURIComponent(connectionId)}`
 );
 return response.data;
 }
}

export const facebookAdsService = new FacebookAdsService();
