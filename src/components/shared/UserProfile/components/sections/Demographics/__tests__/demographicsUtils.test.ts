/**
 * @jest-environment jsdom
 *
 * ORG-034 — the section's pure helpers.
 *
 * These are the rules that decide what is written and what the member is shown
 * when the server refuses: the "answered or not" test, the payload shape, the
 * required-field rule and the field-error mapping. They are exercised directly
 * so a regression names the rule that broke.
 */
import type { DemographicDefinition } from '../../../../../../plugins/reactory-core/demographic-form';
import {
  REQUIRED_FIELD_MESSAGE,
  buildSavePayload,
  describeSaveFailure,
  envelopeErrorsOf,
  errorListOf,
  isEmptyDemographicValue,
  isSelfServiceDisabledError,
  keyFromErrorPath,
  requiredFieldErrors,
  serverMessageOf,
  toValuesRecord,
} from '../utils';

const makeDefinition = (
  overrides: Partial<DemographicDefinition> = {},
): DemographicDefinition => ({
  key: 'nickname',
  title: 'Nickname',
  valueType: 'string',
  enabled: true,
  ordinal: 0,
  ...overrides,
});

describe('isEmptyDemographicValue — what counts as answered', () => {
  it('treats an absent or blank value as empty', () => {
    expect(isEmptyDemographicValue(null)).toBe(true);
    expect(isEmptyDemographicValue(undefined)).toBe(true);
    expect(isEmptyDemographicValue('')).toBe(true);
    expect(isEmptyDemographicValue('   ')).toBe(true);
    expect(isEmptyDemographicValue([])).toBe(true);
    expect(isEmptyDemographicValue([null, ''])).toBe(true);
    expect(isEmptyDemographicValue({})).toBe(true);
    expect(isEmptyDemographicValue({ line1: '' })).toBe(true);
  });

  it('treats a deliberate false or zero as an answer', () => {
    expect(isEmptyDemographicValue(false)).toBe(false);
    expect(isEmptyDemographicValue(0)).toBe(false);
    expect(isEmptyDemographicValue('0')).toBe(false);
    expect(isEmptyDemographicValue(true)).toBe(false);
  });

  it('treats a non-empty collection or object as an answer', () => {
    expect(isEmptyDemographicValue('Ada')).toBe(false);
    expect(isEmptyDemographicValue(['English'])).toBe(false);
    expect(isEmptyDemographicValue({ line1: '1 Main Road' })).toBe(false);
    expect(isEmptyDemographicValue(42)).toBe(false);
  });

  it('treats a repeatable field with only blank rows as empty', () => {
    // A multiValued definition whose single row was cleared is not an answer,
    // so it must not be written as `['']`.
    expect(isEmptyDemographicValue([''])).toBe(true);
    expect(isEmptyDemographicValue(['', null])).toBe(true);
    expect(isEmptyDemographicValue(['', 'Acme'])).toBe(false);
  });
});

describe('toValuesRecord', () => {
  it('keys the server records by definition key', () => {
    expect(
      toValuesRecord([
        { key: 'nickname', value: 'Ada' },
        { key: 'age', value: 0 },
      ]),
    ).toEqual({ nickname: 'Ada', age: 0 });
  });

  it('skips records without a usable key and normalises an absent value', () => {
    expect(
      toValuesRecord([
        null as any,
        { key: null, value: 'ignored' },
        { key: '', value: 'ignored' },
        { key: 'gender' },
      ]),
    ).toEqual({ gender: null });
  });

  it('accepts nothing at all', () => {
    expect(toValuesRecord(null)).toEqual({});
    expect(toValuesRecord(undefined)).toEqual({});
  });
});

