import { BaseApiService } from './baseApiService';
import { openOAuthPopupWithReload } from '../utils/oauthPopup';

export class FacebookOAuthService extends BaseApiService {
 constructor() {
 super();
 }

 public async connectWithPopup(connectionName: string): Promise<void> {
 const endpoint = `/api/facebook/login`;
 try {
 const { data } = await this.post<{ oauth_url: string }>(endpoint, {
 connection_name: connectionName,
 });
 await openOAuthPopupWithReload(data.oauth_url, {
 title: 'FacebookOAuthPopup',
 width: 600,
 height: 700,
 });
 } catch (error) {
 console.error('Facebook OAuth initialization failed:', error);
 throw error;
 }
 }
}

export const facebookOAuthService = new FacebookOAuthService();
