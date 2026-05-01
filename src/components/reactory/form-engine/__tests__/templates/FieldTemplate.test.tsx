/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FieldTemplateProps } from '@rjsf/utils';
import { ReactoryFieldTemplate, isFieldHidden } from '../../templates/FieldTemplate';

const baseProps = (overrides: Partial<FieldTemplateProps> = {}): FieldTemplateProps => ({
  id: 'root_name',
  classNames: undefined as unknown as string,
  label: 'Name',
  required: false,
  readonly: false,
  disabled: false,
  hidden: false,
  displayLabel: true,
  schema: { type: 'string' },
  uiSchema: {},
  formContext: {},
  registry: {} as FieldTemplateProps['registry'],
  onKeyChange: () => () => undefined,
  onDropPropertyClick: () => () => undefined,
  onChange: () => undefined,
  children: <input data-testid="child" />,
  ...overrides,
});

describe('isFieldHidden', () => {
  const args = {
    formData: { x: 1 },
    formContext: {} as Record<string, unknown>,
    idSchema: { $id: 'root_x' },
    schema: { type: 'string' },
    uiSchema: {} as Record<string, unknown>,
  };

  it('returns true when rjsf-supplied hidden is true', () => {
    expect(isFieldHidden(true, undefined, args)).toBe(true);
  });

  it('returns false when neither source flags hidden', () => {
    expect(isFieldHidden(false, {}, args)).toBe(false);
    expect(isFieldHidden(undefined, undefined, args)).toBe(false);
  });

  it('returns true when ui:hidden is the boolean true', () => {
    expect(isFieldHidden(false, { 'ui:hidden': true }, args)).toBe(true);
  });

  it('returns false when ui:hidden is the boolean false', () => {
    expect(isFieldHidden(false, { 'ui:hidden': false }, args)).toBe(false);
  });

  it('honours a callback returning true', () => {
    const fn = jest.fn(() => true);
    expect(isFieldHidden(false, { 'ui:hidden': fn }, args)).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('honours a callback returning false', () => {
    expect(isFieldHidden(false, { 'ui:hidden': () => false }, args)).toBe(false);
  });

  it('passes callback args including formData, formContext, schema, uiSchema, idSchema', () => {
    let captured: Parameters<NonNullable<Parameters<typeof isFieldHidden>[1]>['ui:hidden'] extends (a: infer A) => unknown ? (a: A) => unknown : never>[0] | null = null;
    isFieldHidden(false, { 'ui:hidden': (a: any) => { captured = a; return false; } }, args);
    expect(captured).toMatchObject({
      formData: { x: 1 },
      formContext: {},
      idSchema: { $id: 'root_x' },
      schema: { type: 'string' },
    });
  });

  it('treats a throwing callback as visible (does not crash)', () => {
    expect(isFieldHidden(false, { 'ui:hidden': () => { throw new Error('boom'); } }, args)).toBe(false);
  });

  it('treats truthy non-boolean callback returns as not hidden', () => {
    // The callback must return strict `true` to hide; "truthy" strings/objects do not count.
    expect(isFieldHidden(false, { 'ui:hidden': () => 'yes' as unknown as boolean }, args)).toBe(false);
  });
});

describe('ReactoryFieldTemplate', () => {
  it('renders the label and the child', () => {
    render(<ReactoryFieldTemplate {...baseProps()} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders nothing when hidden is true', () => {
    const { container } = render(<ReactoryFieldTemplate {...baseProps({ hidden: true })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when ui:hidden is true', () => {
    const { container } = render(
      <ReactoryFieldTemplate {...baseProps({ uiSchema: { 'ui:hidden': true } })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when ui:hidden callback returns true', () => {
    const { container } = render(
      <ReactoryFieldTemplate
        {...baseProps({
          uiSchema: { 'ui:hidden': () => true },
          formContext: { user: { isAdmin: false } },
        })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('appends an asterisk to the label when required', () => {
    render(<ReactoryFieldTemplate {...baseProps({ required: true })} />);
    const lbl = screen.getByText('Name').closest('label');
    expect(lbl?.textContent).toContain('*');
  });

  it('hides the label when displayLabel is false', () => {
    render(<ReactoryFieldTemplate {...baseProps({ displayLabel: false })} />);
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
  });

  it('emits an error region with role=alert and id=$id-error when there are errors', () => {
    render(
      <ReactoryFieldTemplate
        {...baseProps({
          rawErrors: ['must be at least 3 characters'],
          errors: <span>must be at least 3 characters</span>,
        })}
      />,
    );
    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('id', 'root_name-error');
    expect(region).toHaveTextContent('must be at least 3 characters');
  });

  it('does not emit an error region when rawErrors is empty', () => {
    render(<ReactoryFieldTemplate {...baseProps({ rawErrors: [] })} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('emits a help region with id=$id-help', () => {
    render(<ReactoryFieldTemplate {...baseProps({ help: <span>helpful</span> })} />);
    expect(document.getElementById('root_name-help')).not.toBeNull();
    expect(document.getElementById('root_name-help')).toHaveTextContent('helpful');
  });

  it('uses ui:classNames-equivalent class when classNames is supplied', () => {
    const { container } = render(
      <ReactoryFieldTemplate {...baseProps({ classNames: 'my-custom-class' })} />,
    );
    expect((container.firstChild as HTMLElement).className).toBe('my-custom-class');
  });

  it('falls back to a default classname based on schema.type', () => {
    const { container } = render(<ReactoryFieldTemplate {...baseProps()} />);
    expect((container.firstChild as HTMLElement).className).toBe('field field-string');
  });

  it('forwards the data-field-id attribute for testing/scoping', () => {
    const { container } = render(<ReactoryFieldTemplate {...baseProps()} />);
    expect((container.firstChild as HTMLElement).getAttribute('data-field-id')).toBe('root_name');
  });

  it('does not render the description block when description is undefined', () => {
    const { container } = render(<ReactoryFieldTemplate {...baseProps({ description: undefined })} />);
    expect(container.querySelector('.field-description')).toBeNull();
  });

  it('renders the description when supplied', () => {
    render(
      <ReactoryFieldTemplate
        {...baseProps({ description: <span data-testid="desc">my description</span> })}
      />,
    );
    expect(screen.getByTestId('desc')).toBeInTheDocument();
  });

  describe('ui:permission integration (P4.1)', () => {
    const grantingService = (granted: string[]) => ({
      hasAny: (roles: string[]) => roles.some((r) => granted.includes(r)),
    });

    const fcWithService = (granted: string[] | null) => {
      const reactory: { permissions?: ReturnType<typeof grantingService>; log: jest.Mock } = {
        log: jest.fn(),
      };
      if (granted !== null) reactory.permissions = grantingService(granted);
      return { reactory };
    };

    it('hides the field when ui:permission denies read', () => {
      const { container } = render(
        <ReactoryFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:permission': { read: ['admin'] } },
            formContext: fcWithService(['user']),
          })}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders the field when ui:permission grants read', () => {
      render(
        <ReactoryFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:permission': { read: ['user'] } },
            formContext: fcWithService(['user']),
          })}
        />,
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('marks the field readonly when ui:permission denies write', () => {
      const { container } = render(
        <ReactoryFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:permission': { read: ['user'], write: ['admin'] } },
            formContext: fcWithService(['user']),
          })}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.getAttribute('data-readonly')).toBe('true');
      expect(wrapper.getAttribute('aria-readonly')).toBe('true');
    });

    it('does not mark readonly when ui:permission grants write', () => {
      const { container } = render(
        <ReactoryFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:permission': { read: ['user'], write: ['user'] } },
            formContext: fcWithService(['user']),
          })}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.getAttribute('data-readonly')).toBeNull();
    });

    it('preserves rjsf-supplied readonly even when ui:permission grants write', () => {
      const { container } = render(
        <ReactoryFieldTemplate
          {...baseProps({
            readonly: true,
            uiSchema: { 'ui:permission': { read: ['user'], write: ['user'] } },
            formContext: fcWithService(['user']),
          })}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.getAttribute('data-readonly')).toBe('true');
    });

    it('fails closed (hides) when ui:permission is set but service is missing', () => {
      const { container } = render(
        <ReactoryFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:permission': { read: ['admin'] } },
            formContext: fcWithService(null),
          })}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('skips permission resolution when formContext lacks reactory entirely', () => {
      // No reactory at all → resolver is not invoked. Field renders as unrestricted.
      render(
        <ReactoryFieldTemplate
          {...baseProps({
            uiSchema: { 'ui:permission': { read: ['admin'] } },
            formContext: {},
          })}
        />,
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('does not render data-readonly when neither rjsf nor permission says readonly', () => {
      const { container } = render(
        <ReactoryFieldTemplate
          {...baseProps({
            formContext: fcWithService(['user']),
          })}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.getAttribute('data-readonly')).toBeNull();
    });
  });
});
