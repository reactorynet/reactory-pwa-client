import React from 'react';
import { render } from '@testing-library/react';
import D3Chart from '../D3Chart';

/**
 * Grouped-series and data-shape robustness for `D3Chart`.
 *
 * Both cases below failed in a live side panel and both were *silent*: the panel
 * item rendered as an empty tab, and the only trace was a console.error the user
 * never sees.
 *
 *  1. `seriesKeys` arriving as a string. Providers do not all emit real JSON
 *     arrays — Gemini serialises freeform values as strings, which is why the
 *     macro already JSON-parses `data`. `seriesKeys` was passed through raw and
 *     reached `seriesKeys.join(',')` in the effect dependency array, throwing
 *     `seriesKeys.join is not a function` during render.
 *
 *  2. `data` arriving as a single object instead of an array. The tool schema
 *     advertises `data` as `type: "object"`, so a model can reasonably send one
 *     object; the cartesian renderers call `data.map(...)` and threw inside the
 *     renderer's try/catch, leaving the chart blank.
 *
 * jsdom has no ResizeObserver; the component observes its container to size itself.
 * Stubbed here so the test exercises rendering rather than the browser API.
 */
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const rows = [
  { month: 'Jan', revenue: 4200, expenses: 3100 },
  { month: 'Feb', revenue: 5100, expenses: 3400 },
  { month: 'Mar', revenue: 4700, expenses: 2900 },
];

const barRects = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('rect')).filter((r) =>
    (r.getAttribute('class') || '').startsWith('bar'),
  );

describe('D3Chart — grouped series', () => {
  it('draws one rect per category per series, with a distinct colour per series', () => {
    const { container } = render(
      <D3Chart
        type="bar"
        data={rows as any}
        xKey="month"
        yKey="revenue"
        seriesKeys={['revenue', 'expenses']}
        showLegend
      />,
    );

    const bars = barRects(container);
    expect(bars).toHaveLength(rows.length * 2);

    // One class per series, and the two series must not share a colour.
    expect(new Set(bars.map((b) => b.getAttribute('class')))).toEqual(
      new Set(['bar-s0', 'bar-s1']),
    );
    const fills = bars.map((b) => b.getAttribute('fill'));
    expect(new Set(fills).size).toBe(2);
  });

  it('renders a grouped chart when seriesKeys arrives as a JSON string', () => {
    // The regression: this used to throw `seriesKeys.join is not a function`
    // and render nothing at all.
    const { container } = render(
      <D3Chart
        type="bar"
        data={rows as any}
        xKey="month"
        yKey="revenue"
        seriesKeys={'["revenue","expenses"]' as any}
        showLegend
      />,
    );

    const bars = barRects(container);
    expect(bars).toHaveLength(rows.length * 2);
    expect(new Set(bars.map((b) => b.getAttribute('fill'))).size).toBe(2);
  });

  it('treats a bare string seriesKeys as a single series', () => {
    const { container } = render(
      <D3Chart
        type="bar"
        data={rows as any}
        xKey="month"
        yKey="revenue"
        seriesKeys={'revenue' as any}
      />,
    );

    expect(barRects(container)).toHaveLength(rows.length);
  });

  it('computes real bar heights when animation is disabled', () => {
    // Guards the geometry itself: an all-zero height array would mean the scale
    // collapsed, which is the other way "nothing renders" can happen.
    const { container } = render(
      <D3Chart
        type="bar"
        data={rows as any}
        xKey="month"
        yKey="revenue"
        seriesKeys={['revenue', 'expenses']}
        styling={{ animate: false }}
      />,
    );

    const heights = barRects(container).map((b) => Number(b.getAttribute('height')));
    expect(heights).toHaveLength(rows.length * 2);
    expect(heights.every((h) => h > 0)).toBe(true);
  });

  it('renders legend labels from normalised seriesKeys', () => {
    const { container } = render(
      <D3Chart
        type="bar"
        data={rows as any}
        xKey="month"
        yKey="revenue"
        seriesKeys={'["revenue","expenses"]' as any}
        showLegend
      />,
    );

    const text = container.textContent || '';
    expect(text).toContain('revenue');
    expect(text).toContain('expenses');
  });
});
