import React, { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryForm } from '@reactory/client-core/components/reactory/ReactoryForm';
import { createMyCommentsForm, MY_COMMENTS_FORM_ID } from './myCommentsForm';
import { CommentRouteLike } from './commentResourceLinks';

/**
 * "My Comments" — a lookup space where a signed-in user can review every
 * comment they have authored across the platform and jump back to the
 * originating resource.
 *
 * The surface is a thin shell around the `core.MyCommentsList` grid form, which
 * renders the shared `MaterialTableWidget`: a server-paged grid with an
 * expanding detail panel and a `View resource` back-link. This replaced the
 * original "one long list" render, which did not scale for users with many
 * comments (or long-form comment bodies).
 */
export interface MyCommentsProps {
  /** Reactory SDK instance (injected via withReactory). */
  reactory?: Reactory.Client.ReactorySDK;
  /** Heading shown above the list. */
  title?: string;
  /** Rows per page (default 10). */
  pageSize?: number;
  /** Override the application route table used for back-links. */
  routes?: CommentRouteLike[];
  /** Hide the heading (useful when embedded in a page that already has one). */
  hideTitle?: boolean;
}

export const MyComments: React.FC<MyCommentsProps> = (props) => {
  const {
    title = 'My Comments',
    pageSize,
    routes,
    hideTitle = false,
  } = props;

  const sdkFromHook = useReactory();
  const reactory = props.reactory || sdkFromHook;

  const formDef = useMemo(
    () => createMyCommentsForm({ pageSize, routes }),
    [pageSize, routes]
  );

  return (
    <Box sx={{ width: '100%' }}>
      {!hideTitle && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <ForumOutlinedIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            {title}
          </Typography>
        </Stack>
      )}

      <ReactoryForm formDef={formDef} formId={MY_COMMENTS_FORM_ID} reactory={reactory as any} />
    </Box>
  );
};

export default withReactory(MyComments, 'core.MyComments');
