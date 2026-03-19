import React, { useState, useEffect } from 'react';
import { googleSheetsService, GoogleSheetsFile, GoogleSheetsSpreadsheet } from '@/services/googleSheetsService';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Skeleton } from '@/components/shared/Skeleton';

interface GoogleSheetsSelectorProps {
  connectionId: string;
  onSelect: (_selection: {
    spreadsheetId: string;
    spreadsheetName: string;
    worksheetId: number;
    worksheetName: string;
  }) => void;
  onCancel: () => void;
}

export const GoogleSheetsSelector: React.FC<GoogleSheetsSelectorProps> = ({
  connectionId,
  onSelect,
  onCancel,
}) => {
  const [spreadsheets, setSpreadsheets] = useState<GoogleSheetsFile[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<GoogleSheetsSpreadsheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpreadsheets = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sheets = await googleSheetsService.getSpreadsheets(connectionId);
      setSpreadsheets(sheets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spreadsheets');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    loadSpreadsheets();
  }, [connectionId, loadSpreadsheets]);

  const loadSpreadsheetDetails = async (spreadsheetId: string) => {
    try {
      setLoadingDetails(true);
      setError(null);
      const details = await googleSheetsService.getSpreadsheetDetails(connectionId, spreadsheetId);
      setSelectedSpreadsheet(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spreadsheet details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSpreadsheetSelect = (spreadsheet: GoogleSheetsFile) => {
    loadSpreadsheetDetails(spreadsheet.id);
  };

  const handleWorksheetSelect = (worksheet: { sheet_id: number; title: string }) => {
    if (selectedSpreadsheet) {
      onSelect({
        spreadsheetId: selectedSpreadsheet.spreadsheet_id,
        spreadsheetName: selectedSpreadsheet.name,
        worksheetId: worksheet.sheet_id,
        worksheetName: worksheet.title,
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Google Spreadsheet</h3>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Google Spreadsheet</h3>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600 mb-3">{error}</p>
          <Button onClick={loadSpreadsheets} size="sm">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (selectedSpreadsheet) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Select Worksheet</h3>
            <p className="text-sm text-gray-600">{selectedSpreadsheet.name}</p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setSelectedSpreadsheet(null)}>
              Back
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </div>

        {loadingDetails ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedSpreadsheet.worksheets.map((worksheet) => (
              <Card
                key={worksheet.sheet_id}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleWorksheetSelect(worksheet)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{worksheet.title}</h4>
                    <p className="text-sm text-gray-500">
                      {worksheet.grid_properties?.rowCount || 'Unknown'} rows × {' '}
                      {worksheet.grid_properties?.columnCount || 'Unknown'} columns
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    Sheet {worksheet.index + 1}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Google Spreadsheet</h3>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>

      {spreadsheets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No spreadsheets found in your Google Drive</p>
          <Button onClick={loadSpreadsheets} variant="outline">
            Refresh
          </Button>
        </Card>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {spreadsheets.map((spreadsheet) => (
            <Card
              key={spreadsheet.id}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleSpreadsheetSelect(spreadsheet)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{spreadsheet.name}</h4>
                  <p className="text-sm text-gray-500">
                    Modified: {formatDate(spreadsheet.modified_time)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={spreadsheet.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open in Sheets
                  </a>
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
