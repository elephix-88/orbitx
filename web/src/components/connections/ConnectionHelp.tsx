// =============================================================================
// ConnectionHelp - Setup documentation for connections
// =============================================================================
// Provides expandable help sections with step-by-step setup instructions
// and links to official platform documentation.

import React, { useState } from 'react';
import {
 ChevronDown,
 ExternalLink,
 HelpCircle,
 CheckCircle,
 Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SetupStep {
 title: string;
 description: string;
 link?: {
 text: string;
 url: string;
 };
}

export interface ConnectionHelpData {
 title: string;
 description: string;
 steps: SetupStep[];
 documentation?: {
 text: string;
 url: string;
 };
 tips?: string[];
}

// =============================================================================
// Help Data for Each Connection Type
// =============================================================================

export const connectionHelpData: Record<string, ConnectionHelpData> = {
 google_ads: {
 title: 'Google Ads Setup',
 description: 'Connect your Google Ads account to pull campaign performance data.',
 steps: [
 {
 title: 'Sign in with Google',
 description: 'Click "Connect" and sign in with the Google account that has access to your Google Ads.',
 },
 {
 title: 'Grant Permissions',
 description: 'Allow OrbitX to read your Google Ads data. We only request read-only access.',
 },
 {
 title: 'Select Account',
 description: 'If you have multiple Google Ads accounts, select the one you want to connect.',
 },
 ],
 documentation: {
 text: 'Google Ads API Documentation',
 url: 'https://developers.google.com/google-ads/api/docs/start',
 },
 tips: [
 'Make sure you have Manager or Standard access to the Google Ads account',
 'You can connect multiple Google Ads accounts',
 'Data sync happens automatically based on your workflow schedule',
 ],
 },
 facebookads: {
 title: 'Facebook Ads Setup',
 description: 'Connect your Meta Business account to access Facebook Ads data.',
 steps: [
 {
 title: 'Sign in with Facebook',
 description: 'Click "Connect" and log in to your Facebook account that has access to Meta Business.',
 },
 {
 title: 'Select Business Account',
 description: 'Choose the Business Account that contains your ad accounts.',
 },
 {
 title: 'Grant Permissions',
 description: 'Allow OrbitX to read your ads data. We request ads_read permission only.',
 },
 {
 title: 'Select Ad Accounts',
 description: 'Choose which ad accounts you want to connect and pull data from.',
 },
 ],
 documentation: {
 text: 'Meta Marketing API Documentation',
 url: 'https://developers.facebook.com/docs/marketing-apis/',
 },
 tips: [
 'You need Admin or Analyst role on the ad account',
 'Token refresh happens automatically',
 'Historical data up to 37 months can be accessed',
 ],
 },
 bigquery: {
 title: 'BigQuery Setup',
 description: 'Connect to Google BigQuery using a service account for data warehousing.',
 steps: [
 {
 title: 'Create a Service Account',
 description: 'Go to Google Cloud Console > IAM & Admin > Service Accounts and create a new service account.',
 link: {
 text: 'Open Google Cloud Console',
 url: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
 },
 },
 {
 title: 'Assign Permissions',
 description: 'Grant the service account "BigQuery Data Editor" and "BigQuery Job User" roles.',
 },
 {
 title: 'Download JSON Key',
 description: 'Create a JSON key for the service account and download it.',
 },
 {
 title: 'Upload to OrbitX',
 description: 'Enter your Project ID and upload the JSON key file in the connection form.',
 },
 ],
 documentation: {
 text: 'BigQuery Documentation',
 url: 'https://cloud.google.com/bigquery/docs',
 },
 tips: [
 'Keep your JSON key file secure and never share it',
 'You can use the same service account for multiple datasets',
 'Make sure the service account has access to the target dataset',
 ],
 },
 mysql: {
 title: 'MySQL Setup',
 description: 'Connect to your MySQL database to load data.',
 steps: [
 {
 title: 'Get Connection Details',
 description: 'Obtain your MySQL host, port (default: 3306), database name, username, and password.',
 },
 {
 title: 'Allow Network Access',
 description: 'Ensure your MySQL server allows connections from our IP address or is accessible publicly.',
 },
 {
 title: 'Create Database User (Optional)',
 description: 'For security, create a dedicated user with only the necessary permissions.',
 },
 {
 title: 'Enter Credentials',
 description: 'Fill in the connection form with your MySQL credentials.',
 },
 ],
 documentation: {
 text: 'MySQL Documentation',
 url: 'https://dev.mysql.com/doc/',
 },
 tips: [
 'Use SSL for production connections when available',
 'Grant only INSERT, UPDATE, SELECT permissions for data loading',
 'Consider using a read replica for heavy read operations',
 ],
 },
 GoogleSheets: {
 title: 'Google Sheets Setup',
 description: 'Connect your Google account to read from and write to Google Sheets.',
 steps: [
 {
 title: 'Sign in with Google',
 description: 'Click "Connect" and sign in with your Google account.',
 },
 {
 title: 'Grant Permissions',
 description: 'Allow OrbitX to access your Google Sheets. We can read and write to sheets you specify.',
 },
 {
 title: 'Share Spreadsheets',
 description: 'Make sure the spreadsheets you want to use are accessible by your connected Google account.',
 },
 ],
 documentation: {
 text: 'Google Sheets API Documentation',
 url: 'https://developers.google.com/sheets/api',
 },
 tips: [
 'You can connect personal or Google Workspace accounts',
 'Spreadsheets can have up to 10 million cells',
 'Write operations will create sheets if they don\'t exist',
 ],
 },
};

// =============================================================================
// Components
// =============================================================================

interface ConnectionHelpProps {
 connectionType: string;
 defaultExpanded?: boolean;
 className?: string;
}

/**
 * Expandable help section for a specific connection type
 */
export const ConnectionHelp: React.FC<ConnectionHelpProps> = ({
 connectionType,
 defaultExpanded = false,
 className,
}) => {
 const [expanded, setExpanded] = useState(defaultExpanded);
 const help = connectionHelpData[connectionType];

 if (!help) return null;

 return (
 <div className={cn('border border-line-1 rounded-xl overflow-hidden', className)}>
 <button
 onClick={() => setExpanded(!expanded)}
 className="w-full flex items-center justify-between px-4 py-3 bg-bg-card hover:bg-bg-muted transition-colors"
 >
 <div className="flex items-center gap-2">
 <HelpCircle className="w-4 h-4 text-blue-primary" />
 <span className="text-sm font-medium text-text-1">
 How to set up {help.title.replace(' Setup', '')}
 </span>
 </div>
 <ChevronDown
 className={cn(
 'w-4 h-4 text-text-2 transition-transform',
 expanded && 'rotate-180'
 )}
 />
 </button>

 {expanded && (
 <div className="px-4 py-4 bg-bg-page space-y-4">
 <p className="text-sm text-text-2">
 {help.description}
 </p>

 {/* Steps */}
 <div className="space-y-3">
 {help.steps.map((step, index) => (
 <div key={index} className="flex gap-3">
 <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-primary/15 flex items-center justify-center">
 <span className="text-xs font-medium text-blue-primary">
 {index + 1}
 </span>
 </div>
 <div className="flex-1">
 <h4 className="text-sm font-medium text-text-1">
 {step.title}
 </h4>
 <p className="text-xs text-text-2 mt-0.5">
 {step.description}
 </p>
 {step.link && (
 <a
 href={step.link.url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-xs text-blue-primary hover:text-blue-primary mt-1"
 >
 {step.link.text}
 <ExternalLink className="w-3 h-3" />
 </a>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Tips */}
 {help.tips && help.tips.length > 0 && (
 <div className="p-3 bg-blue-soft rounded-lg">
 <div className="flex items-center gap-2 mb-2">
 <Info className="w-4 h-4 text-blue-primary" />
 <span className="text-xs font-medium text-blue-primary">
 Tips
 </span>
 </div>
 <ul className="space-y-1">
 {help.tips.map((tip, index) => (
 <li key={index} className="flex items-start gap-2 text-xs text-blue-primary">
 <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
 {tip}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Documentation Link */}
 {help.documentation && (
 <div className="pt-2 border-t border-line-1">
 <a
 href={help.documentation.url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 text-sm text-blue-primary hover:text-blue-primary font-medium"
 >
 <ExternalLink className="w-4 h-4" />
 {help.documentation.text}
 </a>
 </div>
 )}
 </div>
 )}
 </div>
 );
};

/**
 * Inline help link for use in forms/modals
 */
export const ConnectionHelpLink: React.FC<{
 connectionType: string;
 className?: string;
}> = ({ connectionType, className }) => {
 const help = connectionHelpData[connectionType];

 if (!help?.documentation) return null;

 return (
 <a
 href={help.documentation.url}
 target="_blank"
 rel="noopener noreferrer"
 className={cn(
 'inline-flex items-center gap-1 text-xs text-blue-primary hover:text-blue-primary',
 className
 )}
 >
 <HelpCircle className="w-3.5 h-3.5" />
 Need help? View documentation
 </a>
 );
};

export default ConnectionHelp;
