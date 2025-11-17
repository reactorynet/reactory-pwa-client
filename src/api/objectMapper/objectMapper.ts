/**
 * ObjectMapper - A utility for mapping objects using a declarative mapping configuration
 * 
 * This module provides functionality to transform and map data between different object structures
 * using a flexible key-based mapping system that supports nested objects, arrays, transformations,
 * and default values.
 */

// Type definitions for the mapping system
export interface MappingContext {
  src: any;
  srckey: string;
  destkey: any;
  transform?: TransformFunction;
  default?: DefaultValue | DefaultFunction;
}

export type TransformFunction = (
  data: any, 
  src: any, 
  dest: any, 
  srckey: string, 
  destkey: any
) => any;

export type DefaultFunction = (
  src: any, 
  srckey: string, 
  dest: any, 
  destkey: any
) => any;

export type DefaultValue = any;

export interface KeyInstruction {
  name?: string;
  ix?: string;
  add?: boolean;
  nulls?: boolean;
}

export interface MappingConfig {
  [key: string]: string | KeyConfig | (string | KeyConfig)[];
}

export interface KeyConfig {
  key: string | [string, TransformFunction?, DefaultValue?];
  transform?: TransformFunction;
  default?: DefaultValue | DefaultFunction;
}

export type SourceData = any;
export type DestinationData = any;
export type MappingMap = Record<string, any>;

/**
 * Map an object to another using the passed map
 * @param src - Source object to map from
 * @param dest - Destination object (optional, can be passed as second parameter)
 * @param map - Mapping configuration
 * @returns Mapped destination object
 */
export function ObjectMapper(
  src: SourceData, 
  dest?: DestinationData | MappingMap, 
  map?: MappingMap
): DestinationData {
  // Handle different constructor signatures
  // e.g., ObjectMapper(from, map) vs ObjectMapper(from, dest, map)
  if (typeof map === 'undefined') {
    map = dest as MappingMap;
    dest = undefined;
  }

  // Loop through the map to process individual mapping instructions
  for (const srckey in map) {
    const destkey = map[srckey];
    // Extract the data from the source object or array
    const data = getKeyValue(src, srckey);
    // Build context object for transform/default functions
    const context: MappingContext = { src, srckey, destkey };
    // Set the data into the destination object or array format
    dest = setKeyValue(dest, destkey, data, context);
  }

  return dest as DestinationData;
}

/**
 * Extract a value from the source object using a key string
 * @param src - Source object
 * @param keystr - Key string (e.g., "user.profile.name")
 * @returns Extracted value
 */
export function getKeyValue(src: SourceData, keystr: string): any {
  // Parse the source key string into an array/object format
  const keys = parse(keystr);
  // Select the data from the source object or array
  const data = select(src, keys);
  return data;
}

/**
 * Select data from source using parsed key instructions
 * @param src - Source object
 * @param keys - Parsed key instructions
 * @returns Selected data
 */
function select(src: SourceData, keys: KeyInstruction[] | null): any {
  if (!keys || keys.length === 0) return null;
  
  // Get the object key or index that needs to be parsed
  const key = keys.shift()!;

  // Handle array traversal
  if (key.ix !== null && typeof key.ix !== 'undefined') {
    return selectArray(src, key, keys);
  }

  // Handle object key traversal
  if (key.name) {
    return selectObject(src, key, keys);
  }

  return null;
}

/**
 * Select data from array source
 * @param src - Source array
 * @param key - Key instruction
 * @param keys - Remaining key instructions
 * @returns Selected data
 */
function selectArray(src: SourceData, key: KeyInstruction, keys: KeyInstruction[]): any {
  const data: any[] = [];

  // Handle case where source is not an array but we specify array access
  if (!Array.isArray(src)) {
    let d: any = null;
    if (keys.length) {
      d = select(src, keys);
    }
    return d !== null ? [d] : null;
  }

  // Recursively loop through the array and grab the data
  for (let i = 0; i < src.length; i++) {
    const d = keys.length ? select(src[i], keys.slice()) : src[i];
    if (d !== null) {
      data[i] = d;
    }
  }

  // Return the whole array if no specific index is defined
  if (key.ix === '' && data.length) {
    return data;
  }

  // Return specific array index if defined
  if (key.ix && typeof negativeArrayAccess(data, key.ix) !== 'undefined') {
    return negativeArrayAccess(data, key.ix);
  }

  // Fallback: return first node if expecting object key
  if (typeof data[0] !== 'undefined' && key.name && data[0][key.name]) {
    return data[0][key.name];
  }

  return null;
}