describe('buildSavePayload', () => {
  it('keeps answered definitions only, in the order given', () => {
    const definitions = [
      makeDefinition({ key: 'nickname' }),
      makeDefinition({ key: 'gender', valueType: 'enum' }),
      makeDefinition({ key: 'optIn', valueType: 'boolean' }),
    ];

    expect(
      buildSavePayload(definitions, { nickname: 'Ada', gender: '', optIn: false }),
    ).toEqual([
      { key: 'nickname', value: 'Ada' },
      { key: 'optIn', value: false },
    ]);
  });

  it('never adds a user or definition field', () => {
    const payload = buildSavePayload([makeDefinition({ id: 'def-9' })], {
      nickname: 'Ada',
    });

    expect(payload).toEqual([{ key: 'nickname', value: 'Ada' }]);
    expect(payload[0]).not.toHaveProperty('user');
    expect(payload[0]).not.toHaveProperty('definition');
  });

  it('drops a keyless definition and tolerates no values at all', () => {
    expect(buildSavePayload([makeDefinition({ key: '' })], { '': 'x' })).toEqual([]);
    expect(buildSavePayload([makeDefinition()], undefined)).toEqual([]);
    expect(buildSavePayload([], undefined)).toEqual([]);
  });
});

describe('requiredFieldErrors', () => {
  it('reports only empty required definitions', () => {
    const definitions = [
      makeDefinition({ key: 'gender', required: true }),
      makeDefinition({ key: 'nickname', required: true }),
      makeDefinition({ key: 'optional' }),
      makeDefinition({ key: 'noFlag' }),
    ];

    const errors = requiredFieldErrors(definitions, { gender: 'female', optional: '' });

    expect(errors).toEqual({ nickname: [REQUIRED_FIELD_MESSAGE] });
  });

  it('treats false as an answer for a required boolean', () => {
    const definitions = [makeDefinition({ key: 'optIn', valueType: 'boolean', required: true })];

    expect(requiredFieldErrors(definitions, { optIn: false })).toEqual({});
    expect(requiredFieldErrors(definitions, {})).toEqual({
      optIn: [REQUIRED_FIELD_MESSAGE],
    });
  });

  it('accepts no definitions and no values', () => {
    expect(requiredFieldErrors([], undefined)).toEqual({});
    expect(requiredFieldErrors([makeDefinition({ required: true })], undefined)).toEqual({
      nickname: [REQUIRED_FIELD_MESSAGE],
    });
  });
});

describe('errorListOf', () => {
  it('flattens every shape a GraphQL call can produce', () => {
    expect(errorListOf(null)).toEqual([]);
    expect(errorListOf(undefined)).toEqual([]);

    const a = { message: 'a' };
    const b = { message: 'b' };

    expect(errorListOf([a, null, b])).toEqual([a, b]);
    expect(errorListOf({ graphQLErrors: [a] })).toEqual([a]);
    expect(errorListOf({ errors: [b] })).toEqual([b]);
    // An object with no known error bucket is itself the error.
    expect(errorListOf(a)).toEqual([a]);
    // An empty bucket falls through to the plain-object rule.
    expect(errorListOf({ errors: [] })).toEqual([{ errors: [] }]);
  });
});

describe('keyFromErrorPath', () => {
  const sentKeys = ['nickname', 'age'];

  it('resolves an indexed path to the key sent at that index', () => {
    expect(keyFromErrorPath('values[0].key', sentKeys)).toBe('nickname');
    expect(keyFromErrorPath('values[1].age', sentKeys)).toBe('age');
    expect(keyFromErrorPath('values[1]', sentKeys)).toBe('age');
  });

  it('returns null for an index outside the payload', () => {
    expect(keyFromErrorPath('values[7].age', sentKeys)).toBeNull();
  });

  it('falls back to a path that names the key', () => {
    expect(keyFromErrorPath('age', sentKeys)).toBe('age');
    expect(keyFromErrorPath('age.value', sentKeys)).toBe('age');
  });

  it('returns null when nothing matches', () => {
    expect(keyFromErrorPath('', sentKeys)).toBeNull();
    expect(keyFromErrorPath(undefined as any, sentKeys)).toBeNull();
    expect(keyFromErrorPath('unknownField', sentKeys)).toBeNull();
  });
});

