import Reactory from '@reactorynet/reactory-core';

/** Maximum number of characters shown in the grid's comment preview cell. */
export const COMMENT_PREVIEW_MAX_LENGTH = 50;

/**
 * The `format` template for the grid's Comment column.
 *
 * The template is evaluated by `core.LabelComponent` via lodash `template(...)`
 * (the same `${}` interpolation the widget uses internally), so the preview is
 * truncated to {@link COMMENT_PREVIEW_MAX_LENGTH} characters with a trailing
 * ellipsis. The full comment body is only rendered in the expanding detail
 * panel, which keeps a page of rows cheap to render for long-form comments.
 */
export const COMMENT_PREVIEW_FORMAT =
  '${rowData && rowData.text ? (String(rowData.text).length > 50 ? String(rowData.text).substring(0, 50) + "…" : String(rowData.text)) : ""}';

/**
 * MaterialTableWidget configuration for the "My Comments" surface.
 *
 * Mirrors the SupportTickets grid approach: a server-paged remote grid
 * (`getMyComments`) with an expanding single-row detail panel and a custom
 * toolbar. Long comment bodies are deliberately clamped in the list cell — the
 * full text lives in the detail panel so a page of rows stays cheap to render.
 *
 * The list is a lookup surface, so add/delete/selection are disabled; the only
 * outbound action lives in the detail panel ("View resource").
 */
export const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false, // Search is handled by the custom MyCommentsToolbar.
  columns: [
    {
      title: 'Context',
      field: 'context',
      width: 150,
      component: 'core.MyCommentContextBadge@1.0.0',
      propsMap: {
        'rowData.context': 'context',
      },
    },
    {
      // Truncated preview (see COMMENT_PREVIEW_FORMAT). The full comment body is
      // only rendered in the expanding detail panel.
      title: 'Comment',
      field: 'text',
      width: 460,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: COMMENT_PREVIEW_FORMAT,
            style: {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          },
        },
      },
    },
    {
      title: 'Author',
      field: 'who',
      width: 180,
      component: 'core.UserAvatar@1.0.0',
      propsMap: {
        'rowData.who': 'user',
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'chip',
            size: 'small',
          },
        },
      },
    },
    {
      title: 'When',
      field: 'when',
      width: 150,
      component: 'core.RelativeTime@1.0.0',
      propsMap: {
        'rowData.when': 'date',
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
          },
        },
      },
      type: 'datetime',
      defaultSort: 'desc',
    },
    {
      // A compact, non-interactive flag for the row's state.
      title: 'Flags',
      field: 'removed',
      width: 110,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'caption',
            format: '${rowData.removed ? "Removed" : (rowData.parentId ? "Reply" : "")}',
            style: {
              color: '#8d6e63',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            },
          },
        },
      },
    },
  ],
  remoteData: true,
  query: 'getMyComments',
  options: {
    toolbar: true,
    selection: false,
    search: false,
    grouping: false,
    filtering: false,
    exportButton: true,
    exportAllData: true,
    columnsButton: true,
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50, 100],
    emptyRowsWhenPaging: false,
    pagination: true,
    // Row-expansion detail panel (SupportTickets pattern).
    detailPanelType: 'single',
    showDetailPanelIcon: true,
    detailPanelColumnAlignment: 'left',
  },
  headerStyle: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  rowStyle: {},
  altRowStyle: {
    backgroundColor: '#fafafa',
  },
  selectedRowStyle: {},
  conditionalRowStyling: [
    {
      // Template conditions avoid the widget's `_field.toLowerCase()` path,
      // which throws when the field value is a real boolean.
      field: 'removed',
      condition: '${rowData.removed === true}',
      style: {
        opacity: 0.65,
        backgroundColor: '#fff8e1',
        borderLeft: '4px solid #fbc02d',
      },
    },
    {
      field: 'parentId',
      condition: '${typeof rowData.parentId === "string" && rowData.parentId.length > 0}',
      style: {
        borderLeft: '4px solid #90caf9',
      },
    },
  ],
  // Refresh when comments change elsewhere in the app.
  refreshEvents: [
    { name: 'core.CommentAdded' },
    { name: 'core.CommentUpdated' },
  ],
  componentMap: {
    DetailsPanel: 'core.MyCommentDetailPanel@1.0.0',
    Toolbar: 'core.MyCommentsToolbar@1.0.0',
  },
  detailPanelProps: {
    useCase: 'grid',
  },
  detailPanelPropsMap: {
    'props.rowData': 'comment',
  },
  variables: {
    'query.search': 'searchTerm',
    'query.context': 'context',
    'props.includeRemoved': 'includeRemoved',
  },
  resultMap: {
    comments: 'data',
    paging: 'paging',
  },
  localization: {
    body: {
      emptyDataSourceMessage: 'You have not commented on anything yet.',
    },
  },
};

const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: 'none',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      comments: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
  ],
};

export const uiSchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  comments: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions,
  },
};

export default uiSchema;
