/**
 * Parse Object Mapper Function
 * 
 * This function parses and normalizes object mapping configurations to handle various input formats:
 * - Simple string mappings: 'sourceKey' -> 'targetKey'
 * - String with transforms: 'sourceKey' -> 'targetKey::transform'
 * - Object mappings: 'sourceKey' -> { key: 'targetKey', transform: 'transform' }
 * - Array mappings: 'sourceKey' -> ['targetKey::transform', { key: 'targetKey2', transform: 'transform2' }]
 * - Mixed array mappings: 'sourceKey' -> ['targetKey::transform', { key: 'targetKey2', transform: 'transform2' }, 'targetKey3']
 * 
 * The function supports both built-in transforms and custom FQN-based transforms.
 */

import Reactory from '@reactory/reactory-core';

/**
 * Built-in transform function that handles common data type conversions
 */
const transformFunctionBuiltInId = (
  value: any, 
  sourceObject: any, 
  destinationObject: any, 
  destinationKey: string, 
  transform: string, 
  reactory: Reactory.Client.IReactoryApi
): any => {

  if (value === undefined || value === null) {
    return value;
  }

  switch (transform) {
    case 'toInt':
      return parseInt(value);
    case 'toString':
      return String(value);
    case 'toDate':
      return new Date(value);
    case 'toBoolean':
      return Boolean(value);
    case 'toFloat':
      return parseFloat(value);
    case 'toNumber':
      return Number(value);
    case 'toObject':
      return typeof value === 'string' ? JSON.parse(value) : value;
    case 'toArray':
      return Array.isArray(value) ? value : [value];
    case 'toLowerCase':
      return typeof value === 'string' ? value.toLowerCase() : value;
    case 'toUpperCase':
      return typeof value === 'string' ? value.toUpperCase() : value;
    case 'trim':
      return typeof value === 'string' ? value.trim() : value;
    case 'timestamp':
      return value instanceof Date ? value.getTime() : new Date(value).getTime();
    default: {
      // Check if the transform is a function reference on the reactory
      const transformFunction = reactory.$func[transform] 
        ? reactory.$func[transform] 
        : reactory.getComponent<Function>(transform);
      
      if (transformFunction) {
        return transformFunction(value, sourceObject, destinationObject, destinationKey);
      } else {
        // If it's an FQN, try to get the component and execute it
        if (transform.includes('@')) {
          try {
            const component = reactory.getComponent<Function>(transform);
            if (component && typeof component === 'function') {
              return component(value, sourceObject, destinationObject, destinationKey);
            }
          } catch (error) {
            console.warn(`Failed to resolve transform FQN: ${transform}`, error);
          }
        }
        return value;
      }
    }
  }
};

/**
 * Parse a single mapping entry and return a normalized ObjectMapEntry
 */
const parseMappingEntry = (
  entry: string | Reactory.ObjectTransform<any, any>,
  reactory: Reactory.Client.IReactoryApi
): Reactory.ObjectMapEntry => {
  // Handle string entries
  if (typeof entry === 'string') {
    if (entry.includes('::')) {
      const [targetKey, transform] = entry.split('::');
      return {
        key: targetKey,
        transform: (sourceValue: any, sourceObject: any, destinationObject: any, destinationKey: string) => {
          return transformFunctionBuiltInId(sourceValue, sourceObject, destinationObject, destinationKey, transform, reactory);
        },
        default: null,
      } as Reactory.ObjectTransform<any, any>;
    } else {
      return entry;
    }
  }

  // Handle object entries
  if (typeof entry === 'object' && entry !== null) {
    const transformEntry = entry as Reactory.ObjectTransform<any, any>;
    
    if (typeof transformEntry.transform === 'string') {
      return {
        key: transformEntry.key,
        transform: (sourceValue: any, sourceObject: any, destinationObject: any, destinationKey: string) => {
          return transformFunctionBuiltInId(
            sourceValue, 
            sourceObject, 
            destinationObject, 
            destinationKey, 
            transformEntry.transform as unknown as string, 
            reactory
          );
        },
        default: transformEntry.default || null,
      } as Reactory.ObjectTransform<any, any>;
    } else if (typeof transformEntry.transform === 'function') {
      return transformEntry;
    }
  }

  // Fallback: return as is
  return entry;
};

/**
 * Parse and normalize an object mapping configuration
 * 
 * @param objectMap - The input object mapping configuration
 * @param reactory - The Reactory API instance
 * @returns Normalized object mapping configuration
 */
export const parseObjectMapperFunction = (
  objectMap: Reactory.ObjectMap, 
  reactory: Reactory.Client.IReactoryApi
): Reactory.ObjectMap => {
  const normalizedMap: Reactory.ObjectMap = {};

  Object.keys(objectMap).forEach((sourceKey) => {
    const destinationValue = objectMap[sourceKey];

    // Handle string mappings
    if (typeof destinationValue === 'string') {
      normalizedMap[sourceKey] = parseMappingEntry(destinationValue, reactory);
    }

    // Handle object mappings
    else if (typeof destinationValue === 'object' && destinationValue !== null && !Array.isArray(destinationValue)) {
      normalizedMap[sourceKey] = parseMappingEntry(destinationValue as Reactory.ObjectTransform<any, any>, reactory);
    }

    // Handle array mappings (multiple targets)
    else if (Array.isArray(destinationValue)) {
      const normalizedEntries: Reactory.ObjectMapEntry[] = [];
      
      destinationValue.forEach((item) => {
        const normalizedEntry = parseMappingEntry(item, reactory);
        if (normalizedEntry) {
          normalizedEntries.push(normalizedEntry);
        }
      });

      normalizedMap[sourceKey] = normalizedEntries;
    }

    // Handle other types (pass through)
    else {
      normalizedMap[sourceKey] = destinationValue;
    }
  });

  return normalizedMap;
};

/**
 * Legacy function name for backward compatibility
 */
export const parseObjectMapper = parseObjectMapperFunction;

export default parseObjectMapperFunction; 