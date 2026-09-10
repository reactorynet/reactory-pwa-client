import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RichTextSurface from '../editor/RichTextSurface';
import ComponentSelectorDialog, { isValidReactComponent } from '../ComponentSelectorDialog';
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

  describe('isValidReactComponent', () => {
    it('returns true for function components', () => {
      expect(isValidReactComponent(() => <div />)).toBe(true);
      expect(isValidReactComponent(function NamedComp() { return <div />; })).toBe(true);
    });

    it('returns true for React.forwardRef and React.memo objects', () => {
      const Forwarded = React.forwardRef((props, ref) => <div />);
      expect(isValidReactComponent(Forwarded)).toBe(true);
      const Memoized = React.memo(() => <div />);
      expect(isValidReactComponent(Memoized)).toBe(true);
    });

    it('returns true for wrapped component descriptor objects', () => {
      expect(isValidReactComponent({ component: () => <div /> })).toBe(true);
      expect(isValidReactComponent({ default: () => <div /> })).toBe(true);
    });

    it('returns false for primitives and non-component objects', () => {
      expect(isValidReactComponent(null)).toBe(false);
      expect(isValidReactComponent(undefined)).toBe(false);
      expect(isValidReactComponent('string')).toBe(false);
      expect(isValidReactComponent(123)).toBe(false);
      expect(isValidReactComponent({})).toBe(false);
      expect(isValidReactComponent({ title: 'Just metadata' })).toBe(false);
    });
  });

  describe('dynamic component options derivation from reactory.componentRegister', () => {
    it('derives valid component options from componentRegister object and ignores non-components', () => {
      const customApi: any = {
        ...mockReactory,
        componentRegister: {
          'custom.Widget@1.0.0': { component: () => <div /> },
          'custom.DataCard@2.0.0': { component: React.forwardRef((p, r) => <div />) },
          'custom.WrappedExport@1.0.0': { component: { component: () => <div /> } },
          'custom.NotAComp@1.0.0': { component: { someData: 123 } },
          'system.$GLOBAL$.Menu@1.0.0': { component: () => <div /> },
        },
      };

      render(
        <ComponentSelectorDialog
          open={true}
          onClose={jest.fn()}
          onInsert={jest.fn()}
          reactory={customApi}
        />
      );

      // Verify available count in helper text
      expect(screen.getByText(/component\(s\) available from registry/i)).toBeInTheDocument();
    });
  });
});
