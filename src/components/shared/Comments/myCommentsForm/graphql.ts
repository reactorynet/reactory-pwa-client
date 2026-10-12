import Reactory from '@reactorynet/reactory-core';

/**
 * GraphQL definitions for the "My Comments" grid.
 *
 * The `getMyComments` resolver is already server-paged and supports an optional
 * context filter and a free-text search over the comment text / quoted
 * selection, so the grid can drive everything from its query state
 * (`query.search`, `query.context`, and the auto-injected `paging`).
 */
export const MY_COMMENTS_QUERY = `
  query GetMyComments($context: String, $searchTerm: String, $includeRemoved: Boolean, $paging: PagingRequest) {
    getMyComments(context: $context, searchTerm: $searchTerm, includeRemoved: $includeRemoved, paging: $paging) {
      comments {
        id
        text
        when
        quote
        context
        contextId
        removed
        parentId
        upvotes
        favorites
        who {
          id
          firstName
          lastName
          avatar
          email
        }
      }
      paging {
        page
        pageSize
        total
        hasNext
      }
    }
  }
`;

export const MY_COMMENT_STATS_QUERY = `
  query GetMyCommentStats {
    getMyCommentStats {
      context
      count
    }
  }
`;

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    getMyComments: {
      name: 'getMyComments',
      text: MY_COMMENTS_QUERY,
      // `includeRemoved: true` lets an author review their own removed comments
      // (they are still only ever shown their own). Surfaced to the widget
      // variable map as `props.includeRemoved`.
      props: {
        includeRemoved: true,
      },
      variables: {
        'query.search': 'searchTerm',
        'query.context': 'context',
        'props.includeRemoved': 'includeRemoved',
      },
      resultType: 'object',
      resultMap: {
        comments: 'data',
        paging: 'paging',
      },
    },
  },
};

export default graphql;
