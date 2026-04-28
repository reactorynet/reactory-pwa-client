/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FieldProps, RJSFSchema, ValidatorType } from '@rjsf/utils';
import {
  ReactoryConditionalField,
  mergeConditionalBranch,
  pickConditionalBranch,
  resolveConditional,
} from '../../fields/ReactoryConditionalField';
import { createReactoryValidator } from '../../validator/ReactoryValidator';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

// A representative draft-07 conditional schema.
const conditional: RJSFSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['a', 'b'] },
    common: { type: 'string' },
  },
  required: ['kind'],
  if: { properties: { kind: { const: 'a' } } },
  then: { properties: { extraA: { type: 'string', title: 'Extra A' } }, required: ['extraA'] },
  else: { properties: { extraB: { type: 'string', title: 'Extra B' } } },
} as unknown as RJSFSchema;

describe('mergeConditionalBranch', () => {
  it('strips if/then/else from the base when no branch is supplied', () => {
    const merged = mergeConditionalBranch(conditional, undefined);
    expect((merged as { if?: unknown }).if).toBeUndefined();
    expect((merged as { then?: unknown }).then).toBeUndefined();
    expect((merged as { else?: unknown }).else).toBeUndefined();
  });

  it('keeps base properties verbatim', () => {
    const merged = mergeConditionalBranch(conditional, undefined);
    expect((merged as { properties: Record<string, unknown> }).properties).toMatchObject({
      kind: expect.any(Object),
      common: expect.any(Object),
    });
  });

  it('merges branch properties on top of base properties', () => {
    const merged = mergeConditionalBranch(conditional, (conditional as { then: RJSFSchema }).then);
    const props = (merged as { properties: Record<string, unknown> }).properties;
    expect(props).toMatchObject({
      kind: expect.any(Object),
      common: expect.any(Object),
      extraA: expect.any(Object),
    });
  });

  it('unions required arrays from base and branch', () => {
    const merged = mergeConditionalBranch(conditional, (conditional as { then: RJSFSchema }).then);
    expect((merged as { required: string[] }).required.sort()).toEqual(['extraA', 'kind']);
  });

  it('does not mutate the input base schema', () => {
    const before = JSON.stringify(conditional);
    mergeConditionalBranch(conditional, (conditional as { then: RJSFSchema }).then);
    expect(JSON.stringify(conditional)).toBe(before);
  });

  it('treats a non-object branch as no-op', () => {
    const merged = mergeConditionalBranch(conditional, undefined);
    expect((merged as { properties: Record<string, unknown> }).properties).toMatchObject({
      kind: expect.any(Object),
    });
  });
});

describe('pickConditionalBranch', () => {
  const reactory = createMockReactorySDK();
  const validator = createReactoryValidator({ reactory, disableLocalizer: true });

  it('returns "then" when formData satisfies if', () => {
    expect(pickConditionalBranch(conditional, { kind: 'a' }, validator)).toBe('then');
  });

  it('returns "else" when formData fails if', () => {
    expect(pickConditionalBranch(conditional, { kind: 'b' }, validator)).toBe('else');
  });

  it('returns "neither" when there is no if clause', () => {
    const noIf = { type: 'object', properties: {} } as RJSFSchema;
    expect(pickConditionalBranch(noIf, {}, validator)).toBe('neither');
  });

  it('returns "neither" when the validator throws', () => {
    const bad: Pick<ValidatorType, 'isValid'> = {
      isValid: () => {
        throw new Error('AJV blew up');
      },
    };
    expect(pickConditionalBranch(conditional, { kind: 'a' }, bad)).toBe('neither');
  });

  it('treats undefined formData as empty object for the if check', () => {
    // formData=undefined → {} is checked against if. JSON Schema's
    // `properties.kind.const` only constrains when `kind` exists; empty {}
    // passes (no `required` in the if-clause), so the then-branch is picked.
    expect(pickConditionalBranch(conditional, undefined, validator)).toBe('then');
  });
});

