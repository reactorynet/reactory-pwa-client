import React, { useEffect, useState } from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { GraphNode } from '../../types';

export interface BreadcrumbBarProps {
  node: GraphNode | null;
  resolveNodes(ids: number[]): Promise<GraphNode[]>;
  onCrumbClick(node: GraphNode): void;
}

/** Splits the focused node's ancestry key and renders clickable crumbs. */
export default function BreadcrumbBar(props: BreadcrumbBarProps) {
  const { node, resolveNodes, onCrumbClick } = props;
  const [crumbs, setCrumbs] = useState<GraphNode[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!node) {
      setCrumbs([]);
      return undefined;
    }
    const ids = node.key
      .split('|')
      .map(Number)
      .filter((id) => Number.isFinite(id) && id !== node.id);
    if (ids.length === 0) {
      setCrumbs([]);
      return undefined;
    }
    resolveNodes(ids)
      .then((resolved) => {
        if (!cancelled) setCrumbs(resolved);
      })
      .catch(() => {
        if (!cancelled) setCrumbs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [node, resolveNodes]);

  if (!node) return null;

  return (
    <Box sx={{ px: 1.5, py: 0.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Breadcrumbs maxItems={6} separator="›">
        {crumbs.map((crumb) => (
          <Link
            key={crumb.id}
            component="button"
            variant="caption"
            underline="hover"
            onClick={() => onCrumbClick(crumb)}
          >
            {crumb.name}
          </Link>
        ))}
        <Typography variant="caption" color="text.primary">
          {node.name}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}
