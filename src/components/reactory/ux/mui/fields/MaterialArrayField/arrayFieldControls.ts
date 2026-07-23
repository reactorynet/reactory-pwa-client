/**
 * Pure gating logic for the array field's Add / Delete controls.
 *
 * Defaults: adding and deleting are ENABLED. They are only restricted when
 * explicitly turned off, when the field is readonly/disabled, or by the schema's
 * item bounds:
 *   - Add    : disabled once maxItems is reached.
 *   - Delete : disabled for the last item(s) when removing would drop the array
 *              below its required minimum (minItems, or 1 when the array is
 *              required and no minItems is set).
 */

export interface ArrayControlInput {
  itemCount: number;
  minItems?: number;
  maxItems?: number;
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  /** ui:options.allowAdd (default true). */
  allowAdd?: boolean;
  /** ui:options.addable — rjsf convention (default true). */
  addable?: boolean;
  /** ui:options.allowDelete (default true). */
  allowDelete?: boolean;
  /** Optional incoming canAdd prop; only restricts when explicitly false. */
  canAdd?: boolean;
}

export interface ArrayControls {
  /** The effective minimum item count that must be retained. */
  requiredMinItems: number;
  /** Whether another item may be added w.r.t. maxItems. */
  underMaxItems: boolean;
  /** Whether the Add button should be rendered. */
  addAllowed: boolean;
  /** Whether the Add button should be disabled. */
  addDisabled: boolean;
  /** Whether the Delete control should be rendered. */
  removeAllowed: boolean;
  /** Whether an individual item may currently be removed (min-count guard). */
  canRemoveItem: boolean;
}

export const computeArrayControls = (input: ArrayControlInput): ArrayControls => {
  const {
    itemCount,
    minItems,
    maxItems,
    required = false,
    readonly = false,
    disabled = false,
    allowAdd = true,
    addable = true,
    allowDelete = true,
    canAdd,
  } = input;

  const requiredMinItems = typeof minItems === 'number' ? minItems : (required ? 1 : 0);
  const underMaxItems = maxItems === undefined || itemCount < maxItems;

  const addAllowed = allowAdd !== false && addable !== false && canAdd !== false;
  const addDisabled = Boolean(disabled) || Boolean(readonly) || !underMaxItems;

  const removeAllowed = allowDelete !== false && !readonly;
  const canRemoveItem = itemCount > requiredMinItems;

  return { requiredMinItems, underMaxItems, addAllowed, addDisabled, removeAllowed, canRemoveItem };
};
