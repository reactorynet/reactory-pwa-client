/**
 * Unit tests for the GraphQL mutation error -> rjsf errorSchema mapper.
 *
 * These cover the contract the ReactoryForm relies on:
 *  - `graphql.mutation.<op>.onError.fieldMap` translates a server extension
 *    key (or a message-only hint) onto a schema path
 *  - `extensions.field` works on its own when it names a real schema property
 *  - anything unattributable degrades to the form-level `_error`, never a throw
 */
import {
  buildErrorSchemaFromGraphQLErrors,
  normaliseGraphQLErrors,
  resolveErrorPath,
  schemaHasPath,
  messageMentionsKey,
} from '../graphqlErrorSchema';

const listSchema = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    students: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

const classSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    code: { type: 'string' },
    teacherId: { type: 'string' },
    settings: {
      type: 'object',
      properties: {
        allowSelfEnrollment: { type: 'boolean' },
      },
    },
  },
};

const duplicateCodeError = {
  message: "Class with code '10A' already exists",
  extensions: { code: 'INTERNAL_SERVER_ERROR' },
};

describe('graphqlErrorSchema', () => {
  describe('normaliseGraphQLErrors', () => {
    it('returns an empty list for a missing payload', () => {
      expect(normaliseGraphQLErrors(undefined)).toEqual([]);
      expect(normaliseGraphQLErrors(null)).toEqual([]);
    });

    it('accepts an array of errors, a single error and a plain string', () => {
      expect(normaliseGraphQLErrors([{ message: 'a' }])).toEqual([
        { message: 'a', extensions: null },
      ]);
      expect(normaliseGraphQLErrors({ message: 'b', extensions: { field: 'code' } })).toEqual([
        { message: 'b', extensions: { field: 'code' } },
      ]);
      expect(normaliseGraphQLErrors('c')).toEqual([{ message: 'c', extensions: null }]);
    });

    it('unwraps an ApolloError-style payload', () => {
      expect(
        normaliseGraphQLErrors({ graphQLErrors: [{ message: 'd' }] }),
      ).toEqual([{ message: 'd', extensions: null }]);
    });
  });

  describe('schemaHasPath', () => {
    it('resolves nested object properties', () => {
      expect(schemaHasPath(classSchema, 'code')).toBe(true);
      expect(schemaHasPath(classSchema, 'settings.allowSelfEnrollment')).toBe(true);
    });

    it('rejects unknown properties and unknown parents', () => {
      expect(schemaHasPath(classSchema, 'nope')).toBe(false);
      expect(schemaHasPath(classSchema, 'settings.nope')).toBe(false);
      expect(schemaHasPath(classSchema, 'missing.deep')).toBe(false);
    });

    it('is permissive when no schema is supplied', () => {
      expect(schemaHasPath(undefined, 'anything')).toBe(true);
    });

    it('resolves array item properties by name and by numeric index', () => {
      expect(schemaHasPath(listSchema, 'students.name')).toBe(true);
      expect(schemaHasPath(listSchema, 'students.0.name')).toBe(true);
      expect(schemaHasPath(listSchema, 'students.0')).toBe(true);
    });

    it('rejects an empty path and a path that walks through a scalar', () => {
      expect(schemaHasPath(listSchema, '')).toBe(false);
      expect(schemaHasPath(listSchema, '...')).toBe(false);
      expect(schemaHasPath(listSchema, 'code.deeper')).toBe(false);
    });

    it('rejects an unknown item property', () => {
      expect(schemaHasPath(listSchema, 'students.unknown')).toBe(false);
    });
  });

  describe('messageMentionsKey', () => {
    it('matches whole words only', () => {
      expect(messageMentionsKey("Class with code '10A' already exists", 'code')).toBe(true);
      expect(messageMentionsKey('Encoded value was rejected', 'code')).toBe(false);
    });

    it('returns false for an empty message or key', () => {
      expect(messageMentionsKey('', 'code')).toBe(false);
      expect(messageMentionsKey('code is taken', '')).toBe(false);
    });

    it('treats regex characters in the key literally', () => {
      expect(messageMentionsKey('field a.b is invalid', 'a.b')).toBe(true);
    });
  });

  describe('resolveErrorPath', () => {
    it('prefers extensions.field when it names a schema property', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'name' } },
          { schema: classSchema },
        ),
      ).toBe('name');
    });

    it('translates a server key through onError.fieldMap', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'classCode' } },
          { schema: classSchema, fieldMap: { classCode: 'code' } },
        ),
      ).toBe('code');
    });

    it('accepts the `path` and `argumentName` extension keys', () => {
      expect(
        resolveErrorPath({ message: 'bad', extensions: { path: ['code'] } }, { schema: classSchema }),
      ).toBe('code');
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { argumentName: 'name' } },
          { schema: classSchema },
        ),
      ).toBe('name');
    });

    it('joins an array-valued `field` into a dotted path', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: ['students', '0', 'name'] } },
          { schema: listSchema },
        ),
      ).toBe('students.0.name');
    });

    it('maps an array-item path through onError.fieldMap', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'studentName' } },
          { schema: listSchema, fieldMap: { studentName: 'students.0.name' } },
        ),
      ).toBe('students.0.name');
    });

    it('supports a numeric fieldMap destination', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'index' } },
          { schema: listSchema, fieldMap: { index: 3 } },
        ),
      ).toBe('3');
    });

    it('ignores fieldMap entries whose destination is not a string/number', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'code' } },
          { schema: classSchema, fieldMap: { code: { not: 'a path' } as any } },
        ),
      ).toBe('code');
    });

    it('strips the input. wrapper some resolvers report', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'input.code' } },
          { schema: classSchema },
        ),
      ).toBe('code');
    });

    it('matches a declared fieldMap key against the message when the server sends no field', () => {
      // The classroom service throws a plain Error, so the message is the only
      // field hint available. A declared map is the opt-in that makes the
      // heuristic safe.
      expect(
        resolveErrorPath(duplicateCodeError, { schema: classSchema, fieldMap: { code: 'code' } }),
      ).toBe('code');
    });

    it('ignores map keys that do not appear in the message', () => {
      expect(
        resolveErrorPath(duplicateCodeError, { schema: classSchema, fieldMap: { name: 'name' } }),
      ).toBe('_error');
    });

    it('falls back to the form-level _error when nothing matches', () => {
      expect(resolveErrorPath({ message: 'Total failure' }, { schema: classSchema })).toBe('_error');
    });

    it('rejects an extension field that is not in the schema instead of inventing a path', () => {
      expect(
        resolveErrorPath(
          { message: 'bad', extensions: { field: 'notAField' } },
          { schema: classSchema },
        ),
      ).toBe('_error');
    });
  });

  describe('buildErrorSchemaFromGraphQLErrors', () => {
    it('reports an array-item error at the item path', () => {
      const { errorSchema, errors } = buildErrorSchemaFromGraphQLErrors(
        [{ message: 'is required', extensions: { field: ['students', '0', 'name'] } }],
        { schema: listSchema },
      );

      expect(errorSchema).toEqual({
        students: { 0: { name: { __errors: ['is required'] } } },
      });
      expect(errors[0].property).toBe('.students.0.name');
    });

    it('keeps a field error and a nested error on the same key', () => {
      // `setErrorAtPath` must create `__errors` on a node that already exists as
      // an intermediate container (path 'a' after 'a.b').
      const { errorSchema } = buildErrorSchemaFromGraphQLErrors(
        [
          { message: 'nested', extensions: { field: 'settings.allowSelfEnrollment' } },
          { message: 'whole object rejected', extensions: { field: 'settings' } },
        ],
        { schema: classSchema },
      );

      expect(errorSchema.settings.allowSelfEnrollment.__errors).toEqual(['nested']);
      expect(errorSchema.settings.__errors).toEqual(['whole object rejected']);
    });

    it('summarises a container error without a duplicated path prefix', () => {
      const { errors } = buildErrorSchemaFromGraphQLErrors(
        [{ message: 'settings are invalid', extensions: { field: 'settings' } }],
        { schema: classSchema },
      );

      expect(errors).toEqual([
        { property: '.settings', message: 'settings are invalid', stack: 'settings are invalid' },
      ]);
    });

    it('survives a malformed schema node when classifying a container', () => {
      // A schema author can leave a non-object in `properties`; walking into it
      // must degrade to "not a container" rather than throw.
      const malformed = { type: 'object', properties: { weird: true as any } };
      const { errorSchema, errors } = buildErrorSchemaFromGraphQLErrors(
        [{ message: 'bad', extensions: { field: 'flagged' } }],
        { schema: malformed, fieldMap: { flagged: 'weird.deeper' } },
      );

      expect(errorSchema).toEqual({ weird: { deeper: { __errors: ['bad'] } } });
      expect(errors[0].property).toBe('.weird.deeper');
    });

    it('ignores whitespace-only messages', () => {
      expect(
        buildErrorSchemaFromGraphQLErrors([{ message: '   ', extensions: { field: 'code' } }]),
      ).toEqual({ errorSchema: {}, errors: [] });
    });

    it('honours a custom form-level key', () => {
      const { errorSchema } = buildErrorSchemaFromGraphQLErrors([{ message: 'boom' }], {
        schema: classSchema,
        formErrorKey: 'form',
      });

      expect(errorSchema).toEqual({ form: { __errors: ['boom'] } });
    });

    it('maps a server field error onto the schema path', () => {
      const { errorSchema, errors } = buildErrorSchemaFromGraphQLErrors(
        [{ message: "'10A' is already taken", extensions: { field: 'code' } }],
        { schema: classSchema },
      );

      expect(errorSchema).toEqual({ code: { __errors: ["'10A' is already taken"] } });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('.code');
      expect(errors[0].message).toBe("'10A' is already taken");
    });

    it('honours onError.fieldMap (acceptance case: duplicate class code)', () => {
      const { errorSchema, errors } = buildErrorSchemaFromGraphQLErrors(
        [{ message: "Class with code '10A' already exists", extensions: { field: 'classCode' } }],
        { schema: classSchema, fieldMap: { classCode: 'code' } },
      );

      expect(errorSchema).toEqual({
        code: { __errors: ["Class with code '10A' already exists"] },
      });
      expect(errors[0].property).toBe('.code');
    });

    it('attaches a message-only error to the mapped field', () => {
      const { errorSchema } = buildErrorSchemaFromGraphQLErrors([duplicateCodeError], {
        schema: classSchema,
        fieldMap: { code: 'code' },
      });

      expect(errorSchema).toEqual({
        code: { __errors: ["Class with code '10A' already exists"] },
      });
    });

    it('uses the form-level _error for unattributable failures', () => {
      const { errorSchema, errors } = buildErrorSchemaFromGraphQLErrors(
        [{ message: 'Something went wrong' }],
        { schema: classSchema },
      );

      expect(errorSchema).toEqual({ _error: { __errors: ['Something went wrong'] } });
      expect(errors[0].property).toBe('._error');
    });

    it('builds nested nodes for dotted paths', () => {
      const { errorSchema } = buildErrorSchemaFromGraphQLErrors(
        [{ message: 'must be chosen', extensions: { field: 'settings.allowSelfEnrollment' } }],
        { schema: classSchema },
      );

      expect(errorSchema).toEqual({
        settings: { allowSelfEnrollment: { __errors: ['must be chosen'] } },
      });
    });

    it('accumulates several errors, including multiple on one field, without duplicates', () => {
      const { errorSchema, errors } = buildErrorSchemaFromGraphQLErrors(
        [
          { message: 'required', extensions: { field: 'name' } },
          { message: 'too short', extensions: { field: 'name' } },
          { message: 'required', extensions: { field: 'name' } },
          { message: 'required', extensions: { field: 'code' } },
        ],
        { schema: classSchema },
      );

      expect(errorSchema.name.__errors).toEqual(['required', 'too short']);
      expect(errorSchema.code.__errors).toEqual(['required']);
      expect(errors).toHaveLength(3);
    });

    it('returns empty output for an empty or malformed payload', () => {
      expect(buildErrorSchemaFromGraphQLErrors(undefined)).toEqual({ errorSchema: {}, errors: [] });
      expect(buildErrorSchemaFromGraphQLErrors([{}])).toEqual({ errorSchema: {}, errors: [] });
      expect(buildErrorSchemaFromGraphQLErrors([null])).toEqual({ errorSchema: {}, errors: [] });
    });
  });
});
