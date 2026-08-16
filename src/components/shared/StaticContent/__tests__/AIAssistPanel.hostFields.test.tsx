import React from 'react';
import { render, screen } from '@testing-library/react';
import AIAssistPanel from '../panels/AIAssistPanel';
import { HostEditableField } from '@reactory/client-core/components/shared/ReactorChat/types';

/**
 * The panel is the seam between the content editor and the chat: it hands the
 * agent the list of fields it may write and the handler that applies those
 * writes.
 *
 * The panel is memoised so the assistant stays off the editor's keystroke
 * path, which means the props it receives have to keep a stable identity. A
 * live field array would defeat that, so an accessor is supported and is what
 * the editor uses.
 */

let received: any = null;
let chatRenders = 0;

const StubReactorChat: React.FC<any> = (props) => {
  chatRenders += 1;
  received = props;
  return <div data-testid="reactor-chat" />;
};

const reactory: any = {
  getComponents: () => ({ ReactorChat: StubReactorChat }),
  log: jest.fn(),
};

const FIELDS: HostEditableField[] = [
  { key: 'content', description: 'The body', type: 'string', value: '# Hi' },
];

const baseProps = {
  reactory,
  content: '# Hi',
  format: 'markdown' as const,
  title: 'T',
  currentLang: 'en',
  intent: 'improve' as const,
  onApply: jest.fn(),
  onClose: jest.fn(),
};

describe('AIAssistPanel host field wiring', () => {
  beforeEach(() => {
    received = null;
    chatRenders = 0;
  });

  it('passes the field list and change handler to the chat', () => {
    const onFieldChange = jest.fn();
    render(
      <AIAssistPanel {...baseProps} open editableFields={FIELDS} onFieldChange={onFieldChange} />
    );

    expect(screen.getByTestId('reactor-chat')).toBeInTheDocument();
    expect(received.editableFields).toBe(FIELDS);
    expect(received.onChange).toBe(onFieldChange);
  });

  it('passes an accessor through unchanged, so hosts can keep identity stable', () => {
    const getFields = () => FIELDS;
    render(<AIAssistPanel {...baseProps} open editableFields={getFields} onFieldChange={jest.fn()} />);

    expect(received.editableFields).toBe(getFields);
    expect(typeof received.editableFields).toBe('function');
    expect(received.editableFields()).toBe(FIELDS);
  });

  it('omits the binding when the host supplies no handler', () => {
    render(<AIAssistPanel {...baseProps} open />);
    expect(received.onChange).toBeUndefined();
  });

  it('scopes the conversation to the content use case', () => {
    render(<AIAssistPanel {...baseProps} open contentSlug="about-reactory" />);

    // Content assistance is a fresh request about the document in front of the
    // author, not a continuation of an unrelated standalone conversation.
    expect(received.useCase).toBe('content');
  });

  it('attaches the content slug as an edge so the chat is findable again', () => {
    render(<AIAssistPanel {...baseProps} open contentSlug="about-reactory" />);

    expect(received.edges).toEqual([
      { name: 'slug', value: 'about-reactory', edge_type: 'content' },
    ]);
  });

  it('carries no edges when the content has no slug yet', () => {
    render(<AIAssistPanel {...baseProps} open />);
    expect(received.edges).toEqual([]);
  });

  it('does not re-render the chat when the host re-renders with a stable accessor', () => {
    const getFields = () => FIELDS;
    const onFieldChange = jest.fn();
    const props = { ...baseProps, open: true, editableFields: getFields, onFieldChange };

    const { rerender } = render(<AIAssistPanel {...props} />);
    const afterMount = chatRenders;

    for (let i = 0; i < 20; i += 1) {
      rerender(<AIAssistPanel {...props} />);
    }

    // This is what the accessor buys: the agent still reads current values,
    // but typing in the editor does not re-render the assistant.
    expect(chatRenders).toBe(afterMount);
  });
});
