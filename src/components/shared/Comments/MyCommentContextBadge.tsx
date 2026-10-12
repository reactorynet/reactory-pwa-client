import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { resolveCommentResource, CommentResourceType } from './commentResourceLinks';

/**
 * Column badge that renders a comment's `context` as a friendly, colour-coded
 * chip. Used by the "My Comments" grid so a row communicates *where* the
 * comment lives before the user expands it.
 *
 * Registered as `core.MyCommentContextBadge@1.0.0`.
 */
export interface MyCommentContextBadgeProps {
  /** Comment context category (e.g. `ReactorChat`). */
  context?: string;
  /** Convenience alias — some renderers pass the cell value as `value`. */
  value?: string;
  /** Raw cell value (the grid passes the column's field value as formData). */
  formData?: string;
  size?: 'small' | 'medium';
}

const COLOR_BY_TYPE: Record<CommentResourceType, 'default' | 'primary' | 'secondary' | 'info' | 'warning' | 'success'> = {
  content: 'primary',
  'knowledge-base': 'secondary',
  chat: 'info',
  'support-ticket': 'warning',
  unknown: 'default',
};

export const MyCommentContextBadge: React.FC<MyCommentContextBadgeProps> = (props) => {
  const rawContext = props.context || props.value || props.formData || '';
  const resource = resolveCommentResource({ context: rawContext });
  const color = COLOR_BY_TYPE[resource.type] || 'default';

  return (
    <Tooltip title={rawContext || 'Unknown context'}>
      <Chip
        size={props.size || 'small'}
        color={color}
        variant="outlined"
        label={resource.label}
        data-testid="my-comment-context-badge"
      />
    </Tooltip>
  );
};

export default MyCommentContextBadge;
