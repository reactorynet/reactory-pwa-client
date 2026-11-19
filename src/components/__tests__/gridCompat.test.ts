import { toGridProps } from '../gridCompat';

describe('toGridProps', () => {
  it('moves legacy breakpoint props into size and drops item', () => {
    expect(toGridProps({ item: true, xs: 12, md: 6, sx: { p: 1 } })).toEqual({
      size: { xs: 12, md: 6 },
      sx: { p: 1 },
    });
  });

  it('maps xs={true} to grow and skips false breakpoints', () => {
    expect(toGridProps({ xs: true, md: false })).toEqual({ size: { xs: 'grow' } });
  });

  it('lets an explicit size object win over legacy breakpoints', () => {
    expect(toGridProps({ xs: 12, md: 6, size: { md: 4 } })).toEqual({ size: { xs: 12, md: 4 } });
  });

  it('keeps a scalar size and drops the legacy breakpoints', () => {
    expect(toGridProps({ xs: 12, size: 6 })).toEqual({ size: 6 });
  });

  it('passes modern props through and tolerates empty input', () => {
    const props = { container: true, spacing: 2, size: { xs: 12 } };
    expect(toGridProps(props)).toEqual(props);
    expect(toGridProps(undefined)).toEqual({});
    expect(toGridProps(null)).toEqual({});
  });
});
