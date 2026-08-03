/**
 * positionAnimator — tween layer over the PositionStore.
 *
 * The canvas render loop calls step() every frame; active tweens write
 * interpolated positions into the store (bumping its version, which triggers
 * geometry re-sync). Used to grow expanded children out of their parent,
 * pull collapsed subtrees back in, and settle layout refinements smoothly.
 */

import { Point, PositionStore } from '../types';
import { ANIMATION_DURATION_MS } from '../constants';

interface Tween {
  from: Point;
  to: Point;
  start: number;
  duration: number;
  onComplete?: () => void;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export interface PositionAnimator {
  /** Tween one node; replaces any running tween for the same id. */
  animate(id: number, from: Point, to: Point, opts?: { duration?: number; onComplete?: () => void }): void;
  /** Tween a batch with a single completion callback (fires once, at the end). */
  animateMany(
    entries: Array<{ id: number; from: Point; to: Point }>,
    opts?: { duration?: number; onComplete?: () => void }
  ): void;
  /**
   * Advance all tweens to `now`, writing into the store. Returns true while
   * any tween is still running.
   */
  step(positions: PositionStore, now?: number): boolean;
  cancel(id: number): void;
  clear(): void;
  readonly active: boolean;
}

export const createPositionAnimator = (): PositionAnimator => {
  const tweens = new Map<number, Tween>();

  return {
    animate(id, from, to, opts = {}) {
      tweens.set(id, {
        from: { ...from },
        to: { ...to },
        start: performance.now(),
        duration: opts.duration ?? ANIMATION_DURATION_MS,
        onComplete: opts.onComplete,
      });
    },

    animateMany(entries, opts = {}) {
      if (entries.length === 0) {
        opts.onComplete?.();
        return;
      }
      const start = performance.now();
      const duration = opts.duration ?? ANIMATION_DURATION_MS;
      entries.forEach((entry, i) => {
        tweens.set(entry.id, {
          from: { ...entry.from },
          to: { ...entry.to },
          start,
          duration,
          // Single completion signal on the last entry of the batch.
          onComplete: i === entries.length - 1 ? opts.onComplete : undefined,
        });
      });
    },

    step(positions, now = performance.now()): boolean {
      if (tweens.size === 0) return false;
      const updates: Array<[number, Point]> = [];
      const completed: Tween[] = [];
      for (const [id, tween] of tweens) {
        const t = Math.min(1, (now - tween.start) / tween.duration);
        const eased = easeOutCubic(t);
        updates.push([
          id,
          {
            x: tween.from.x + (tween.to.x - tween.from.x) * eased,
            y: tween.from.y + (tween.to.y - tween.from.y) * eased,
          },
        ]);
        if (t >= 1) {
          tweens.delete(id);
          completed.push(tween);
        }
      }
      positions.setMany(updates);
      for (const tween of completed) tween.onComplete?.();
      return tweens.size > 0;
    },

    cancel(id) {
      tweens.delete(id);
    },

    clear() {
      tweens.clear();
    },

    get active() {
      return tweens.size > 0;
    },
  };
};