/**
 * Allow negative array indexes to count down from end of array
 * @param arr - Array to access
 * @param ix - Index (can be negative)
 * @returns Array element
 */
function negativeArrayAccess(arr: any[], ix: string): any {
  const pix = parseInt(ix);
  return pix < 0 ? arr[arr.length + pix] : arr[ix];
}

/**
 * Select data from object source
 * @param src - Source object
 * @param key - Key instruction
 * @param keys - Remaining key instructions
 * @returns Selected data
 */
function selectObject(src: SourceData, key: KeyInstruction, keys: KeyInstruction[]): any {
  if (src && key.name) {
    // Match all keys in the object
    if (key.name === '*') {
      return selectObjectKeys(src, keys);
    }

    // Handle case where key specifies object but data structure is array
    if (Array.isArray(src)) {
      if (src.length && src[0]) {
        return keys.length ? select(src[0][key.name], keys) : src[0][key.name];
      }
      return null;
    }

    // Object has the given key
    if (key.name in src) {
      const data = keys.length ? select(src[key.name], keys) : src[key.name];
      if (data !== null) {
        return data;
      }
    }
  }
  return null;
}

/**
 * Select data from all keys in object
 * @param src - Source object
 * @param keys - Key instructions
 * @returns Array of selected data
 */
function selectObjectKeys(src: SourceData, keys: KeyInstruction[]): any[] {
  const data: any[] = [];
  let n = 0;
  
  // Recursively loop through object keys and grab data
  for (const k in src) {
    const d = keys.length ? select(src[k], keys.slice()) : src[k];
    if (d !== null) {
      data[n++] = d;
    }
  }

  return data.length ? data : null;
}

/**
 * Set a value in the destination object using key string and context
 * @param dest - Destination object
 * @param keystr - Key string or configuration
 * @param data - Data to set
 * @param context - Mapping context
 * @returns Updated destination object
 */
export function setKeyValue(
  dest: DestinationData, 
  keystr: any, 
  data: any, 
  context: Partial<MappingContext> = {}
): DestinationData {
  // Handle undefined keystr
  if (typeof keystr === 'undefined' || keystr === null) {
    return setData(dest, keystr, data, context);
  }

  // Handle array of key configurations
  if (Array.isArray(keystr)) {
    for (let i = 0; i < keystr.length; i++) {
      // String notation
      if (typeof keystr[i] === 'string') {
        dest = setKeyValue(dest, keystr[i], data, context);
      }
      // Array notation [key, transform?, default?]
      else if (Array.isArray(keystr[i])) {
        const [k, t, d] = keystr[i];
        if (typeof t !== 'undefined') context.transform = t;
        if (typeof d !== 'undefined') context.default = d;
        dest = setKeyValue(dest, k, data, context);
      }
      // Object notation
      else {
        if (typeof keystr[i].transform !== 'undefined') {
          context.transform = keystr[i].transform;
        }
        if (typeof keystr[i].default !== 'undefined') {
          context.default = keystr[i].default;
        }
        
        // Handle nested array in key
        if (Array.isArray(keystr[i].key)) {
          const [k, t, d] = keystr[i].key;
          if (typeof t !== 'undefined') context.transform = t;
          if (typeof d !== 'undefined') context.default = d;
          dest = setKeyValue(dest, k, data, context);
        } else {
          dest = setKeyValue(dest, keystr[i].key, data, context);
        }
      }
    }
  }
  // String notation
  else if (typeof keystr === 'string') {
    dest = update(dest, data, parse(keystr), context);
  }
  // Object notation
  else {
    if (typeof keystr.transform !== 'undefined') {
      context.transform = keystr.transform;
    }
    if (typeof keystr.default !== 'undefined') {
      context.default = keystr.default;
    }
    
    if (Array.isArray(keystr.key)) {
      const [k, t, d] = keystr.key;
      if (typeof t !== 'undefined') context.transform = t;
      if (typeof d !== 'undefined') context.default = d;
      dest = setKeyValue(dest, k, data, context);
    } else {
      dest = setKeyValue(dest, keystr.key, data, context);
    }
  }

  return dest;
}

