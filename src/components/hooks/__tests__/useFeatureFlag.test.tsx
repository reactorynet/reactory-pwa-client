import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureFlag, useSimpleFeatureFlag, useMemoryFeatureFlag } from '../useFeatureFlag';
import { FeatureFlagConfiguration } from '../../../featureflags/models/FeatureFlagConfiguration';

describe('useFeatureFlag', () => {
  it('does not cause an infinite re-render loop when options are omitted or passed inline', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useFeatureFlag({
        featureId: 'test-feature',
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(renderCount).toBeLessThan(5);
    expect(result.current.loading).toBe(false);
  });

  it('does not re-render endlessly when using useSimpleFeatureFlag', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useSimpleFeatureFlag('simple-feature');
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(renderCount).toBeLessThan(5);
    expect(result.current.loading).toBe(false);
  });

  it('correctly reads feature flags from static configuration', async () => {
    const staticFlags = [
      new FeatureFlagConfiguration('flag-1', true),
    ];

    const { result } = renderHook(() =>
      useMemoryFeatureFlag('flag-1', staticFlags)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
