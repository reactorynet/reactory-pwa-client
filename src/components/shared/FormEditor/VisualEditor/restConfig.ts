/**
 * Pure helpers + constants for the REST data-provider editor.
 *
 * Models Reactory's IFormRESTDefinition and IReactoryFormRESTCall for a visual
 * editor. A REST provider carries the definition on its object:
 *   { type: 'rest', default?, queries: { <key>: IReactoryFormRESTCall }, mutations: {...} }
 *
 * IReactoryFormRESTCall = { url, method?, provider?, runat?, options{ headers, body, ... },
 *                           optionsProvider?, cache? }
 */

import { pruneEmpty } from './graphConfig';

export const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const REST_PROVIDERS = ['fetch', 'axios'];
export const REST_RUNAT = ['server', 'client'];

/** Methods that carry a request body. */
export const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH'];

export const emptyRestCall = (): any => ({ url: '', method: 'GET', options: {} });

/**
 * Prune a REST call but always keep a valid shape (url + options object).
 */
export const cleanRestCall = (call: any): any => {
  const pruned = pruneEmpty(call) || {};
  return {
    url: call?.url || '',
    method: call?.method || 'GET',
    ...pruned,
    // options must remain an object even if empty (the type requires it).
    options: (pruned.options && typeof pruned.options === 'object') ? pruned.options : {},
  };
};

/**
 * Parse a body/JSON-ish text value: return the parsed object/array when the text
 * is valid JSON, otherwise the raw string (REST bodies can be template strings).
 * Empty string → undefined.
 */
export const parseBodyValue = (text: string): any => {
  const trimmed = (text || '').trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
};

/** Render a body value back to editable text. */
export const bodyToText = (value: any): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/** Split options into headers / body / the remaining ("other") option keys. */
export const splitOptions = (options: any): { headers: any; body: any; other: Record<string, any> } => {
  const opts = options && typeof options === 'object' ? options : {};
  const { headers, body, ...other } = opts;
  return { headers, body, other };
};

/** Reassemble options from parts, dropping empty pieces. */
export const mergeOptions = (headers: any, body: any, other: Record<string, any>): any => {
  const out: Record<string, any> = { ...(other || {}) };
  if (headers && Object.keys(headers).length > 0) out.headers = headers;
  if (body !== undefined && body !== '' && body !== null) out.body = body;
  return out;
};
