import googleAdsSvg from '@/assets/icons/google_ads.svg';
import facebookAdsSvg from '@/assets/icons/facebook_ads.svg';
import tiktokAdsLightSvg from '@/assets/icons/tiktok-ads-light.svg';
import tiktokAdsDarkSvg from '@/assets/icons/tiktok-ads-dark.svg';
import bigquerySvg from '@/assets/icons/bigquery.svg';
import mysqlSvg from '@/assets/icons/mysql.svg';
import googleSheetSvg from '@/assets/icons/gogole-sheet.svg';

interface IconProps {
 className?: string;
 size?: number;
}

// Facebook Icon (Official - from SVG asset)
// Supports both size prop and className (w-5 h-5) for Lucide compatibility
export const FacebookIcon = ({ className = "", size }: IconProps) => (
 <img
 src={facebookAdsSvg}
 alt="Facebook Ads"
 className={className}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
);

// TikTok Icon (with dark mode support)
// Uses a span wrapper to avoid React Fragment issues in list contexts
export const TikTokIcon = ({ className = "", size }: IconProps) => (
 <span className="inline-flex">
 <img
 src={tiktokAdsLightSvg}
 alt="TikTok Ads"
 className={` ${className}`}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
 <img
 src={tiktokAdsDarkSvg}
 alt="TikTok Ads"
 className={`hidden ${className}`}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
 </span>
);

// Google Icon (Official)
export const GoogleIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
 </svg>
);

// Google Ads Icon (Official logo - from SVG asset)
export const GoogleAdsIcon = ({ className = "", size }: IconProps) => (
 <img
 src={googleAdsSvg}
 alt="Google Ads"
 className={className}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
);

// BigQuery Icon (Official logo - from SVG asset)
export const BigQueryIcon = ({ className = "", size }: IconProps) => (
 <img
 src={bigquerySvg}
 alt="BigQuery"
 className={className}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
);

// Google Sheets Icon (Official logo - from SVG asset)
export const GoogleSheetsIcon = ({ className = "", size }: IconProps) => (
 <img
 src={googleSheetSvg}
 alt="Google Sheets"
 className={className}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
);

// MySQL Icon (Official logo - from SVG asset)
export const MySQLIcon = ({ className = "", size }: IconProps) => (
 <img
 src={mysqlSvg}
 alt="MySQL"
 className={className}
 width={size}
 height={size}
 style={{ width: size, height: size }}
 />
);

// AWS S3 Icon
export const S3Icon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24">
 <path fill="#E25444" d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/>
 <path fill="#7B1D13" d="M12 2v20l9-5V7l-9-5z"/>
 <path fill="#58150D" d="M12 12l9-5-9-5-9 5 9 5z"/>
 <path fill="#FFFFFF" d="M8 10h8v1H8v-1zm0 2h8v1H8v-1zm0 2h5v1H8v-1z"/>
 </svg>
);

// Transform/Code Icon
export const TransformIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <polyline points="16 18 22 12 16 6"/>
 <polyline points="8 6 2 12 8 18"/>
 <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2"/>
 </svg>
);

// Database Icon (generic)
export const DatabaseIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <ellipse cx="12" cy="5" rx="9" ry="3"/>
 <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
 <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
 </svg>
);

// Chart/Analytics Icon
export const AnalyticsIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <line x1="18" y1="20" x2="18" y2="10"/>
 <line x1="12" y1="20" x2="12" y2="4"/>
 <line x1="6" y1="20" x2="6" y2="14"/>
 <line x1="2" y1="20" x2="22" y2="20"/>
 </svg>
);

// Success/Check Icon
export const SuccessIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
 <circle cx="12" cy="12" r="10" fill="#10B981" fillOpacity="0.2"/>
 <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2"/>
 <path d="M8 12l3 3 5-6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
);

// Error/Failed Icon
export const FailedIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
 <circle cx="12" cy="12" r="10" fill="#EF4444" fillOpacity="0.2"/>
 <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
 <path d="M15 9l-6 6M9 9l6 6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
 </svg>
);

// Clock/Duration Icon
export const DurationIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
 <circle cx="12" cy="12" r="10" fill="#8B5CF6" fillOpacity="0.2"/>
 <circle cx="12" cy="12" r="10" stroke="#8B5CF6" strokeWidth="2"/>
 <path d="M12 6v6l4 2" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
 </svg>
);

// Executions/Activity Icon
export const ExecutionsIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
 <rect x="2" y="2" width="20" height="20" rx="4" fill="#3B82F6" fillOpacity="0.2"/>
 <rect x="2" y="2" width="20" height="20" rx="4" stroke="#3B82F6" strokeWidth="2"/>
 <path d="M7 14l3-3 2 2 5-5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 <circle cx="17" cy="8" r="2" fill="#3B82F6"/>
 </svg>
);

// Trend Up Icon
export const TrendUpIcon = ({ className = "", size = 24 }: IconProps) => (
 <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
 <rect x="2" y="2" width="20" height="20" rx="4" fill="#10B981" fillOpacity="0.2"/>
 <rect x="2" y="2" width="20" height="20" rx="4" stroke="#10B981" strokeWidth="2"/>
 <path d="M7 15l4-4 2 2 4-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M14 9h3v3" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
);

// Map node ID to icon component
// Supports both dot notation (facebook.ads) and underscore notation (facebook_ads)
export const getNodeIcon = (nodeId: string, size = 24) => {
 const icons: Record<string, JSX.Element> = {
 // Underscore format (backend)
 'facebook_ads': <FacebookIcon size={size} />,
 'tiktok_ads': <TikTokIcon size={size} />,
 'google_ads': <GoogleAdsIcon size={size} />,
 'bigquery': <BigQueryIcon size={size} />,
 'google_sheet': <GoogleSheetsIcon size={size} />,
 'mysql': <MySQLIcon size={size} />,
 's3': <S3Icon size={size} />,
 'transform': <TransformIcon size={size} />,
 'sql': <DatabaseIcon size={size} />,
 // Dot notation format (frontend typeId)
 'facebook.ads': <FacebookIcon size={size} />,
 'tiktok.ads': <TikTokIcon size={size} />,
 'google.ads': <GoogleAdsIcon size={size} />,
 'dest.bigquery': <BigQueryIcon size={size} />,
 'dest.mysql': <MySQLIcon size={size} />,
 'dest.googlesheets': <GoogleSheetsIcon size={size} />,
 'transform.sql': <DatabaseIcon size={size} />,
 'transform.rename': <TransformIcon size={size} />,
 'transform.join': <TransformIcon size={size} />,
 };
 return icons[nodeId] || null;
};

