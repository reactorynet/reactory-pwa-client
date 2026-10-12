import Reactory from '@reactorynet/reactory-core';
import schema from './schema';
import uiSchema, { MaterialTableUIOptions } from './uiSchema';
import graphql from './graphql';
import { CommentRouteLike } from '../commentResourceLinks';

export const MY_COMMENTS_FORM_ID = 'core.MyCommentsList@1.0.0';

/**
 * "My Comments" grid form.
 *
 * Rendered by `core.MyComments@1.0.0` (a thin shell) using the shared
 * `MaterialTableWidget`. Kept as a standalone form definition — rather than
 * hand-rolling a table in the component — so it reuses the exact paging,
 * detail-panel and toolbar machinery the SupportTickets grid relies on.
 */
export const MyCommentsListForm: Reactory.Forms.IReactoryForm = {
  id: MY_COMMENTS_FORM_ID,
  nameSpace: 'core',
  name: 'MyCommentsList',
  version: '1.0.0',
  title: 'My Comments',
  description:
    'Review every comment you have authored across the platform with a back-link to the originating resource.',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  // The grid is embedded by the core.MyComments shell; it is not itself a
  // routed component.
  registerAsComponent: false,
  schema,
  uiSchema,
  graphql,
  tags: ['comments', 'my-comments', 'lookup', 'grid'],
  roles: ['USER'],
};

export interface CreateMyCommentsFormOptions {
  /** Rows per page (defaults to the grid's own 10). */
  pageSize?: number;
  /** Override the application route table used to resolve resource back-links. */
  routes?: CommentRouteLike[];
}

/**
 * Clones the base form with per-instance overrides. The detail panel resolves
 * back-links from the live route table (`reactory.getRoutes()`), but callers can
 * inject a route table explicitly (useful in tests or embedded surfaces).
 */
export const createMyCommentsForm = (
  options: CreateMyCommentsFormOptions = {}
): Reactory.Forms.IReactoryForm => {
  const { pageSize, routes } = options;
  const baseUiSchema: any = MyCommentsListForm.uiSchema || {};
  const baseComments: any = baseUiSchema.comments || {};

  const nextOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
    ...MaterialTableUIOptions,
    options: {
      ...(MaterialTableUIOptions.options || {}),
      ...(typeof pageSize === 'number' && pageSize > 0 ? { pageSize } : {}),
    },
    ...(routes && routes.length > 0
      ? {
          detailPanelProps: {
            ...(MaterialTableUIOptions.detailPanelProps || {}),
            routes,
          },
        }
      : {}),
  };

  return {
    ...MyCommentsListForm,
    uiSchema: {
      ...baseUiSchema,
      comments: {
        ...baseComments,
        'ui:options': nextOptions,
      },
    },
  };
};

export default MyCommentsListForm;
