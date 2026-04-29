/**
 * Connection Service
 *
 * Provides utilities for testing and managing data connections
 */

import { fetchClient } from '@/lib/fetchClient';

export interface TestConnectionResult {
 success: boolean;
 message: string;
 latency?: number;
 details?: Record<string, unknown>;
}

/**
 * Test a connection to verify it's still valid
 * @param connectionId - The ID of the connection to test
 * @param connectionType - The type of connection (bigquery, mysql, google_ads, etc.)
 */
export async function testConnection(
 connectionId: string,
 connectionType: string
): Promise<TestConnectionResult> {
 const startTime = Date.now();

 try {
 // Try to call the backend test endpoint if it exists
 const response = await fetchClient(`/api/connections/${encodeURIComponent(connectionId)}/test`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ connection_type: connectionType }),
 });

 const latency = Date.now() - startTime;

 if (response.ok) {
 const data = await response.json().catch(() => ({}));
 return {
 success: true,
 message: data.message || 'Connection is working correctly',
 latency,
 details: data,
 };
 }

 // Handle specific error codes
 if (response.status === 401 || response.status === 403) {
 return {
 success: false,
 message: 'Authentication failed - credentials may have expired',
 latency,
 };
 }

 if (response.status === 404) {
 // Test endpoint doesn't exist - fall back to connection details check
 return await testConnectionFallback(connectionId, connectionType, startTime);
 }

 const errorData = await response.json().catch(() => ({ message: 'Connection test failed' }));
 return {
 success: false,
 message: errorData.message || `Test failed with status ${response.status}`,
 latency,
 };
 } catch (error) {
 const latency = Date.now() - startTime;

 // Network error - try fallback method
 if (error instanceof TypeError && error.message.includes('fetch')) {
 return {
 success: false,
 message: 'Network error - unable to reach the server',
 latency,
 };
 }

 // Try fallback test method
 return await testConnectionFallback(connectionId, connectionType, startTime);
 }
}

/**
 * Fallback test method - verify connection by fetching its details
 */
async function testConnectionFallback(
 connectionId: string,
 _connectionType: string,
 startTime: number
): Promise<TestConnectionResult> {
 try {
 // Just verify the connection exists and is accessible
 const response = await fetchClient(`/api/connections/${encodeURIComponent(connectionId)}`);
 const latency = Date.now() - startTime;

 if (response.ok) {
 const data = await response.json().catch(() => ({}));
 const connectionData = data.data || data;

 // Check if connection has valid status
 if (connectionData.status === 'expired' || connectionData.status === 'invalid') {
 return {
 success: false,
 message: `Connection status: ${connectionData.status}`,
 latency,
 details: connectionData,
 };
 }

 return {
 success: true,
 message: 'Connection verified successfully',
 latency,
 details: connectionData,
 };
 }

 return {
 success: false,
 message: 'Connection not found or inaccessible',
 latency: Date.now() - startTime,
 };
 } catch (error) {
 return {
 success: false,
 message: error instanceof Error ? error.message : 'Connection test failed',
 latency: Date.now() - startTime,
 };
 }
}

/**
 * Get connection status label and color
 */
export function getConnectionStatusDisplay(status?: string): {
 label: string;
 color: 'green' | 'amber' | 'red' | 'gray';
} {
 switch (status?.toLowerCase()) {
 case 'active':
 case 'connected':
 case 'valid':
 return { label: 'Active', color: 'green' };
 case 'expired':
 case 'invalid':
 return { label: 'Expired', color: 'red' };
 case 'pending':
 case 'connecting':
 return { label: 'Pending', color: 'amber' };
 default:
 return { label: 'Unknown', color: 'gray' };
 }
}
