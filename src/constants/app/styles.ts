/**
 * Style constants for the application
 * @module constants/app/styles
 */

import { AppStyleClasses } from '../../types/app';

/**
 * Prefix for all app-related CSS classes
 */
export const PREFIX = 'ReactoryHOC';

/**
 * CSS class names used throughout the application
 * These are used with MUI styled components
 */
export const classes: AppStyleClasses = {
  root_paper: `${PREFIX}-root_paper`,
  selectedMenuLabel: `${PREFIX}-selectedMenuLabel`,
  prepend: `${PREFIX}-prepend`,
  selected: `${PREFIX}-selected`,
  preffered: `${PREFIX}-preffered`,
  get_started: `${PREFIX}-get_started`,
  schema_selector: `${PREFIX}-schema_selector`
};
