import { renderHook } from '@testing-library/react-hooks';
import { useFeatureFlag, useSimpleFeatureFlag, useMemoryFeatureFlag } from '../useFeatureFlag';
import { FeatureFlagConfiguration } from '../../../featureflags/models/FeatureFlagConfiguration';

describe('useFeatureFlag', () => {
  it('does not cause an infinite re-render loop when options are omitted or passed inline', async () => {
    let renderCount = 0;

    const { result, waitForNextUpdate } = renderHook(() => {
      renderCount++;
      return useFeatureFlag({
        featureId: 'test-feature',
      });
    });

    await waitForNextUpdate();

    expect(renderCount).toBeLessThan(5);
    expect(result.current.loading).toBe(false);
  });

  it('does not re-render endlessly when using useSimpleFeatureFlag', async () => {
    let renderCount = 0;

    const { result, waitForNextUpdate } = renderHook(() => {
      renderCount++;
      return useSimpleFeatureFlag('simple-feature');
    });

    await waitForNextUpdate();

    expect(renderCount).toBeLessThan(5);
    expect(result.current.loading).toBe(false);
  });

  it('correctly reads feature flags from static configuration', async () => {
    const staticFlags = [
      new FeatureFlagConfiguration('flag-1', true),
    ];

    const { result, waitForNextUpdate } = renderHook(() =>
      useMemoryFeatureFlag('flag-1', staticFlags)
    );

    await waitForNextUpdate();

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
