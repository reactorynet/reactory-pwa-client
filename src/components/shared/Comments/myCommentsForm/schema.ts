import Reactory from '@reactorynet/reactory-core';

/**
 * Schema for the "My Comments" grid. The single `comments` array is rendered by
 * the `MaterialTableWidget`; the item shape mirrors what `getMyComments`
 * returns (see the Comment resolver).
 */
export const MyCommentSchema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Comment',
  properties: {
    id: { type: 'string', title: 'ID' },
    text: { type: 'string', title: 'Comment' },
    when: { type: 'string', title: 'When' },
    quote: { type: 'string', title: 'Quote' },
    context: { type: 'string', title: 'Context' },
    contextId: { type: 'string', title: 'Context ID' },
    removed: { type: 'boolean', title: 'Removed' },
    parentId: { type: 'string', title: 'Parent' },
    upvotes: { type: 'number', title: 'Upvotes' },
    favorites: { type: 'number', title: 'Favorites' },
    who: {
      type: 'object',
      title: 'Author',
      properties: {
        id: { type: 'string', title: 'ID' },
        firstName: { type: 'string', title: 'Firstname' },
        lastName: { type: 'string', title: 'Lastname' },
        avatar: { type: 'string', title: 'Avatar' },
        email: { type: 'string', title: 'Email' },
      },
    },
  },
};

export const schema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    comments: {
      type: 'array',
      title: 'My Comments',
      items: MyCommentSchema,
    },
  },
};

export default schema;
