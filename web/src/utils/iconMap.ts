/**
 * Icon map for dynamic icon lookup without importing all lucide-react icons.
 * This reduces bundle size significantly (from ~300KB to ~5KB for icons).
 *
 * Add icons here when adding new node types.
 */
import {
 Circle,
 Columns3,
 Database,
 Merge,
 PenLine,
 Search,
 Server,
 Table,
 // Additional icons used in nodes
 ChevronDown,
 ChevronRight,
 ChevronLeft,
 Plus,
 Minus,
 X,
 Check,
 AlertTriangle,
 Play,
 Pause,
 Settings,
 Trash2,
 Copy,
 Edit,
 Eye,
 EyeOff,
 Loader2,
 RefreshCw,
 Zap,
 AlignHorizontalSpaceAround,
 GripVertical,
 Link2,
 Unlink,
 type LucideIcon,
} from 'lucide-react';
import { FacebookIcon, GoogleAdsIcon, BigQueryIcon, MySQLIcon, GoogleSheetsIcon, TikTokIcon } from '@/components/icons/BrandIcons';

// Type for icons that can be either LucideIcon or custom icon components
type IconComponent = LucideIcon | typeof FacebookIcon;

export const iconMap: Record<string, IconComponent> = {
 // Node type icons
 Circle,
 Columns3,
 Database,
 Facebook: FacebookIcon,
 GoogleAds: GoogleAdsIcon,
 TikTok: TikTokIcon,
 BigQuery: BigQueryIcon,
 MySQL: MySQLIcon,
 GoogleSheets: GoogleSheetsIcon,
 Merge,
 PenLine,
 Search,
 Server,
 Table,
 // UI icons
 ChevronDown,
 ChevronRight,
 ChevronLeft,
 Plus,
 Minus,
 X,
 Check,
 AlertTriangle,
 Play,
 Pause,
 Settings,
 Trash2,
 Copy,
 Edit,
 Eye,
 EyeOff,
 Loader2,
 RefreshCw,
 Zap,
 AlignHorizontalSpaceAround,
 GripVertical,
 Link2,
 Unlink,
};

export function getIcon(iconName: string): IconComponent {
 return iconMap[iconName] || Circle;
}