describe('describeSaveFailure', () => {
  const sentKeys = ['nickname', 'age'];

  it('maps a field path onto the definition key and merges repeats', () => {
    const failure = describeSaveFailure(
      {
        errors: [
          {
            message: 'One or more demographic values are invalid',
            extensions: {
              fields: [
                { path: 'values[1].age', message: 'Too old' },
                { path: 'values[1].age', message: 'Must be a number' },
              ],
            },
          },
        ],
      },
      sentKeys,
    );

    expect(failure.fieldErrors).toEqual({ age: ['Too old', 'Must be a number'] });
    expect(failure.unmapped).toEqual([]);
    expect(failure.message).toBe('One or more demographic values are invalid');
    expect(failure.selfServiceDisabled).toBe(false);
  });

  it('accepts the keyed-record shape of extensions.fields', () => {
    const failure = describeSaveFailure(
      { extensions: { fields: { 'values[0]': 'Nickname is taken' } } },
      sentKeys,
    );

    expect(failure.fieldErrors).toEqual({ nickname: ['Nickname is taken'] });
  });

  it('keeps an unattributable message instead of dropping it', () => {
    const failure = describeSaveFailure(
      { extensions: { fields: ['Something went wrong'] } },
      sentKeys,
    );

    expect(failure.fieldErrors).toEqual({});
    expect(failure.unmapped).toEqual(['Something went wrong']);
    expect(failure.message).toBe('Something went wrong');
  });

  it('ignores entries with no message and errors with no extensions', () => {
    const failure = describeSaveFailure(
      { errors: [{ message: 'Rejected' }] },
      sentKeys,
    );
    expect(failure.fieldErrors).toEqual({});
    expect(failure.message).toBe('Rejected');

    const emptyEntry = describeSaveFailure(
      { extensions: { fields: [{ path: 'values[0]' }, { path: 'values[0]', message: '   ' }] } },
      sentKeys,
    );
    expect(emptyEntry.fieldErrors).toEqual({});
    expect(emptyEntry.unmapped).toEqual([]);
    expect(emptyEntry.message).toBeNull();
  });

  it('recognises the policy refusal', () => {
    const byMessage = describeSaveFailure(
      'Self-service demographics are disabled for organization [org-1]',
      sentKeys,
    );
    expect(byMessage.selfServiceDisabled).toBe(true);

    const byExtension = describeSaveFailure(
      { extensions: { selfServiceEnabled: false } },
      sentKeys,
    );
    expect(byExtension.selfServiceDisabled).toBe(true);
  });

  it('does not mistake an unrelated "disabled" message for a policy refusal', () => {
    expect(
      describeSaveFailure('Demographic definition [x] is disabled', sentKeys)
        .selfServiceDisabled,
    ).toBe(false);
  });
});

describe('isSelfServiceDisabledError', () => {
  it('requires both the self-service subject and the refusal', () => {
    expect(isSelfServiceDisabledError('self service is not enabled')).toBe(true);
    expect(isSelfServiceDisabledError('Self-service writes are forbidden')).toBe(true);
    expect(isSelfServiceDisabledError('Self-service is fine')).toBe(false);
    expect(isSelfServiceDisabledError({ message: undefined } as any)).toBe(false);
    expect(isSelfServiceDisabledError({ extensions: { selfServiceEnabled: false } })).toBe(true);
    expect(isSelfServiceDisabledError(null)).toBe(false);
  });
});

describe('envelopeErrorsOf — failure detection is not message detection', () => {
  it('reports an errors array whatever its entries look like', () => {
    expect(envelopeErrorsOf(null)).toBeNull();
    expect(envelopeErrorsOf({ data: { ok: true } })).toBeNull();
    expect(envelopeErrorsOf({ errors: [] })).toBeNull();

    const silent = [{ extensions: { selfServiceEnabled: false } }];
    expect(envelopeErrorsOf({ errors: silent })).toEqual(silent);
  });
});

describe('serverMessageOf', () => {
  it('reads the first usable message out of any failure shape', () => {
    expect(serverMessageOf(null)).toBeNull();
    expect(serverMessageOf('')).toBeNull();
    expect(serverMessageOf('Boom')).toBe('Boom');
    expect(serverMessageOf([{ message: 'First' }, { message: 'Second' }])).toBe('First');
    expect(serverMessageOf({ graphQLErrors: [{ message: 'Wrapped' }] })).toBe('Wrapped');
    expect(serverMessageOf({ networkError: { message: 'Offline' } })).toBe('Offline');
    expect(serverMessageOf({ message: 'Plain' })).toBe('Plain');
    // Nothing usable at all.
    expect(serverMessageOf({ errors: [] })).toBeNull();
    expect(serverMessageOf({ errors: [{ message: '' }] })).toBeNull();
  });
});
