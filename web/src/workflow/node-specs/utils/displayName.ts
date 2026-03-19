/**
 * Utility functions for generating descriptive node display names
 * based on node configuration parameters.
 */

/**
 * Well-known breakdown field mappings for ads platforms.
 * Maps field names to human-readable labels for display name generation.
 */
export const BREAKDOWN_LABELS: Record<string, string> = {
  // Common breakdowns
  age: 'Age',
  gender: 'Gender',
  country: 'Country',
  region: 'Region',
  dma: 'DMA',
  impression_device: 'Device',
  device_platform: 'Device',
  platform_position: 'Placement',
  publisher_platform: 'Publisher',

  // Facebook specific
  age_gender: 'Age & Gender',
  country_region: 'Country & Region',

  // TikTok specific
  country_code: 'Country',
  province_id: 'Province',
  ac: 'Audience Category',

  // Google Ads specific
  ad_network_type: 'Network',
  device: 'Device',
  slot: 'Slot',
};

/**
 * Extracts breakdown field names from selected fields.
 * Works with fields that have group='breakdowns' or contain breakdown-related keywords.
 */
export function extractBreakdownsFromFields(
  selectedFields: string[],
  availableFields?: Array<{ field: string; group?: string; display_name?: string | null }>
): string[] {
  if (!selectedFields || selectedFields.length === 0) {
    return [];
  }

  // If we have field metadata, use the group property
  if (availableFields && availableFields.length > 0) {
    const breakdownFieldMap = new Map(
      availableFields
        .filter(f => f.group?.toLowerCase() === 'breakdowns')
        .map(f => [f.field, f.display_name || f.field])
    );

    return selectedFields.filter(field => breakdownFieldMap.has(field));
  }

  // Fallback: match against known breakdown field names
  const knownBreakdowns = Object.keys(BREAKDOWN_LABELS);
  return selectedFields.filter(field =>
    knownBreakdowns.includes(field.toLowerCase()) ||
    field.toLowerCase().includes('breakdown')
  );
}

/**
 * Generates a human-readable label for a breakdown field.
 */
export function getBreakdownLabel(field: string): string {
  const lowerField = field.toLowerCase();
  return BREAKDOWN_LABELS[lowerField] ||
         field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
}

/**
 * Generates a descriptive display name for ads source nodes.
 * Format: "Platform - Breakdown1, Breakdown2" (max 2 breakdowns shown)
 *
 * @param baseName - The base platform name (e.g., "Facebook Ads")
 * @param selectedFields - Array of selected field names
 * @param availableFields - Optional field metadata for accurate breakdown detection
 * @returns Descriptive display name or undefined if no breakdowns selected
 */
export function generateAdsDisplayName(
  baseName: string,
  selectedFields: string[],
  availableFields?: Array<{ field: string; group?: string; display_name?: string | null }>
): string | undefined {
  const breakdowns = extractBreakdownsFromFields(selectedFields, availableFields);

  if (breakdowns.length === 0) {
    return undefined; // No breakdowns, use default name
  }

  // Get labels for breakdowns (max 2 for readability)
  const labels = breakdowns.slice(0, 2).map(getBreakdownLabel);
  const suffix = breakdowns.length > 2 ? ` +${breakdowns.length - 2}` : '';

  return `${baseName} - ${labels.join(', ')}${suffix}`;
}
