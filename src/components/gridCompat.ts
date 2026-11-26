const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

type GridSizeValue = number | string | boolean;

const toSizeValue = (value: GridSizeValue): number | string =>
  // The legacy Grid used `xs={true}` for "fill the remaining space".
  value === true ? 'grow' : (value as number | string);

/**
 * MUI 7 replaced the legacy Grid's `item` flag and per-breakpoint props
 * (`xs`, `md`, ...) with a single `size` prop, and MUI 9 no longer strips the
 * old ones: they reach the DOM as invalid attributes and the item falls back
 * to its content width. Grid props that come from uiSchema data or older
 * layout objects still use the legacy shape, so normalise them wherever such
 * props are spread into a `Grid`.
 */
export const toGridProps = (props?: Record<string, any> | null): Record<string, any> => {
  if (!props) return {};
  const { item: _item, zeroMinWidth: _zeroMinWidth, ...rest } = props;
  const legacy: Record<string, number | string> = {};
  for (const bp of BREAKPOINTS) {
    if (bp in rest) {
      if (rest[bp] !== undefined && rest[bp] !== false) legacy[bp] = toSizeValue(rest[bp]);
      delete rest[bp];
    }
  }
  if (Object.keys(legacy).length > 0) {
    const { size } = rest;
    if (size === undefined || size === null) rest.size = legacy;
    else if (typeof size === 'object') rest.size = { ...legacy, ...size };
  }
  return rest;
};
