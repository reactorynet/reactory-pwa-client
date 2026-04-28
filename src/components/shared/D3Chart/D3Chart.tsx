import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as d3 from 'd3';
import type {
  D3ChartProps,
  D3ChartContext,
  D3ColorScheme,
  D3DataPoint,
  D3ForceGraphData,
  D3ForceNode,
  D3HierarchyNode,
  D3Margin,
  D3StylingOptions,
} from './D3Types';

// ─── Colour resolution ────────────────────────────────────────────────────────

const SCHEME_MAP: Record<D3ColorScheme, readonly string[]> = {
  tableau10:  d3.schemeTableau10,
  pastel1:    d3.schemePastel1,
  pastel2:    d3.schemePastel2,
  set1:       d3.schemeSet1,
  set2:       d3.schemeSet2,
  set3:       d3.schemeSet3,
  accent:     d3.schemeAccent,
  dark2:      d3.schemeDark2,
  paired:     d3.schemePaired,
  category10: d3.schemeCategory10,
};

function resolveColors(scheme?: D3ColorScheme | string[]): string[] {
  if (!scheme) return [...d3.schemeTableau10];
  if (Array.isArray(scheme)) return scheme;
  return [...(SCHEME_MAP[scheme] ?? d3.schemeTableau10)];
}

const DEFAULT_MARGIN: Required<D3Margin> = { top: 20, right: 20, bottom: 40, left: 50 };

function resolveMargin(m?: D3Margin): Required<D3Margin> {
  return { ...DEFAULT_MARGIN, ...m };
}

// ─── Shared style extraction ──────────────────────────────────────────────────

interface ResolvedStyle {
  animate: boolean;
  duration: number;
  fillOpacity: number;
  gridColor: string;
  gridDash: string;
  axisColor: string;
  axisFontSize: number;
  barRadius: number;
  nodeRadius: number;
  strokeWidth: number;
}

function extractStyle(s?: D3StylingOptions): ResolvedStyle {
  return {
    animate:      s?.animate !== false,
    duration:     s?.animationDuration ?? 400,
    fillOpacity:  s?.fillOpacity ?? 1,
    gridColor:    s?.gridColor ?? '#e0e0e0',
    gridDash:     s?.gridDasharray ?? '3 3',
    axisColor:    s?.axisColor ?? '#555',
    axisFontSize: s?.axisFontSize ?? 11,
    barRadius:    s?.barRadius ?? 2,
    nodeRadius:   s?.nodeRadius ?? 5,
    strokeWidth:  s?.strokeWidth ?? 2,
  };
}

// ─── Axis styling helper ──────────────────────────────────────────────────────

function styleAxis(
  selection: d3.Selection<SVGGElement, unknown, null, undefined>,
  st: ResolvedStyle,
): void {
  selection.select('.domain').attr('stroke', st.axisColor);
  selection
    .selectAll<SVGTextElement, unknown>('text')
    .style('font-size', `${st.axisFontSize}px`)
    .attr('fill', st.axisColor);
}

// ─── Grid helper ─────────────────────────────────────────────────────────────

function appendGrid(
  sel: d3.Selection<SVGGElement, unknown, null, undefined>,
  axisGen: d3.Axis<any>,
  st: ResolvedStyle,
  transform?: string,
): void {
  const group = sel.append('g').attr('class', 'd3-grid');
  if (transform) group.attr('transform', transform);
  group
    .call(axisGen)
    .call(g => {
      g.select('.domain').remove();
      g.selectAll<SVGLineElement, unknown>('line')
        .attr('stroke', st.gridColor)
        .attr('stroke-dasharray', st.gridDash);
      g.selectAll<SVGTextElement, unknown>('text').remove();
    });
}

// ─── Bar renderer ─────────────────────────────────────────────────────────────

