/**
 * spatialHash — uniform-grid spatial index over circles (graph nodes).
 *
 * Shared by viewport culling (query the visible AABB per frame) and the
 * interaction manager (O(1) hover hit tests) so pan/zoom stays smooth at
 * thousands of nodes.
 */

import { Bounds, Point } from '../types';
import { SPATIAL_HASH_CELL_SIZE } from '../constants';

interface Entry {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export class SpatialHash {
  private readonly cellSize: number;
  private cells = new Map<string, Set<number>>();
  private entries = new Map<number, Entry>();

  constructor(cellSize: number = SPATIAL_HASH_CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  private cellRange(x: number, y: number, radius: number): [number, number, number, number] {
    return [
      Math.floor((x - radius) / this.cellSize),
      Math.floor((y - radius) / this.cellSize),
      Math.floor((x + radius) / this.cellSize),
      Math.floor((y + radius) / this.cellSize),
    ];
  }

  /** Insert or move an entry. */
  set(id: number, x: number, y: number, radius: number): void {
    this.remove(id);
    const entry: Entry = { id, x, y, radius };
    this.entries.set(id, entry);
    const [minX, minY, maxX, maxY] = this.cellRange(x, y, radius);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = this.cellKey(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = new Set();
          this.cells.set(key, cell);
        }
        cell.add(id);
      }
    }
  }

  remove(id: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    const [minX, minY, maxX, maxY] = this.cellRange(entry.x, entry.y, entry.radius);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const cell = this.cells.get(this.cellKey(cx, cy));
        cell?.delete(id);
        if (cell && cell.size === 0) this.cells.delete(this.cellKey(cx, cy));
      }
    }
    this.entries.delete(id);
  }

  clear(): void {
    this.cells.clear();
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  /** Ids whose circles intersect the world-space AABB. */
  queryBounds(bounds: Bounds): number[] {
    const results: number[] = [];
    const seen = new Set<number>();
    const minX = Math.floor(bounds.x / this.cellSize);
    const minY = Math.floor(bounds.y / this.cellSize);
    const maxX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const maxY = Math.floor((bounds.y + bounds.height) / this.cellSize);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const cell = this.cells.get(this.cellKey(cx, cy));
        if (!cell) continue;
        for (const id of cell) {
          if (seen.has(id)) continue;
          seen.add(id);
          const e = this.entries.get(id)!;
          if (
            e.x + e.radius >= bounds.x &&
            e.x - e.radius <= bounds.x + bounds.width &&
            e.y + e.radius >= bounds.y &&
            e.y - e.radius <= bounds.y + bounds.height
          ) {
            results.push(id);
          }
        }
      }
    }
    return results;
  }

  /**
   * The topmost entry whose circle contains the point (smallest radius wins
   * so small nodes stay clickable over large overlapping ones).
   */
  hitTest(point: Point, tolerance = 0): number | null {
    // Entries are registered in every cell their circle touches, so the
    // point's own cell is enough for the circle itself; the tolerance may
    // reach into neighbouring cells, so probe the covering range.
    const [minX, minY, maxX, maxY] = this.cellRange(point.x, point.y, tolerance);
    let best: Entry | null = null;
    const seen = new Set<number>();
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const cell = this.cells.get(this.cellKey(cx, cy));
        if (!cell) continue;
        for (const id of cell) {
          if (seen.has(id)) continue;
          seen.add(id);
          const e = this.entries.get(id)!;
          const dx = point.x - e.x;
          const dy = point.y - e.y;
          const r = e.radius + tolerance;
          if (dx * dx + dy * dy <= r * r) {
            if (!best || e.radius < best.radius) best = e;
          }
        }
      }
    }
    return best?.id ?? null;
  }

  /** Ids currently indexed (for eviction of removed nodes). */
  ids(): IterableIterator<number> {
    return this.entries.keys();
  }
}
