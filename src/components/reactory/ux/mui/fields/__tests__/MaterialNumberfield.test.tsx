import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MaterialNumberfield from '../MaterialNumberfield';

/**
 * The number field must recognise a value the user has entered - including
 * `0` - and must carry the field label into the notch so the outline can be
 * cut for it. Both are what keep the label from rendering over the value.
 */
const renderNumberField = (props: any = {}) => {
  const theme = createTheme();

  return render(
    <ThemeProvider theme={theme}>
      <MaterialNumberfield
        uiSchema={{}}
        schema={{ type: 'integer', title: 'Max Output Tokens' }}
        registry={{ widgets: {} }}
        onChange={() => {}}
        required={false}
        idSchema={{ $id: 'root_maxOutputTokens' }}
        {...props}
      />
    </ThemeProvider>
  );
};

const getInput = (container: HTMLElement): HTMLInputElement =>
  container.querySelector('input[type="number"]') as HTMLInputElement;

describe('MaterialNumberfield', () => {
  it('renders a numeric value that is present', () => {
    const { container } = renderNumberField({ formData: 2000 });

    expect(getInput(container).value).toBe('2000');
  });

  it('renders zero rather than treating it as empty', () => {
    const { container } = renderNumberField({ formData: 0 });

    expect(getInput(container).value).toBe('0');
  });

  it('carries the field label into the notch for the outline', () => {
    const { container } = renderNumberField({ formData: 2000 });

    const legendSpan = container.querySelector('fieldset legend span');
    expect(legendSpan?.textContent).toBe('Max Output Tokens');
  });

  it('parses integer input and reports it through onChange', () => {
    const onChange = jest.fn();
    const { container } = renderNumberField({ formData: undefined, onChange });

    fireEvent.change(getInput(container), { target: { value: '12' } });

    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('reports undefined when the input is cleared', () => {
    const onChange = jest.fn();
    const { container } = renderNumberField({ formData: 12, onChange });

    fireEvent.change(getInput(container), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