function renderBar(
  ctx: D3ChartContext,
  xKey: string,
  yKey: string,
  seriesKeys: string[],
  showAxes: boolean,
  showGrid: boolean,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3DataPoint) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const data = ctx.data as D3DataPoint[];
  const st = extractStyle(styling);
  const sel = d3.select(g);
  const keys = seriesKeys.length > 0 ? seriesKeys : [yKey];

  const maxVal = d3.max(data, d => d3.max(keys, k => Number(d[k] ?? 0))) ?? 0;

  const xScale = d3.scaleBand<string>()
    .domain(data.map(d => String(d[xKey] ?? '')))
    .range([0, innerWidth])
    .padding(0.15);

  const xSubScale = d3.scaleBand<string>()
    .domain(keys)
    .range([0, xScale.bandwidth()])
    .padding(0.05);

  const yScale = d3.scaleLinear()
    .domain([0, maxVal * 1.1])
    .nice()
    .range([innerHeight, 0]);

  if (showGrid) {
    appendGrid(sel, d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth), st);
  }

  keys.forEach((key, si) => {
    const color = colors[si % colors.length];

    const bars = sel.selectAll<SVGRectElement, D3DataPoint>(`.bar-s${si}`)
      .data(data)
      .join('rect')
      .attr('class', `bar-s${si}`)
      .attr('x', d => (xScale(String(d[xKey] ?? '')) ?? 0) + (xSubScale(key) ?? 0))
      .attr('width', xSubScale.bandwidth())
      .attr('fill', color)
      .attr('opacity', st.fillOpacity)
      .attr('rx', st.barRadius)
      .attr('ry', st.barRadius)
      .on('mousemove', (event: MouseEvent, d) => {
        const html = tooltipFormatter
          ? tooltipFormatter(d)
          : `<strong>${d[xKey]}</strong><br/>${key}: ${d[key]}`;
        const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
        showTooltip(px + 10, py - 20, html);
      })
      .on('mouseleave', () => hideTooltip());

    if (st.animate) {
      bars
        .attr('y', innerHeight)
        .attr('height', 0)
        .transition().duration(st.duration)
        .attr('y', d => yScale(Number(d[key] ?? 0)))
        .attr('height', d => Math.max(0, innerHeight - yScale(Number(d[key] ?? 0))));
    } else {
      bars
        .attr('y', d => yScale(Number(d[key] ?? 0)))
        .attr('height', d => Math.max(0, innerHeight - yScale(Number(d[key] ?? 0))));
    }
  });

  if (showAxes) {
    sel.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .call(g => styleAxis(g, st));

    sel.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => styleAxis(g, st));
  }
}

// ─── Line renderer ────────────────────────────────────────────────────────────

function renderLine(
  ctx: D3ChartContext,
  xKey: string,
  yKey: string,
  seriesKeys: string[],
  showAxes: boolean,
  showGrid: boolean,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3DataPoint) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const data = ctx.data as D3DataPoint[];
  const st = extractStyle(styling);
  const sel = d3.select(g);
  const keys = seriesKeys.length > 0 ? seriesKeys : [yKey];

  const xIsString = typeof data[0]?.[xKey] === 'string';

  // Point scale for categorical x; linear for numeric x
  const xScalePoint = xIsString
    ? d3.scalePoint<string>()
        .domain(data.map(d => String(d[xKey] ?? '')))
        .range([0, innerWidth])
        .padding(0.5)
    : null;

  const xScaleLinear = !xIsString
    ? d3.scaleLinear()
        .domain(d3.extent(data, d => Number(d[xKey] ?? 0)) as [number, number])
        .nice()
        .range([0, innerWidth])
    : null;

  const xAt = (d: D3DataPoint): number =>
    xIsString
      ? (xScalePoint!(String(d[xKey] ?? '')) ?? 0)
      : xScaleLinear!(Number(d[xKey] ?? 0));

  const maxVal = d3.max(data, d => d3.max(keys, k => Number(d[k] ?? 0))) ?? 0;
  const minVal = d3.min(data, d => d3.min(keys, k => Number(d[k] ?? 0))) ?? 0;
  const yScale = d3.scaleLinear()
    .domain([Math.min(0, minVal), maxVal * 1.1])
    .nice()
    .range([innerHeight, 0]);

  if (showGrid) {
    appendGrid(sel, d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth), st);
  }

  keys.forEach((key, si) => {
    const color = colors[si % colors.length];

    const lineGen = d3.line<D3DataPoint>()
      .x(xAt)
      .y(d => yScale(Number(d[key] ?? 0)))
      .curve(d3.curveMonotoneX);

    const path = sel.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', st.strokeWidth);

    if (st.animate) {
      path.attr('d', lineGen);
      const totalLength = (path.node() as SVGPathElement | null)?.getTotalLength() ?? 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition().duration(st.duration)
        .attr('stroke-dashoffset', 0);
    } else {
      path.attr('d', lineGen);
    }

    sel.selectAll<SVGCircleElement, D3DataPoint>(`.ldot-s${si}`)
      .data(data)
      .join('circle')
      .attr('class', `ldot-s${si}`)
      .attr('cx', xAt)
      .attr('cy', d => yScale(Number(d[key] ?? 0)))
      .attr('r', 4)
      .attr('fill', color)
      .attr('opacity', 0.85)
      .on('mousemove', (event: MouseEvent, d) => {
        const html = tooltipFormatter
          ? tooltipFormatter(d)
          : `<strong>${d[xKey]}</strong><br/>${key}: ${d[key]}`;
        const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
        showTooltip(px + 10, py - 20, html);
      })
      .on('mouseleave', () => hideTooltip());
  });

  if (showAxes) {
    const xAxisGen = xIsString
      ? d3.axisBottom(xScalePoint!)
      : d3.axisBottom(xScaleLinear!);

    sel.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxisGen as d3.Axis<any>)
      .call(g => styleAxis(g, st));

    sel.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => styleAxis(g, st));
  }
}