/**
 * Update destination object by traversing key path
 * @param dest - Destination object
 * @param data - Data to set
 * @param keys - Parsed key instructions
 * @param context - Mapping context
 * @returns Updated destination object
 */
function update(
  dest: DestinationData, 
  data: any, 
  keys: KeyInstruction[] | null, 
  context: Partial<MappingContext>
): DestinationData {
  if (keys && keys.length > 0) {
    const key = keys.shift()!;

    // Handle object key traversal
    if (key.name) {
      return updateObject(dest, key, data, keys, context);
    }

    // Handle array index traversal
    if (typeof key.ix !== 'undefined') {
      return updateArray(dest, key, data, keys, context);
    }
  }

  // Leaf node - set data
  return setData(dest, null, data, context);
}

/**
 * Update destination object property
 * @param dest - Destination object
 * @param key - Key instruction
 * @param data - Data to set
 * @param keys - Remaining key instructions
 * @param context - Mapping context
 * @returns Updated destination object
 */
function updateObject(
  dest: DestinationData, 
  key: KeyInstruction, 
  data: any, 
  keys: KeyInstruction[], 
  context: Partial<MappingContext>
): DestinationData {
  if (keys.length) {
    // Recurse through existing destination object
    if (dest !== null && typeof dest !== 'undefined') {
      const o = update(dest[key.name!], data, keys, context);
      if (o !== null && typeof o !== 'undefined') {
        dest[key.name!] = o;
      }
    }
    // Create new object if needed
    else {
      const o = update(null, data, keys, context);
      if (o !== null) {
        dest = {};
        dest[key.name!] = o;
      }
    }
  } else {
    dest = setData(dest, key, data, context);
  }

  return dest;
}

/**
 * Update destination array
 * @param dest - Destination array
 * @param key - Key instruction
 * @param data - Data to set
 * @param keys - Remaining key instructions
 * @param context - Mapping context
 * @returns Updated destination array
 */
function updateArray(
  dest: DestinationData, 
  key: KeyInstruction, 
  data: any, 
  keys: KeyInstruction[], 
  context: Partial<MappingContext>
): DestinationData {
  // Handle 'add' instruction
  if (key.add) {
    if (data !== null && typeof data !== 'undefined') {
      dest = dest || [];
      dest.push(applyTransform(data, dest, context));
    }
    return dest;
  }

  // Update single array node
  if (key.ix !== '') {
    return updateArrayIndex(dest, key.ix!, applyTransform(data, dest, context), keys, context);
  }

  // Handle array data
  if (Array.isArray(data)) {
    dest = dest || [];
    dest = data.reduce((dest, d, i) => {
      if (key.ix === '' || key.ix === i.toString()) {
        return updateArrayIndex(dest, i, applyTransform(d, dest, context), keys.slice(), context);
      }
      return dest;
    }, dest);

    return dest;
  }

  // Set specific array index
  return updateArrayIndex(dest, '0', data, keys, context);
}

/**
 * Apply transformation function if available
 * @param data - Data to transform
 * @param dest - Destination object
 * @param context - Mapping context
 * @returns Transformed data
 */
function applyTransform(data: any, dest: any, context: Partial<MappingContext>): any {
  if (typeof context.transform === 'function') {
    return context.transform(data, context.src, dest, context.srckey, context.destkey);
  }
  return data;
}

/**
 * Update specific array index
 * @param dest - Destination array
 * @param ix - Array index
 * @param data - Data to set
 * @param keys - Remaining key instructions
 * @param context - Mapping context
 * @returns Updated destination array
 */
