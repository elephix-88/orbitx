import React, { useState, useEffect } from "react";
import {
 facebookAdsService,
 FacebookAdsAccount,
} from "@/services/facebookAdsService";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Skeleton } from "@/components/shared/Skeleton";

interface FacebookAdsSelectorProps {
 connectionId: string;
 onSelect: (_account: FacebookAdsAccount) => void;
 onCancel: () => void;
}

export const FacebookAdsSelector: React.FC<FacebookAdsSelectorProps> = ({
 connectionId,
 onSelect,
 onCancel,
}) => {
 const [accounts, setAccounts] = useState<FacebookAdsAccount[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const loadAccounts = React.useCallback(async () => {
 try {
 setLoading(true);
 setError(null);
 const adsAccounts = await facebookAdsService.getAccounts(connectionId);
 setAccounts(adsAccounts);
 } catch (err) {
 setError(
 err instanceof Error
 ? err.message
 : "Failed to load Facebook Ads accounts"
 );
 } finally {
 setLoading(false);
 }
 }, [connectionId]);

 useEffect(() => {
 loadAccounts();
 }, [connectionId, loadAccounts]);

 if (loading) {
 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold">Select Facebook Ads Account</h3>
 <Button variant="outline" onClick={onCancel}>
 Cancel
 </Button>
 </div>
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <Skeleton key={i} className="h-16 w-full" />
 ))}
 </div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold">Select Facebook Ads Account</h3>
 <Button variant="outline" onClick={onCancel}>
 Cancel
 </Button>
 </div>
 <Card className="p-4 border-red-200 bg-red-50">
 <p className="text-red-600 mb-3">{error}</p>
 <Button onClick={loadAccounts} size="sm">
 Try Again
 </Button>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold">Select Facebook Ads Account</h3>
 <Button variant="outline" onClick={onCancel}>
 Cancel
 </Button>
 </div>

 {accounts.length === 0 ? (
 <Card className="p-8 text-center">
 <p className="text-gray-500 mb-4">No Facebook Ads accounts found</p>
 <p className="text-sm text-gray-400 mb-4">
 Make sure you have access to Facebook Ads accounts with this
 Facebook account
 </p>
 <Button onClick={loadAccounts} variant="outline">
 Refresh
 </Button>
 </Card>
 ) : (
 <div className="space-y-2 max-h-96 overflow-y-auto">
 {accounts.map((account) => (
 <Card
 key={account.id}
 className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
 onClick={() => onSelect(account)}
 >
 <div className="flex items-center justify-between">
 <div>
 <h4 className="font-medium text-gray-900">
 {account.name || 'Facebook Ads Account'}
 </h4>
 <p className="text-xs text-gray-400">
 Status: {account.account_status}
 </p>
 </div>
 <span className="text-gray-400">→</span>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
};
