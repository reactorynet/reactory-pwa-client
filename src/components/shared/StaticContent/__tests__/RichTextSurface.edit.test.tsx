import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RichTextSurface from '../editor/RichTextSurface';
import ComponentSelectorDialog from '../ComponentSelectorDialog';
import { REACTORY_EMBED_CLASS } from '../editor/reactoryBlot';

const mockReactory: any = {
  muiTheme: { palette: { mode: 'light' } },
  getComponents: () => ({}),
  log: jest.fn(),
};

describe('Editing existing embedded Reactory component tags', () => {
  it('triggers onEditComponent callback when an embedded component chip is clicked', () => {
    let capturedTag = '';
    let updateFn: any = null;

    const initialContent =
      '<p>Intro</p><reactory reactory-component="core.Label@1.0.0" reactory-props-text="Initial Text" /><p>Outro</p>';

    const Host: React.FC = () => {
      const [val, setVal] = useState(initialContent);
      return (
        <RichTextSurface
          value={val}
          onChange={setVal}
          onEditComponent={(tag, onUpdate) => {
            capturedTag = tag;
            updateFn = onUpdate;
          }}
        />
      );
    };

    const { container } = render(<Host />);

    const chip = container.querySelector(`.${REACTORY_EMBED_CLASS}`);
    expect(chip).toBeInTheDocument();
    expect(chip?.textContent).toContain('core.Label@1.0.0');

    fireEvent.click(chip!);

    expect(capturedTag).toContain('core.Label@1.0.0');
    expect(capturedTag).toContain('Initial Text');
    expect(typeof updateFn).toBe('function');

    // Simulate update through callback
    act(() => {
      updateFn('<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Updated Text" />');
    });
    expect(chip?.getAttribute('data-reactory-tag')).toContain('Updated Text');
  });

  it('populates ComponentSelectorDialog with existing tag and props when editing', () => {
    const existingTag =
      '<reactory reactory-component="core.UserProfile@1.0.0" reactory-props-userId="user-123" reactory-props-active="bool:true" />';

    let submittedTag = '';

    render(
      <ComponentSelectorDialog
        open={true}
        initialTag={existingTag}
        onClose={jest.fn()}
        onInsert={(tag) => {
          submittedTag = tag;
        }}
        reactory={mockReactory}
      />
    );

    expect(screen.getByText('Edit Reactory Component Tag')).toBeInTheDocument();
    expect(screen.getByText('Update Component Tag')).toBeInTheDocument();

    const propNameInput = screen.getByDisplayValue('userId');
    expect(propNameInput).toBeInTheDocument();

    const propValueInput = screen.getByDisplayValue('user-123');
    expect(propValueInput).toBeInTheDocument();

    const boolPropInput = screen.getByDisplayValue('active');
    expect(boolPropInput).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update Component Tag'));
    expect(submittedTag).toContain('core.UserProfile@1.0.0');
    expect(submittedTag).toContain('user-123');
  });
});
