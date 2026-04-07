import { facebookAdsSpec } from './node-specs/facebook.ads';
import { googleAdsSourceSpec } from './node-specs/google.ads';
import { tiktokAdsSpec } from './node-specs/tiktok.ads';
import { errorTriggerSourceSpec } from './node-specs/source.error-trigger';
import { sqlTransformSpec } from './node-specs/transform.sql';
import { renameTransformSpec } from './node-specs/transform.rename';
import { joinTransformSpec } from './node-specs/transform.join';
import { columnEditorTransformSpec } from './node-specs/transform.column-editor';
import { unifyTransformSpec } from './node-specs/transform.unify';
import { ifNodeSpec } from './node-specs/logic.if';
import { switchNodeSpec } from './node-specs/logic.switch';
import { mysqlDestSpec } from './node-specs/dest.mysql';
import { bigQueryDestSpec } from './node-specs/dest.bigquery';
import { googleSheetsDestSpec } from './node-specs/dest.googlesheets';
import type { NodeSpec } from './node-specs/types';

export type { NodeSpec } from './node-specs/types';

export const nodeRegistry: Record<string, NodeSpec> = {
  'facebook.ads': facebookAdsSpec,
  'google.ads': googleAdsSourceSpec,
  'tiktok.ads': tiktokAdsSpec,
  'source.error-trigger': errorTriggerSourceSpec,
  'transform.sql': sqlTransformSpec,
  'transform.rename': renameTransformSpec,
  'transform.join': joinTransformSpec,
  'transform.column-editor': columnEditorTransformSpec,
  'transform.unify': unifyTransformSpec,
  'logic.if': ifNodeSpec,
  'logic.switch': switchNodeSpec,
  'dest.mysql': mysqlDestSpec,
  'dest.bigquery': bigQueryDestSpec,
  'dest.googlesheets': googleSheetsDestSpec,
};

export function getNodeSpec(typeId: string): NodeSpec | undefined {
  return nodeRegistry[typeId];
}

export function getNodeSpecByDisplayName(name: string): NodeSpec | undefined {
  const entry = Object.values(nodeRegistry).find(s => s.displayName === name);
  return entry;
}


