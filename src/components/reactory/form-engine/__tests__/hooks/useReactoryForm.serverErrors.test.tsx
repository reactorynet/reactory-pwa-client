import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useReactoryForm, mergeExtraErrors, type UseReactoryFormArgs } from '../../hooks/useReactoryForm';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

/**
 * Server-derived field errors (REACTORY-302016408).
 *
 * `useGraphQLDataManager` translates a failed mutation into an rjsf
 * errorSchema; ReactoryForm forwards it to the engine as `extraErrors`. These
 * tests pin the engine half of that hand-off: the tree must reach the rjsf
 * `<Form>` and render on the offending field.
 */

const baseArgs = (over: Partial<UseReactoryFormArgs> = {}): UseReactoryFormArgs => {
  const reactory = createMockReactorySDK();
  return {
    schema: {
      type: 'object',
      title: 'Class Details',
      properties: {
        name: { type: 'string', title: 'Name' },
        code: { type: 'string', title: 'Class Code' },
      },
      required: ['name'],
    },
    formData: { name: 'Class 10A', code: '10A' },
    formContext: { reactory },
    engine: 'v5',
    ...over,
  };
};

const duplicateCodeSchema = {
  code: { __errors: ["Class with code '10A' already exists"] },
};

describe('mergeExtraErrors', () => {
  it('returns the other side when one side is empty', () => {
    expect(mergeExtraErrors(undefined, duplicateCodeSchema)).toBe(duplicateCodeSchema);
    expect(mergeExtraErrors(duplicateCodeSchema, undefined)).toBe(duplicateCodeSchema);
    expect(mergeExtraErrors(undefined, undefined)).toBeUndefined();
  });

  it('merges different paths and concatenates duplicate __errors', () => {
    expect(
      mergeExtraErrors(
        { code: { __errors: ['taken'] }, name: { __errors: ['required'] } },
        { code: { __errors: ['taken', 'must be unique'] } },
      ),
    ).toEqual({
      code: { __errors: ['taken', 'must be unique'] },
      name: { __errors: ['required'] },
    });
  });

  it('merges nested paths instead of replacing them', () => {
    expect(
      mergeExtraErrors(
        { settings: { allowSelfEnrollment: { __errors: ['a'] } } },
        { settings: { requireInstructorApproval: { __errors: ['b'] } } },
      ),
    ).toEqual({
      settings: {
        allowSelfEnrollment: { __errors: ['a'] },
        requireInstructorApproval: { __errors: ['b'] },
      },
    });
  });
});

describe('useReactoryForm — server extraErrors', () => {
  it('forwards args.extraErrors to the rjsf <Form>', () => {
    const reactory = createMockReactorySDK();
    const args = baseArgs({ formContext: { reactory }, extraErrors: duplicateCodeSchema });

    const { result } = renderHook(() => useReactoryForm(args));
    const form = result.current.form as unknown as React.ReactElement<{
      children: React.ReactElement<{ extraErrors: unknown }>;
    }>;

    expect(form.props.children.props.extraErrors).toEqual(duplicateCodeSchema);
  });

  it('keeps both server errors and async validator errors', () => {
    const reactory = createMockReactorySDK();
    const args = baseArgs({
      formContext: { reactory },
      extraErrors: duplicateCodeSchema,
      customAsyncValidate: (async () => ({ name: { __errors: ['username-taken'] } })) as unknown as UseReactoryFormArgs['customAsyncValidate'],
      asyncValidateDebounceMs: 1,
    });

    const { result } = renderHook(() => useReactoryForm(args));
    const form = result.current.form as unknown as React.ReactElement<{
      children: React.ReactElement<{ extraErrors: { code?: unknown } }>;
    }>;

    expect(form.props.children.props.extraErrors.code).toEqual(
      duplicateCodeSchema.code,
    );
  });

  it('renders the server message inline on the offending field', () => {
    const reactory = createMockReactorySDK();
    const args = baseArgs({ formContext: { reactory }, extraErrors: duplicateCodeSchema });

    const Harness: React.FC = () => {
      const { form } = useReactoryForm(args);
      return form;
    };

    render(<Harness />);

    const alerts = screen.getAllByRole('alert');
    const rendered = alerts.map((node) => node.textContent || '').join('|');
    expect(rendered).toContain("Class with code '10A' already exists");
  });
});