describe('resolveConditional', () => {
  const reactory = createMockReactorySDK();
  const validator = createReactoryValidator({ reactory, disableLocalizer: true });

  it('returns the then-merged schema when formData picks then', () => {
    const r = resolveConditional(conditional, { kind: 'a' }, validator);
    const props = (r as { properties: Record<string, unknown> }).properties;
    expect(props.extraA).toBeDefined();
    expect(props.extraB).toBeUndefined();
    expect((r as { if?: unknown }).if).toBeUndefined();
  });

  it('returns the else-merged schema when formData picks else', () => {
    const r = resolveConditional(conditional, { kind: 'b' }, validator);
    const props = (r as { properties: Record<string, unknown> }).properties;
    expect(props.extraB).toBeDefined();
    expect(props.extraA).toBeUndefined();
  });

  it('returns the schema unchanged (sans if/then/else) when there is no if', () => {
    const noIf = { type: 'object', properties: { x: { type: 'string' } } } as RJSFSchema;
    const r = resolveConditional(noIf, {}, validator);
    expect((r as { properties: Record<string, unknown> }).properties).toEqual({ x: { type: 'string' } });
  });
});

describe('ReactoryConditionalField (component)', () => {
  // A minimal SchemaField mock that just renders the schema's property keys
  // so we can assert which branch was selected without spinning up the full
  // rjsf field tree.
  const StubSchemaField: React.FC<FieldProps> = ({ schema }) => {
    const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
    return (
      <div data-testid="stub-schema-field">
        {Object.keys(props).map((k) => (
          <span key={k} data-prop={k}>{k}</span>
        ))}
      </div>
    );
  };

  function buildProps(formData: unknown): FieldProps {
    const reactory = createMockReactorySDK();
    const validator = createReactoryValidator({ reactory, disableLocalizer: true });
    return {
      schema: conditional,
      uiSchema: { 'ui:field': 'ConditionalField' },
      idSchema: { $id: 'root' } as FieldProps['idSchema'],
      formData,
      formContext: {},
      onChange: () => undefined,
      onBlur: () => undefined,
      onFocus: () => undefined,
      registry: {
        fields: { SchemaField: StubSchemaField } as FieldProps['registry']['fields'],
        widgets: {} as FieldProps['registry']['widgets'],
        templates: {} as FieldProps['registry']['templates'],
        rootSchema: conditional,
        formContext: {},
        schemaUtils: { validator } as unknown as FieldProps['registry']['schemaUtils'],
        validator,
      } as unknown as FieldProps['registry'],
      name: '',
      required: false,
      disabled: false,
      readonly: false,
      autofocus: false,
      hideError: false,
      errorSchema: {},
    } as unknown as FieldProps;
  }

  it('renders the then branch when formData satisfies if', () => {
    render(<ReactoryConditionalField {...buildProps({ kind: 'a' })} />);
    expect(screen.queryByText('extraA')).toBeInTheDocument();
    expect(screen.queryByText('extraB')).toBeNull();
  });

  it('renders the else branch when formData fails if', () => {
    render(<ReactoryConditionalField {...buildProps({ kind: 'b' })} />);
    expect(screen.queryByText('extraB')).toBeInTheDocument();
    expect(screen.queryByText('extraA')).toBeNull();
  });

  it('strips ui:field before delegating to SchemaField (avoids self-loop)', () => {
    let capturedUiSchema: unknown = null;
    const Capture: React.FC<FieldProps> = (p) => {
      capturedUiSchema = p.uiSchema;
      return null;
    };
    const props = buildProps({ kind: 'a' });
    (props.registry.fields as Record<string, unknown>).SchemaField = Capture;
    render(<ReactoryConditionalField {...props} />);
    expect((capturedUiSchema as Record<string, unknown>)?.['ui:field']).toBeUndefined();
  });

  it('renders an error when SchemaField is missing from the registry', () => {
    const props = buildProps({ kind: 'a' });
    delete (props.registry.fields as Record<string, unknown>).SchemaField;
    render(<ReactoryConditionalField {...props} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/SchemaField not in registry/);
  });
});
