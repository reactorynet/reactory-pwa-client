import { renderHook, act } from '@testing-library/react-hooks';
import useSidePanel from '../hooks/useSidePanel';
import { SidePanelItem } from '../types';

const makeItem = (id: string): SidePanelItem => ({
  id,
  componentFqn: 'test.Component@1.0.0',
  title: `Item ${id}`,
  type: 'component',
  props: {},
  addedAt: new Date('2024-01-01'),
});

describe('useSidePanel', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useSidePanel());
    expect(result.current.panelState.items).toHaveLength(0);
    expect(result.current.panelState.isOpen).toBe(false);
    expect(result.current.panelState.activeItemId).toBeUndefined();
  });

  it('initialises from provided state', () => {
    const item = makeItem('a1');
    const { result } = renderHook(() =>
      useSidePanel({ items: [item], activeItemId: 'a1', isOpen: true })
    );
    expect(result.current.panelState.items).toHaveLength(1);
    expect(result.current.panelState.isOpen).toBe(true);
  });

  describe('addItem', () => {
    it('adds an item, sets it active and opens panel', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('x')); });
      expect(result.current.panelState.items).toHaveLength(1);
      expect(result.current.panelState.activeItemId).toBe('x');
      expect(result.current.panelState.isOpen).toBe(true);
    });

    it('ignores duplicate IDs', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('dup')); });
      act(() => { result.current.addItem(makeItem('dup')); });
      expect(result.current.panelState.items).toHaveLength(1);
    });

    it('does not exceed MAX_ITEMS (10)', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => {
        for (let i = 0; i < 12; i++) {
          result.current.addItem(makeItem(`item-${i}`));
        }
      });
      expect(result.current.panelState.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('updateItem', () => {
    it('updates an existing item title', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('u1')); });
      act(() => { result.current.updateItem('u1', { title: 'Updated Title' }); });
      expect(result.current.panelState.items[0].title).toBe('Updated Title');
    });

    it('is a no-op for an unknown ID', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('u1')); });
      act(() => { result.current.updateItem('unknown', { title: 'X' }); });
      expect(result.current.panelState.items[0].title).toBe('Item u1');
    });
  });

  describe('removeItem', () => {
    it('removes the item and activates the previous one', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('r1')); });
      act(() => { result.current.addItem(makeItem('r2')); });
      act(() => { result.current.removeItem('r2'); });
      expect(result.current.panelState.items).toHaveLength(1);
      expect(result.current.panelState.activeItemId).toBe('r1');
    });

    it('closes panel when last item is removed', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('last')); });
      act(() => { result.current.removeItem('last'); });
      expect(result.current.panelState.items).toHaveLength(0);
      expect(result.current.panelState.isOpen).toBe(false);
    });

    it('is a no-op for an unknown ID', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('keep')); });
      act(() => { result.current.removeItem('ghost'); });
      expect(result.current.panelState.items).toHaveLength(1);
    });
  });

  describe('setActiveItem', () => {
    it('changes activeItemId to existing item', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('a')); });
      act(() => { result.current.addItem(makeItem('b')); });
      act(() => { result.current.setActiveItem('a'); });
      expect(result.current.panelState.activeItemId).toBe('a');
    });

    it('is a no-op for unknown item', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('a')); });
      const before = result.current.panelState.activeItemId;
      act(() => { result.current.setActiveItem('nonexistent'); });
      expect(result.current.panelState.activeItemId).toBe(before);
    });
  });

  describe('togglePanel', () => {
    it('toggles isOpen', () => {
      const { result } = renderHook(() => useSidePanel());
      expect(result.current.panelState.isOpen).toBe(false);
      act(() => { result.current.togglePanel(); });
      expect(result.current.panelState.isOpen).toBe(true);
      act(() => { result.current.togglePanel(); });
      expect(result.current.panelState.isOpen).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('resets state to empty', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('c1')); });
      act(() => { result.current.addItem(makeItem('c2')); });
      act(() => { result.current.clearAll(); });
      expect(result.current.panelState.items).toHaveLength(0);
      expect(result.current.panelState.isOpen).toBe(false);
      expect(result.current.panelState.activeItemId).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('returns current state synchronously', () => {
      const { result } = renderHook(() => useSidePanel());
      act(() => { result.current.addItem(makeItem('g1')); });
      expect(result.current.getState().items).toHaveLength(1);
    });
  });

  describe('actions object', () => {
    it('exposes all action methods', () => {
      const { result } = renderHook(() => useSidePanel());
      const { actions } = result.current;
      expect(typeof actions.addItem).toBe('function');
      expect(typeof actions.updateItem).toBe('function');
      expect(typeof actions.removeItem).toBe('function');
      expect(typeof actions.getState).toBe('function');
      expect(typeof actions.setActiveItem).toBe('function');
      expect(typeof actions.togglePanel).toBe('function');
      expect(typeof actions.clearAll).toBe('function');
    });
  });

  describe('onPersist callback', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('calls onPersist after debounce when state mutates', () => {
      const onPersist = jest.fn();
      const { result } = renderHook(() => useSidePanel(undefined, onPersist));
      act(() => { result.current.addItem(makeItem('p1')); });
      act(() => { jest.runAllTimers(); });
      expect(onPersist).toHaveBeenCalledTimes(1);
      const arg = onPersist.mock.calls[0][0];
      expect(arg.items[0].id).toBe('p1');
    });

    it('strips reactory prop from serialized items', () => {
      const onPersist = jest.fn();
      const { result } = renderHook(() => useSidePanel(undefined, onPersist));
      act(() => {
        result.current.addItem({
          ...makeItem('s1'),
          props: { reactory: { sdk: true }, userId: '123' },
        });
      });
      act(() => { jest.runAllTimers(); });
      const serialized = onPersist.mock.calls[0][0];
      expect(serialized.items[0].props).not.toHaveProperty('reactory');
      expect(serialized.items[0].props).toHaveProperty('userId', '123');
    });
  });
});