// ─── Area renderer ────────────────────────────────────────────────────────────

function renderArea(
  ctx: D3ChartContext,
  xKey: string,
  yKey: string,
  seriesKeys: string[],
  showAxes: boolean,
  showGrid: boolean,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3DataPoint) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const data = ctx.data as D3DataPoint[];
  const st = extractStyle(styling);
  const sel = d3.select(g);
  const keys = seriesKeys.length > 0 ? seriesKeys : [yKey];

  const xIsString = typeof data[0]?.[xKey] === 'string';

  const xScalePoint = xIsString
    ? d3.scalePoint<string>()
        .domain(data.map(d => String(d[xKey] ?? '')))
        .range([0, innerWidth])
        .padding(0.5)
    : null;

  const xScaleLinear = !xIsString
    ? d3.scaleLinear()
        .domain(d3.extent(data, d => Number(d[xKey] ?? 0)) as [number, number])
        .nice()
        .range([0, innerWidth])
    : null;

  const xAt = (d: D3DataPoint): number =>
    xIsString
      ? (xScalePoint!(String(d[xKey] ?? '')) ?? 0)
      : xScaleLinear!(Number(d[xKey] ?? 0));

  const maxVal = d3.max(data, d => d3.max(keys, k => Number(d[k] ?? 0))) ?? 0;
  const yScale = d3.scaleLinear()
    .domain([0, maxVal * 1.1])
    .nice()
    .range([innerHeight, 0]);

  if (showGrid) {
    appendGrid(sel, d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth), st);
  }

  keys.forEach((key, si) => {
    const color = colors[si % colors.length];

    const areaGen = d3.area<D3DataPoint>()
      .x(xAt)
      .y0(innerHeight)
      .y1(d => yScale(Number(d[key] ?? 0)))
      .curve(d3.curveMonotoneX);

    const lineGen = d3.line<D3DataPoint>()
      .x(xAt)
      .y(d => yScale(Number(d[key] ?? 0)))
      .curve(d3.curveMonotoneX);

    sel.append('path')
      .datum(data)
      .attr('fill', color)
      .attr('fill-opacity', st.fillOpacity * 0.25)
      .attr('d', areaGen);

    sel.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', st.strokeWidth)
      .attr('d', lineGen);

    sel.selectAll<SVGCircleElement, D3DataPoint>(`.adot-s${si}`)
      .data(data)
      .join('circle')
      .attr('class', `adot-s${si}`)
      .attr('cx', xAt)
      .attr('cy', d => yScale(Number(d[key] ?? 0)))
      .attr('r', 3)
      .attr('fill', color)
      .attr('opacity', 0.85)
      .on('mousemove', (event: MouseEvent, d) => {
        const html = tooltipFormatter
          ? tooltipFormatter(d)
          : `<strong>${d[xKey]}</strong><br/>${key}: ${d[key]}`;
        const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
        showTooltip(px + 10, py - 20, html);
      })
      .on('mouseleave', () => hideTooltip());
  });

  if (showAxes) {
    const xAxisGen = xIsString
      ? d3.axisBottom(xScalePoint!)
      : d3.axisBottom(xScaleLinear!);

    sel.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxisGen as d3.Axis<any>)
      .call(g => styleAxis(g, st));

    sel.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => styleAxis(g, st));
  }
}