function updateArrayIndex(
  dest: DestinationData, 
  ix: string | number, 
  data: any, 
  keys: KeyInstruction[], 
  context: Partial<MappingContext>
): DestinationData {
  let o: any;
  
  if (dest !== null && typeof dest !== 'undefined' && typeof dest[ix] !== 'undefined') {
    o = keys.length ? update(dest[ix], data, keys, context) : data;
  } else {
    o = keys.length ? update(null, data, keys, context) : data;
  }

  // Only update dest if there is data to save
  if (o !== null) {
    dest = dest || [];
    dest[ix] = o;
  }

  return dest;
}

/**
 * Set data into destination object
 * @param dest - Destination object
 * @param key - Key instruction
 * @param data - Data to set
 * @param context - Mapping context
 * @returns Updated destination object
 */
function setData(
  dest: DestinationData, 
  key: KeyInstruction | null, 
  data: any, 
  context: Partial<MappingContext>
): DestinationData {
  // Apply transformation function
  if (typeof context.transform === 'function') {
    dest = dest || {};
    data = context.transform(data, context.src, dest, context.srckey, context.destkey);
  }

  // Handle default values
  if (typeof context.default !== 'undefined' && (data == null || typeof data === 'undefined')) {
    if (typeof context.default === 'function') {
      dest = dest || {};
      data = context.default(context.src, context.srckey, dest, context.destkey);
    } else {
      data = context.default;
    }
  }

  // Set the object property if data is defined and key exists
  if (typeof data !== 'undefined' && key && key.name) {
    if (data !== null || key.nulls || (typeof context.default !== 'undefined' && context.default === null)) {
      dest = dest || {};
      dest[key.name] = data;
    }
  }

  return dest;
}

/**
 * Parse key string into structured instructions
 * @param keyStr - Key string (e.g., "user.profile[0].name")
 * @param delimiter - Delimiter character (default: '.')
 * @returns Array of key instructions
 */
export function parse(keyStr: string | null, delimiter: string = '.'): KeyInstruction[] | null {
  if (keyStr == null) {
    return null;
  }

  const keyArr = split(keyStr, delimiter);
  const keys: KeyInstruction[] = [];
  let n = 0;

  for (let i = 0; i < keyArr.length; i++) {
    let nameBegin = -1, nameEnd = -1, ixBegin = -1, ixEnd = -1;
    const o: KeyInstruction = {}, a: KeyInstruction = {};
    const k = keyArr[i];

    for (let j = 0; j < k.length; j++) {
      switch (k[j]) {
        case '[':
          ixBegin = j + 1;
          nameEnd = j;
          break;
        case ']':
          ixEnd = j;
          break;
        case '+':
          if (ixEnd === j - 1) a.add = true;
          break;
        case '?':
          nameEnd = j;
          if (ixEnd === -1) o.nulls = true;
          break;
        default:
          if (ixBegin === -1) nameEnd = j + 1;
      }
    }

    if (nameEnd > 0) {
      o.name = k.substring(nameBegin, nameEnd);
      keys[n++] = o;
    }
    if (ixEnd > 0) {
      a.ix = k.substring(ixBegin, ixEnd);
      keys[n++] = a;
    }
  }

  return keys;
}

/**
 * Split string while respecting escaped delimiters
 * @param str - String to split
 * @param delimiter - Delimiter character
 * @returns Array of split strings
 */
export function split(str: string, delimiter: string): string[] {
  const arr: string[] = [];
  let n = 0;
  let esc = -99;
  let s = '';

  for (let i = 0; i < str.length; i++) {
    switch (str[i]) {
      case delimiter:
        if (esc !== (i - 1)) {
          arr[n++] = s;
          s = '';
        } else {
          s += str[i];
        }
        break;
      case '\\':
        // Escaping a backslash
        if (esc === (i - 1)) {
          esc = -99;
          s += str[i - 1] + str[i];
        } else {
          esc = i;
        }
        break;
      default:
        if (esc === (i - 1)) {
          s += str[i - 1];
        }
        s += str[i];
    }
  }
  arr[n++] = s;
  return arr;
}

// Export aliases for backward compatibility
export const merge = ObjectMapper;

// Default export
export default ObjectMapper; 