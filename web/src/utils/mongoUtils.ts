import { MongoId } from '../types/backend';

/**
 * Extract a plain string ID from a MongoId type (string or { $oid: string }).
 * Returns undefined when the input is falsy or unrecognisable.
 */
export const extractMongoId = (id: MongoId | undefined): string | undefined => {
 if (!id) return undefined;
 if (typeof id === 'string') return id;
 if (typeof id === 'object' && '$oid' in id) return id.$oid;
 return undefined;
};
