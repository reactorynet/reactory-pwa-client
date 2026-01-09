/**
 * Filter utility functions for UserList component
 * @module UserList/utils/filterUtils
 */

import type {
  QuickFilterDefinition,
  AdvancedFilter,
  UserFilterInput,
} from '../types';

/**
 * Apply a quick filter to the combined filter object
 */
export function applyQuickFilter(
  combined: UserFilterInput,
  quickFilter: QuickFilterDefinition
): void {
  const { field, value, operator, additionalFilters } = quickFilter.filter;

  // Apply the main filter
  switch (operator) {
    case 'eq':
      (combined as any)[field] = value;
      break;
    case 'in':
      if (!Array.isArray((combined as any)[field])) {
        (combined as any)[field] = [];
      }
      if (!Array.isArray(value)) {
        (combined as any)[field].push(value);
      } else {
        (combined as any)[field].push(...value);
      }
      break;
    case 'ne':
    case 'is-null':
    case 'is-not-null':
      // Store in customFilters for complex operators
      if (!combined.customFilters) {
        combined.customFilters = {};
      }
      combined.customFilters[field] = { operator, value };
      break;
    default:
      // Store in customFilters for other operators
      if (!combined.customFilters) {
        combined.customFilters = {};
      }
      combined.customFilters[field] = { operator, value };
  }

  // Apply additional filters if present
  if (additionalFilters) {
    Object.assign(combined, additionalFilters);
  }
}

/**
 * Apply an advanced filter to the combined filter object
 */
export function applyAdvancedFilter(
  combined: UserFilterInput,
  advancedFilter: AdvancedFilter
): void {
  const { field, value, operator } = advancedFilter;

  // Map common field names to filter input properties
  const fieldMap: Record<string, string> = {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    businessUnit: 'businessUnitId',
    roles: 'roles',
    deleted: 'includeDeleted',
  };

  const mappedField = fieldMap[field] || field;

  // Apply the filter based on operator
  switch (operator) {
    case 'eq':
      (combined as any)[mappedField] = value;
      break;
    case 'in':
    case 'not-in':
      if (Array.isArray(value)) {
        (combined as any)[mappedField] = value;
      } else {
        (combined as any)[mappedField] = [value];
      }
      break;
    case 'contains':
    case 'starts-with':
    case 'ends-with':
      // For text operators, store in customFilters
      if (!combined.customFilters) {
        combined.customFilters = {};
      }
      combined.customFilters[field] = { operator, value };
      break;
    case 'between':
      // For date range operators
      if (Array.isArray(value) && value.length === 2) {
        if (field.includes('created')) {
          combined.createdAfter = value[0];
          combined.createdBefore = value[1];
        } else if (field.includes('lastLogin')) {
          combined.lastLoginAfter = value[0];
          combined.lastLoginBefore = value[1];
        }
      }
      break;
    case 'after':
      if (field.includes('created')) {
        combined.createdAfter = value;
      } else if (field.includes('lastLogin')) {
        combined.lastLoginAfter = value;
      }
      break;
    case 'before':
      if (field.includes('created')) {
        combined.createdBefore = value;
      } else if (field.includes('lastLogin')) {
        combined.lastLoginBefore = value;
      }
      break;
    default:
      // Store other operators in customFilters
      if (!combined.customFilters) {
        combined.customFilters = {};
      }
      combined.customFilters[field] = { operator, value };
  }
}

/**
 * Combine all filter types into a single UserFilterInput object
 */
export function combineFilters(
  predefinedFilters: UserFilterInput,
  activeQuickFilters: QuickFilterDefinition[],
  advancedFilters: AdvancedFilter[],
  searchString: string
): UserFilterInput {
  const combined: UserFilterInput = {
    ...predefinedFilters,
  };

  // Apply quick filters
  activeQuickFilters.forEach((qf) => {
    applyQuickFilter(combined, qf);
  });

  // Apply advanced filters
  advancedFilters.forEach((af) => {
    applyAdvancedFilter(combined, af);
  });

  // Apply search
  if (searchString && searchString.trim()) {
    combined.searchString = searchString.trim();
  }

  return combined;
}

/**
 * Check if two filter objects are equal
 */
export function areFiltersEqual(
  filter1: UserFilterInput,
  filter2: UserFilterInput
): boolean {
  return JSON.stringify(filter1) === JSON.stringify(filter2);
}

/**
 * Get a human-readable description of a filter
 */
export function getFilterDescription(filter: AdvancedFilter): string {
  const { field, operator, value } = filter;

  const operatorLabels: Record<string, string> = {
    eq: 'equals',
    ne: 'not equals',
    gt: 'greater than',
    gte: 'greater than or equal',
    lt: 'less than',
    lte: 'less than or equal',
    in: 'is one of',
    'not-in': 'is not one of',
    contains: 'contains',
    'starts-with': 'starts with',
    'ends-with': 'ends with',
    between: 'between',
    'is-null': 'is empty',
    'is-not-null': 'is not empty',
  };

  const operatorLabel = operatorLabels[operator] || operator;

  if (operator === 'is-null' || operator === 'is-not-null') {
    return `${field} ${operatorLabel}`;
  }

  if (operator === 'between' && Array.isArray(value)) {
    return `${field} ${operatorLabel} ${value[0]} and ${value[1]}`;
  }

  if (Array.isArray(value)) {
    return `${field} ${operatorLabel} ${value.join(', ')}`;
  }

  return `${field} ${operatorLabel} ${value}`;
}

