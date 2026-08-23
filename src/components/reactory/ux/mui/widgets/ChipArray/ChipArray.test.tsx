/**
 * Tests for the ChipArray widget's input stability.
 *
 * The add-item input used to be declared as a component inside the render body
 * and rendered as an element, so every keystroke gave it a new function
 * identity - React unmounted and remounted the subtree, destroying the input's
 * DOM node, caret and focus. Typing must only update local state; the form is
 * notified on Enter or on delete.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChipArray from './ChipArray';

const PLACEHOLDER = 'Add a role and press Enter...';

const setup = (onChange = jest.fn(), formData: string[] = ['USER']) => {
  const utils = render(
    <ChipArray
      formData={formData}
      schema={{ type: 'array', title: 'Allowed roles', items: { type: 'string' } }}
      uiSchema={{ 'ui:options': { showLabel: true, placeholder: PLACEHOLDER } }}
      onChange={onChange}
    />
  );
  return { ...utils, onChange };
};

describe('ChipArray', () => {
  it('keeps the same input node (and focus) while typing', () => {
    const { onChange } = setup();

    const input = screen.getByPlaceholderText(PLACEHOLDER);
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'D' } });
    fireEvent.change(input, { target: { value: 'DE' } });
    fireEvent.change(input, { target: { value: 'DEV' } });

    // Same DOM node across renders => the subtree was not remounted.
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue('DEV');
    // Typing must not push a change into the form.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits the item on Enter', () => {
    const { onChange } = setup();

    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: 'DEVELOPER' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['USER', 'DEVELOPER']);
  });

  it('does not commit on Shift+Enter', () => {
    const { onChange } = setup();

    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: 'DEVELOPER' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits a change when an item is deleted', () => {
    const { onChange, container } = setup(jest.fn(), ['USER', 'ADMIN']);

    const deleteIcons = container.querySelectorAll('.MuiChip-deleteIcon');
    expect(deleteIcons).toHaveLength(2);
    fireEvent.click(deleteIcons[0]);

    expect(onChange).toHaveBeenCalledWith(['ADMIN']);
  });

  it('renders the schema title when showLabel is opted into', () => {
    setup();
    expect(screen.getByText('Allowed roles')).toBeInTheDocument();
  });

  it('renders no label by default, preserving existing consumers', () => {
    render(
      <ChipArray
        formData={['USER']}
        schema={{ type: 'array', title: 'Allowed roles', items: { type: 'string' } }}
        uiSchema={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByText('Allowed roles')).not.toBeInTheDocument();
  });
});