// ─── Pie / Donut renderer ─────────────────────────────────────────────────────

function renderPie(
  ctx: D3ChartContext,
  isDonut: boolean,
  xKey: string,
  yKey: string,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3DataPoint) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const data = ctx.data as D3DataPoint[];
  const st = extractStyle(styling);
  const sel = d3.select(g);

  const radius = Math.min(innerWidth, innerHeight) / 2;
  const innerRadius = isDonut ? radius * 0.5 : 0;

  const pieG = sel.append('g')
    .attr('transform', `translate(${innerWidth / 2},${innerHeight / 2})`);

  const pie = d3.pie<D3DataPoint>()
    .value(d => Number(d[yKey] ?? 0))
    .sort(null);

  const arc = d3.arc<d3.PieArcDatum<D3DataPoint>>()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  const arcHover = d3.arc<d3.PieArcDatum<D3DataPoint>>()
    .innerRadius(innerRadius)
    .outerRadius(radius + 6);

  const arcs = pie(data);

  const paths = pieG.selectAll<SVGPathElement, d3.PieArcDatum<D3DataPoint>>('.arc')
    .data(arcs)
    .join('path')
    .attr('class', 'arc')
    .attr('fill', (_, i) => colors[i % colors.length])
    .attr('opacity', st.fillOpacity)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .on('mousemove', (event: MouseEvent, d) => {
      const html = tooltipFormatter
        ? tooltipFormatter(d.data)
        : `<strong>${d.data[xKey]}</strong><br/>${yKey}: ${d.data[yKey]}`;
      const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
      showTooltip(px + 10, py - 20, html);
    })
    .on('mouseleave', () => hideTooltip())
    .on('mouseenter', function(_, d) {
      d3.select(this).attr('d', arcHover(d) ?? null);
    })
    .on('mouseleave.expand', function(_, d) {
      d3.select(this).attr('d', arc(d) ?? null);
    });

  if (st.animate) {
    paths
      .attr('d', d => {
        const zero = { startAngle: d.startAngle, endAngle: d.startAngle } as d3.PieArcDatum<D3DataPoint>;
        return arc(zero);
      })
      .transition().duration(st.duration)
      .attrTween('d', d => {
        const interp = d3.interpolate(
          { startAngle: d.startAngle, endAngle: d.startAngle },
          d,
        );
        return (t: number) => arc(interp(t) as d3.PieArcDatum<D3DataPoint>) ?? '';
      });
  } else {
    paths.attr('d', arc);
  }

  // Percentage labels on large-enough slices
  const labelArc = d3.arc<d3.PieArcDatum<D3DataPoint>>()
    .innerRadius(radius * 0.7)
    .outerRadius(radius * 0.7);

  pieG.selectAll<SVGTextElement, d3.PieArcDatum<D3DataPoint>>('.pie-label')
    .data(arcs)
    .join('text')
    .attr('class', 'pie-label')
    .attr('transform', d => `translate(${labelArc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', `${st.axisFontSize}px`)
    .style('fill', '#fff')
    .style('pointer-events', 'none')
    .text(d => {
      const pct = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
      return Number(pct) > 5 ? `${pct}%` : '';
    });
}

// ─── Scatter renderer ─────────────────────────────────────────────────────────

function renderScatter(
  ctx: D3ChartContext,
  xKey: string,
  yKey: string,
  y2Key: string | undefined,
  showAxes: boolean,
  showGrid: boolean,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3DataPoint) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const data = ctx.data as D3DataPoint[];
  const st = extractStyle(styling);
  const sel = d3.select(g);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => Number(d[xKey] ?? 0)) as [number, number])
    .nice()
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(data, d => Number(d[yKey] ?? 0)) as [number, number])
    .nice()
    .range([innerHeight, 0]);

  if (showGrid) {
    appendGrid(sel, d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth), st);
    appendGrid(
      sel,
      d3.axisBottom(xScale).ticks(5).tickSize(-innerHeight),
      st,
      `translate(0,${innerHeight})`,
    );
  }

  const groups = y2Key
    ? Array.from(new Set(data.map(d => String(d[y2Key] ?? ''))))
    : ['__default__'];
  const colorScale = d3.scaleOrdinal<string>().domain(groups).range(colors);

  sel.selectAll<SVGCircleElement, D3DataPoint>('.sdot')
    .data(data)
    .join('circle')
    .attr('class', 'sdot')
    .attr('cx', d => xScale(Number(d[xKey] ?? 0)))
    .attr('cy', d => yScale(Number(d[yKey] ?? 0)))
    .attr('r', st.nodeRadius)
    .attr('fill', d => colorScale(y2Key ? String(d[y2Key] ?? '') : '__default__'))
    .attr('opacity', st.fillOpacity * 0.8)
    .on('mousemove', (event: MouseEvent, d) => {
      const html = tooltipFormatter
        ? tooltipFormatter(d)
        : [
            `${xKey}: <strong>${d[xKey]}</strong>`,
            `${yKey}: <strong>${d[yKey]}</strong>`,
            ...(y2Key ? [`${y2Key}: <strong>${d[y2Key]}</strong>`] : []),
          ].join('<br/>');
      const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
      showTooltip(px + 10, py - 20, html);
    })
    .on('mouseleave', () => hideTooltip());

  if (showAxes) {
    sel.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .call(g => styleAxis(g, st));

    sel.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => styleAxis(g, st));
  }
}

// ─── Histogram renderer ───────────────────────────────────────────────────────

function renderHistogram(
  ctx: D3ChartContext,
  xKey: string,
  showAxes: boolean,
  showGrid: boolean,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3DataPoint) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const data = ctx.data as D3DataPoint[];
  const st = extractStyle(styling);
  const sel = d3.select(g);

  const values = data.map(d => Number(d[xKey] ?? 0));

  const xScale = d3.scaleLinear()
    .domain(d3.extent(values) as [number, number])
    .nice()
    .range([0, innerWidth]);

  const binner = d3.bin()
    .domain(xScale.domain() as [number, number])
    .thresholds(xScale.ticks(20));

  const bins = binner(values as number[]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(bins, b => b.length) ?? 0])
    .nice()
    .range([innerHeight, 0]);

  if (showGrid) {
    appendGrid(sel, d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth), st);
  }

  sel.selectAll<SVGRectElement, d3.Bin<number, number>>('.hist-bar')
    .data(bins)
    .join('rect')
    .attr('class', 'hist-bar')
    .attr('x', d => xScale(d.x0 ?? 0) + 1)
    .attr('width', d => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1))
    .attr('fill', colors[0])
    .attr('opacity', st.fillOpacity)
    .attr('rx', st.barRadius)
    .attr('y', d => yScale(d.length))
    .attr('height', d => Math.max(0, innerHeight - yScale(d.length)))
    .on('mousemove', (event: MouseEvent, d) => {
      const html = `Range: <strong>${d.x0?.toFixed(2)} – ${d.x1?.toFixed(2)}</strong><br/>Count: <strong>${d.length}</strong>`;
      const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
      showTooltip(px + 10, py - 20, html);
    })
    .on('mouseleave', () => hideTooltip());

  if (showAxes) {
    sel.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .call(g => styleAxis(g, st));

    sel.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => styleAxis(g, st));
  }
}

// ─── Tree renderer ────────────────────────────────────────────────────────────

function renderTree(
  ctx: D3ChartContext,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3HierarchyNode) => string,
): void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const rootData = ctx.data as D3HierarchyNode;
  const st = extractStyle(styling);
  const sel = d3.select(g);

  const root = d3.hierarchy(rootData);
  const treeLayout = d3.tree<D3HierarchyNode>().size([innerWidth, innerHeight - 40]);
  treeLayout(root as d3.HierarchyNode<D3HierarchyNode>);

  // Links
  sel.selectAll<SVGPathElement, d3.HierarchyLink<D3HierarchyNode>>('.t-link')
    .data(root.links())
    .join('path')
    .attr('class', 't-link')
    .attr('fill', 'none')
    .attr('stroke', st.gridColor)
    .attr('stroke-width', 1.5)
    .attr('d', d3.linkVertical<any, any>().x((d: any) => d.x).y((d: any) => d.y));

  // Nodes
  const nodes = sel.selectAll<SVGGElement, d3.HierarchyNode<D3HierarchyNode>>('.t-node')
    .data(root.descendants())
    .join('g')
    .attr('class', 't-node')
    .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

  nodes.append('circle')
    .attr('r', st.nodeRadius)
    .attr('fill', (d: any) => colors[d.depth % colors.length])
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .on('mousemove', (event: MouseEvent, d) => {
      const html = tooltipFormatter
        ? tooltipFormatter(d.data)
        : [
            `<strong>${d.data.name}</strong>`,
            ...(d.data.value !== undefined ? [`Value: ${d.data.value}`] : []),
            `Depth: ${d.depth}`,
          ].join('<br/>');
      const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
      showTooltip(px + 10, py - 20, html);
    })
    .on('mouseleave', () => hideTooltip());

  nodes.append('text')
    .attr('dy', (d: any) => (d.children ? '-0.9em' : '0.35em'))
    .attr('x', (d: any) => (d.children ? 0 : st.nodeRadius + 4))
    .attr('text-anchor', (d: any) => (d.children ? 'middle' : 'start'))
    .style('font-size', `${st.axisFontSize}px`)
    .style('fill', st.axisColor)
    .style('pointer-events', 'none')
    .text((d: any) => d.data.name);
}

// ─── Force renderer ───────────────────────────────────────────────────────────

function renderForce(
  ctx: D3ChartContext,
  styling?: D3StylingOptions,
  tooltipFormatter?: (d: D3ForceNode) => string,
): () => void {
  const { g, innerWidth, innerHeight, colors, showTooltip, hideTooltip } = ctx;
  const graphData = ctx.data as D3ForceGraphData;
  const st = extractStyle(styling);
  const sel = d3.select(g);

  // Shallow-copy to avoid mutating the input props
  type SimNode = D3ForceNode & d3.SimulationNodeDatum;
  const simNodes: SimNode[] = graphData.nodes.map(n => ({ ...n }));
  const simLinks: d3.SimulationLinkDatum<SimNode>[] = graphData.links.map(l => ({
    source: String(l.source),
    target: String(l.target),
    value: l.value,
  }));

  const groups = Array.from(new Set(simNodes.map(n => String(n.group ?? ''))));
  const colorScale = d3.scaleOrdinal<string>().domain(groups).range(colors);

  const simulation = d3.forceSimulation(simNodes)
    .force('link', d3.forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
      .id(d => String(d.id))
      .distance(60))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
    .force('collision', d3.forceCollide(st.nodeRadius + 5));

  const link = sel.append('g')
    .selectAll<SVGLineElement, d3.SimulationLinkDatum<SimNode>>('line')
    .data(simLinks)
    .join('line')
    .attr('stroke', st.gridColor)
    .attr('stroke-width', d => Math.sqrt((d as any).value ?? 1));

  const node = sel.append('g')
    .selectAll<SVGCircleElement, SimNode>('circle')
    .data(simNodes)
    .join('circle')
    .attr('r', st.nodeRadius)
    .attr('fill', d => colorScale(String(d.group ?? '')))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .on('mousemove', (event: MouseEvent, d) => {
      const html = tooltipFormatter
        ? tooltipFormatter(d)
        : [
            `<strong>${d.label ?? d.id}</strong>`,
            ...(d.group !== undefined ? [`Group: ${d.group}`] : []),
          ].join('<br/>');
      const [px, py] = d3.pointer(event, ctx.svg.parentElement ?? ctx.svg);
      showTooltip(px + 10, py - 20, html);
    })
    .on('mouseleave', () => hideTooltip());

  const label = sel.append('g')
    .selectAll<SVGTextElement, SimNode>('text')
    .data(simNodes)
    .join('text')
    .text(d => String(d.label ?? d.id))
    .style('font-size', `${st.axisFontSize}px`)
    .style('fill', st.axisColor)
    .attr('dx', st.nodeRadius + 3)
    .attr('dy', '0.35em')
    .style('pointer-events', 'none');

  simulation.on('tick', () => {
    link
      .attr('x1', d => (d.source as any).x ?? 0)
      .attr('y1', d => (d.source as any).y ?? 0)
      .attr('x2', d => (d.target as any).x ?? 0)
      .attr('y2', d => (d.target as any).y ?? 0);

    node
      .attr('cx', d => d.x ?? 0)
      .attr('cy', d => d.y ?? 0);

    label
      .attr('x', d => d.x ?? 0)
      .attr('y', d => d.y ?? 0);
  });

  // Drag
  node.call(
    d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }),
  );

  // Return cleanup to stop simulation on unmount / re-render
  return () => simulation.stop();
}

// ─── D3Chart component ────────────────────────────────────────────────────────

/**
 * A comprehensive standalone D3.js chart component.
 *
 * Supports nine built-in chart types plus a `'custom'` escape hatch for
 * fully bespoke D3 visualisations.  All rendering is imperative D3 code
 * driven through a `useEffect` that re-runs when data or configuration
 * changes.  The component tracks its container width via `ResizeObserver`
 * so it renders responsively when `width='100%'` (the default).
 *
 * **Supported types:**
 * `'bar'`, `'line'`, `'area'`, `'pie'`, `'donut'`, `'scatter'`,
 * `'histogram'`, `'tree'`, `'force'`, `'custom'`
 *
 * **Registration:** `core.D3Chart@1.0.0`
 *
 * @example
 * ```tsx
 * // Grouped bar chart
 * <D3Chart
 *   type="bar"
 *   data={salesData}
 *   xKey="month"
 *   seriesKeys={['online', 'inStore']}
 *   showLegend
 *   title="Monthly Sales"
 * />
 *
 * // Force-directed graph
 * <D3Chart
 *   type="force"
 *   data={{ nodes: [...], links: [...] }}
 *   height={500}
 * />
 *
 * // Fully custom D3
 * <D3Chart
 *   type="custom"
 *   data={rawData}
 *   customRenderer={(ctx) => {
 *     const g = d3.select(ctx.g);
 *     // ... draw anything with D3
 *   }}
 * />
 * ```
 */
const D3Chart: React.FC<D3ChartProps> = ({
  type = 'bar',
  data,
  xKey = 'name',
  yKey = 'value',
  y2Key,
  seriesKeys = [],
  height = 300,
  width = '100%',
  colorScheme,
  title,
  description,
  showAxes = true,
  showGrid = true,
  showTooltip: showTooltipProp = true,
  showLegend = false,
  legendLabels,
  margin,
  styling,
  customRenderer,
  tooltipFormatter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  const theme = useTheme();

  // Merge theme palette defaults with any explicit user overrides
  const themedStyling: D3StylingOptions = useMemo(() => ({
    axisColor: theme.palette.text.secondary,
    gridColor: theme.palette.divider,
    ...styling,
  }), [theme.palette.text.secondary, theme.palette.divider, styling]);

  // Expand bottom margin when x-axis labels are long to prevent clipping
  const resolvedMargin = useMemo(() => {
    const base = resolveMargin(margin);
    if (Array.isArray(data)) {
      const maxLen = Math.max(
        0,
        ...(data as D3DataPoint[]).map(d => String(d[xKey] ?? '').length),
      );
      if (maxLen > 8) base.bottom = Math.max(base.bottom, 70);
    }
    return base;
  }, [margin, data, xKey]);

  const colors = resolveColors(colorScheme);

  const svgWidth = typeof width === 'number' ? width : containerWidth;
  const svgHeight = typeof height === 'number' ? height : 300;
  const innerWidth = Math.max(0, svgWidth - resolvedMargin.left - resolvedMargin.right);
  const innerHeight = Math.max(0, svgHeight - resolvedMargin.top - resolvedMargin.bottom);

  // ── Responsive width tracking ─────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Seed the width immediately
    setContainerWidth(el.clientWidth || 600);

    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── D3 rendering ──────────────────────────────────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || innerWidth <= 0 || innerHeight <= 0) return;

    const gEl = svgEl.querySelector<SVGGElement>('g.d3-chart-area');
    if (!gEl) return;

    // Tooltip helpers (created in effect to capture fresh refs without
    // needing them as effect dependencies)
    const showTip = (x: number, y: number, html: string): void => {
      const el = tooltipRef.current;
      if (!el || !showTooltipProp) return;
      el.innerHTML = html;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = '1';
    };
    const hideTip = (): void => {
      const el = tooltipRef.current;
      if (!el) return;
      el.style.opacity = '0';
    };

    const context: D3ChartContext = {
      svg: svgEl,
      g: gEl,
      data,
      width: svgWidth,
      height: svgHeight,
      margin: resolvedMargin,
      innerWidth,
      innerHeight,
      colors,
      showTooltip: showTip,
      hideTooltip: hideTip,
    };

    // Clear all previous D3 content
    d3.select(gEl).selectAll('*').remove();

    let cleanup: void | (() => void);

    try {
      if (type === 'custom' && customRenderer) {
        cleanup = customRenderer(context);
      } else {
        switch (type) {
          case 'bar':
            renderBar(context, xKey, yKey, seriesKeys, showAxes, showGrid, themedStyling, tooltipFormatter);
            break;
          case 'line':
            renderLine(context, xKey, yKey, seriesKeys, showAxes, showGrid, themedStyling, tooltipFormatter);
            break;
          case 'area':
            renderArea(context, xKey, yKey, seriesKeys, showAxes, showGrid, themedStyling, tooltipFormatter);
            break;
          case 'pie':
            renderPie(context, false, xKey, yKey, themedStyling, tooltipFormatter);
            break;
          case 'donut':
            renderPie(context, true, xKey, yKey, themedStyling, tooltipFormatter);
            break;
          case 'scatter':
            renderScatter(context, xKey, yKey, y2Key, showAxes, showGrid, themedStyling, tooltipFormatter);
            break;
          case 'histogram':
            renderHistogram(context, xKey, showAxes, showGrid, themedStyling, tooltipFormatter);
            break;
          case 'tree':
            renderTree(context, themedStyling);
            break;
          case 'force':
            cleanup = renderForce(context, themedStyling);
            break;
          default:
            break;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[D3Chart] render error:', err);
    }

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [
    type,
    data,
    svgWidth,
    svgHeight,
    innerWidth,
    innerHeight,
    xKey,
    yKey,
    y2Key,
    // Stringify arrays so the effect fires when content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    seriesKeys.join(','),
    showAxes,
    showGrid,
    showTooltipProp,
    colors.join(','),
    themedStyling,
    customRenderer,
    tooltipFormatter,
  ]);

  // ── Legend derivation ─────────────────────────────────────────────────────
  const legendItems = showLegend
    ? (legendLabels ?? (seriesKeys.length > 0 ? seriesKeys : [yKey]))
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      ref={containerRef}
      sx={{ position: 'relative', width, ...styling?.containerSx }}
    >
      {title && (
        <Typography variant={styling?.titleVariant ?? 'h6'} sx={{ mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography
          variant={styling?.descriptionVariant ?? 'subtitle2'}
          color="text.secondary"
          sx={{ mb: 1.5 }}
        >
          {description}
        </Typography>
      )}

      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        style={{
          background: styling?.svgBackground,
          borderRadius: styling?.svgBorderRadius,
          overflow: 'visible',
          display: 'block',
        }}
      >
        {/* All D3 content is appended inside this group */}
        <g
          className="d3-chart-area"
          transform={`translate(${resolvedMargin.left},${resolvedMargin.top})`}
        />
      </svg>

      {showLegend && legendItems.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
          {legendItems.map((label, i) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '2px',
                  bgcolor: colors[i % colors.length],
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption">{label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {showTooltipProp && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[2],
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            lineHeight: '1.5',
            opacity: 0,
            transition: 'opacity 0.15s',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        />
      )}
    </Box>
  );
};

export const D3ChartComponentDefinition: Reactory.IReactoryComponentDefinition<typeof D3Chart> = {
  nameSpace: 'core',
  name: 'D3Chart',
  version: '1.0.0',
  component: D3Chart,
  description:
    'A comprehensive D3.js chart component supporting bar, line, area, pie, donut, scatter, ' +
    'histogram, tree layout, and force-directed graph chart types. ' +
    'Accepts data through clearly named props, renders responsively via ResizeObserver, ' +
    'and exposes a customRenderer escape hatch for fully bespoke D3 visualisations. ' +
    'For use in dashboards, report views, and any non-form context.',
  tags: ['chart', 'visualization', 'd3', 'force', 'tree', 'graph', 'shared'],
};

export default D3Chart;
