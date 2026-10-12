import React from 'react';
import { render, screen } from '@testing-library/react';

/**
 * The shell resolves its SDK via the ApiProvider hook and renders the grid via
 * `ReactoryForm`. Both are mocked so the test can assert the form contract the
 * shell hands to the grid without mounting the whole MaterialTableWidget.
 */
const mockReactory: any = {
  graphqlQuery: jest.fn(() => Promise.resolve({ data: {} })),
  getRoutes: jest.fn(() => []),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactory,
  withReactory: (component: any) => component,
}));

const mockFormProps: { value: any } = { value: null };
jest.mock('@reactory/client-core/components/reactory/ReactoryForm', () => ({
  ReactoryForm: (props: any) => {
    mockFormProps.value = props;
    return <div data-testid="mock-reactory-form" data-formid={props.formId} />;
  },
}));

import { template } from 'lodash';

import { MyComments } from '../MyComments';
import { COMMENT_PREVIEW_FORMAT, COMMENT_PREVIEW_MAX_LENGTH } from '../myCommentsForm/uiSchema';

const materialOptions = (formDef: any) => formDef.uiSchema.comments['ui:options'];

/** Mirrors how core.LabelComponent evaluates a column's `format` (lodash `${}`). */
const renderPreview = (text: string | null | undefined): string =>
  template(COMMENT_PREVIEW_FORMAT, { interpolate: /\$\{([\s\S]+?)\}/g })({
    rowData: text === undefined ? undefined : { text },
  }) as unknown as string;

describe('MyComments (grid shell)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormProps.value = null;
  });

  it('renders the heading by default', () => {
    render(<MyComments />);
    expect(screen.getByText('My Comments')).toBeInTheDocument();
    expect(screen.getByTestId('mock-reactory-form')).toBeInTheDocument();
  });

  it('hides the heading when hideTitle is set', () => {
    render(<MyComments hideTitle />);
    expect(screen.queryByText('My Comments')).toBeNull();
  });

  it('mounts the My Comments grid form', () => {
    render(<MyComments />);
    const { formDef, formId } = mockFormProps.value;
    expect(formId).toBe('core.MyCommentsList@1.0.0');
    expect(formDef.id).toBe('core.MyCommentsList@1.0.0');
  });

  it('drives a server-paged MaterialTableWidget query for getMyComments', () => {
    render(<MyComments />);
    const options = materialOptions(mockFormProps.value.formDef);
    expect(mockFormProps.value.formDef.uiSchema.comments['ui:widget']).toBe('MaterialTableWidget');
    expect(options.remoteData).toBe(true);
    expect(options.query).toBe('getMyComments');
    expect(options.resultMap).toEqual({ comments: 'data', paging: 'paging' });
    expect(options.variables['query.search']).toBe('searchTerm');
    expect(options.variables['query.context']).toBe('context');
  });

  it('wires the expanding detail panel and toolbar components', () => {
    render(<MyComments />);
    const options = materialOptions(mockFormProps.value.formDef);
    expect(options.componentMap.DetailsPanel).toBe('core.MyCommentDetailPanel@1.0.0');
    expect(options.componentMap.Toolbar).toBe('core.MyCommentsToolbar@1.0.0');
    expect(options.options.detailPanelType).toBe('single');
    expect(options.detailPanelPropsMap).toEqual({ 'props.rowData': 'comment' });
  });

  it('refreshes when comments change elsewhere in the app', () => {
    render(<MyComments />);
    const options = materialOptions(mockFormProps.value.formDef);
    const events = options.refreshEvents.map((e: any) => e.name);
    expect(events).toContain('core.CommentAdded');
    expect(events).toContain('core.CommentUpdated');
  });

  it('applies a pageSize override', () => {
    render(<MyComments pageSize={50} />);
    const options = materialOptions(mockFormProps.value.formDef);
    expect(options.options.pageSize).toBe(50);
  });

  it('forwards a routes override to the detail panel', () => {
    const routes = [{ key: 'content', path: '/content/:id' }];
    render(<MyComments routes={routes as any} />);
    const options = materialOptions(mockFormProps.value.formDef);
    expect(options.detailPanelProps.routes).toEqual(routes);
  });

  it('does not clamp the base config when overrides are absent', () => {
    render(<MyComments />);
    const options = materialOptions(mockFormProps.value.formDef);
    // Base page size remains the grid default when no override is provided.
    expect(options.options.pageSize).toBe(10);
    expect(options.detailPanelProps.routes).toBeUndefined();
  });

  it('truncates the Comment column preview to the configured max length', () => {
    render(<MyComments />);
    const options = materialOptions(mockFormProps.value.formDef);
    const commentColumn = options.columns.find((column: any) => column.field === 'text');
    expect(commentColumn.props.uiSchema['ui:options'].format).toBe(COMMENT_PREVIEW_FORMAT);
  });

  describe('comment preview format', () => {
    it('substrings long comments to the max length with an ellipsis', () => {
      const longText = 'x'.repeat(200);
      const preview = renderPreview(longText);
      expect(preview).toBe('x'.repeat(COMMENT_PREVIEW_MAX_LENGTH) + '\u2026');
      expect(preview.length).toBe(COMMENT_PREVIEW_MAX_LENGTH + 1);
    });

    it('leaves comments at or below the max length untouched', () => {
      const exact = 'y'.repeat(COMMENT_PREVIEW_MAX_LENGTH);
      expect(renderPreview(exact)).toBe(exact);
      expect(renderPreview('short comment')).toBe('short comment');
    });

    it('handles missing comment text', () => {
      expect(renderPreview(undefined)).toBe('');
      expect(renderPreview(null)).toBe('');
      expect(renderPreview('')).toBe('');
    });
  });
});
