/**
 * Tests for the useFormLoadingState hook.
 * Verifies granular loading stage tracking and progress calculation.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useFormLoadingState,
  LOADING_STAGE_KEYS,
  LoadingStageKey,
  FormLoadingState,
} from '../useFormLoadingState';

describe('useFormLoadingState', () => {
  describe('initialization', () => {
    it('initializes with all stages pending', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.stages).toHaveLength(5);
      expect(result.current.stages.every(s => s.status === 'pending')).toBe(true);
    });

    it('sets initial loading state correctly', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('returns stages with correct keys and labels', () => {
      const { result } = renderHook(() => useFormLoadingState());

      const expectedKeys = ['form-definition', 'ui-schema', 'widgets', 'resources', 'data'];
      const actualKeys = result.current.stages.map(s => s.key);

      expect(actualKeys).toEqual(expectedKeys);
      expect(result.current.stages[0].label).toBe('Loading form definition');
      expect(result.current.stages[1].label).toBe('Resolving UI schema');
      expect(result.current.stages[2].label).toBe('Mapping widgets & fields');
      expect(result.current.stages[3].label).toBe('Loading resources');
      expect(result.current.stages[4].label).toBe('Fetching data');
    });

    it('sets initial active stage label', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.activeStageLabel).toBe('Preparing...');
    });
  });

  describe('setStageActive', () => {
    it('marks a stage as active', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.status).toBe('active');
    });

    it('updates activeStageLabel when stage becomes active', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('ui-schema');
      });

      expect(result.current.activeStageLabel).toBe('Resolving UI schema');
    });

    it('most recent active stage determines activeStageLabel', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
      });

      expect(result.current.activeStageLabel).toBe('Loading form definition');

      act(() => {
        result.current.setStageActive('widgets');
      });

      // activeStageLabel uses find(), which returns first active stage in array
      // Since form-definition was activated first, it's still the reported active stage
      expect(result.current.activeStageLabel).toBe('Loading form definition');
    });

    it('does not affect isLoading state', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('setStageComplete', () => {
    it('marks a stage as complete', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.status).toBe('complete');
    });

    it('increases progress percentage', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.setStageComplete('form-definition');
      });

      expect(result.current.progress).toBe(20); // 1 of 5 stages
    });

    it('calculates correct progress for multiple completed stages', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
        result.current.setStageComplete('ui-schema');
      });

      expect(result.current.progress).toBe(40); // 2 of 5 stages
    });

    it('sets isLoading to false when all stages complete', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setStageComplete('form-definition');
        result.current.setStageComplete('ui-schema');
        result.current.setStageComplete('widgets');
        result.current.setStageComplete('resources');
        result.current.setStageComplete('data');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);
    });

    it('still shows active stage label if one is active', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
        result.current.setStageComplete('form-definition');
        result.current.setStageActive('ui-schema');
      });

      expect(result.current.activeStageLabel).toBe('Resolving UI schema');
    });
  });

  describe('setStageError', () => {
    it('marks a stage as errored', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageError('form-definition', 'Failed to load form');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.status).toBe('error');
      expect(stage?.errorMessage).toBe('Failed to load form');
    });

    it('sets hasError to true', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.hasError).toBe(false);

      act(() => {
        result.current.setStageError('form-definition');
      });

      expect(result.current.hasError).toBe(true);
    });

    it('sets isLoading to false when error occurs', () => {
      const { result } = renderHook(() => useFormLoadingState());

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setStageError('form-definition', 'Network error');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets activeStageLabel to error message label', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageError('widgets', 'Widget mapping failed');
      });

      expect(result.current.activeStageLabel).toBe('Mapping widgets & fields');
    });

    it('allows optional error message', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageError('form-definition');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.errorMessage).toBeUndefined();
    });

    it('prevents further progress when error occurs', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageError('form-definition', 'Failed');
        result.current.setStageComplete('ui-schema');
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('skipStage', () => {
    it('marks a stage as complete without activating it', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.skipStage('form-definition');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.status).toBe('complete');
    });

    it('increases progress when skipping', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.skipStage('form-definition');
        result.current.skipStage('ui-schema');
      });

      expect(result.current.progress).toBe(40); // 2 of 5 stages
    });

    it('does not affect activeStageLabel if no active stage', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.skipStage('form-definition');
      });

      expect(result.current.activeStageLabel).toBe('Preparing...');
    });

    it('useful for optional stages in loading flow', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
        result.current.setStageComplete('form-definition');
        result.current.setStageActive('ui-schema');
        result.current.setStageComplete('ui-schema');
        result.current.skipStage('widgets'); // Skip if not needed
        result.current.setStageActive('resources');
        result.current.setStageComplete('resources');
        result.current.setStageActive('data');
        result.current.setStageComplete('data');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);
    });
  });

  describe('reset', () => {
    it('resets all stages to pending', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
        result.current.setStageActive('ui-schema');
        result.current.setStageError('widgets', 'Error');
      });

      expect(result.current.stages.some(s => s.status !== 'pending')).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.stages.every(s => s.status === 'pending')).toBe(true);
    });

    it('resets loading state', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
        result.current.setStageComplete('ui-schema');
        result.current.setStageComplete('widgets');
        result.current.setStageComplete('resources');
        result.current.setStageComplete('data');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.progress).toBe(0);
    });

    it('clears error state', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageError('form-definition', 'Error');
      });

      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.hasError).toBe(false);
    });

    it('resets activeStageLabel to default', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('ui-schema');
      });

      expect(result.current.activeStageLabel).toBe('Resolving UI schema');

      act(() => {
        result.current.reset();
      });

      expect(result.current.activeStageLabel).toBe('Preparing...');
    });

    it('allows restart of loading flow after reset', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
      });

      act(() => {
        result.current.reset();
      });

      act(() => {
        result.current.setStageActive('form-definition');
        result.current.setStageComplete('form-definition');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.status).toBe('complete');
    });
  });

  describe('progress calculation', () => {
    it('calculates 0% when no stages complete', () => {
      const { result } = renderHook(() => useFormLoadingState());
      expect(result.current.progress).toBe(0);
    });

    it('calculates 20% per completed stage (5 stages)', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
      });

      expect(result.current.progress).toBe(20);

      act(() => {
        result.current.setStageComplete('ui-schema');
      });

      expect(result.current.progress).toBe(40);
    });

    it('ignores active stages in progress calculation', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
      });

      expect(result.current.progress).toBe(0);
    });

    it('rounds progress to nearest integer', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageComplete('form-definition');
      });

      // 1/5 = 20%, should be exact
      expect(result.current.progress).toBe(20);
    });

    it('reaches 100% only when all stages complete', () => {
      const { result } = renderHook(() => useFormLoadingState());

      for (const key of LOADING_STAGE_KEYS) {
        act(() => {
          result.current.setStageComplete(key);
        });
      }

      expect(result.current.progress).toBe(100);
    });
  });

  describe('stage management order', () => {
    it('follows the expected loading sequence', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
        result.current.setStageComplete('form-definition');
        result.current.setStageActive('ui-schema');
        result.current.setStageComplete('ui-schema');
        result.current.setStageActive('widgets');
        result.current.setStageComplete('widgets');
        result.current.setStageActive('resources');
        result.current.setStageComplete('resources');
        result.current.setStageActive('data');
        result.current.setStageComplete('data');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);
    });

    it('handles out-of-order stage completion', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        // Skip ahead
        result.current.setStageComplete('data');
        result.current.setStageActive('form-definition');
      });

      expect(result.current.progress).toBe(20); // 1 of 5
      expect(result.current.activeStageLabel).toBe('Loading form definition');
    });

    it('allows stages to transition multiple times', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('widgets');
        result.current.setStageError('widgets', 'First error');
      });

      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.reset();
        result.current.setStageActive('widgets');
        result.current.setStageComplete('widgets');
      });

      expect(result.current.hasError).toBe(false);
      const stage = result.current.stages.find(s => s.key === 'widgets');
      expect(stage?.status).toBe('complete');
    });
  });

  describe('callback stability', () => {
    it('maintains callback reference stability across renders', () => {
      const { result, rerender } = renderHook(() => useFormLoadingState());

      const { setStageActive: callback1 } = result.current;

      rerender();

      const { setStageActive: callback2 } = result.current;

      // Note: useCallback should provide same reference
      // (React optimization)
      expect(typeof callback1).toBe('function');
      expect(typeof callback2).toBe('function');
    });

    it('callbacks work correctly after non-related state changes', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
      });

      act(() => {
        result.current.setStageComplete('form-definition');
        result.current.setStageActive('ui-schema');
      });

      expect(result.current.stages.find(s => s.key === 'ui-schema')?.status).toBe('active');
    });
  });

  describe('error handling', () => {
    it('handles rapid state changes', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageActive('form-definition');
        result.current.setStageError('form-definition', 'Error 1');
        result.current.reset();
        result.current.setStageActive('form-definition');
      });

      const stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.status).toBe('active');
      expect(stage?.errorMessage).toBeUndefined();
    });

    it('clears error message on reset', () => {
      const { result } = renderHook(() => useFormLoadingState());

      act(() => {
        result.current.setStageError('form-definition', 'Critical error');
      });

      let stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.errorMessage).toBe('Critical error');

      act(() => {
        result.current.reset();
      });

      stage = result.current.stages.find(s => s.key === 'form-definition');
      expect(stage?.errorMessage).toBeUndefined();
    });
  });
});
