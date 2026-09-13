import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatDataEditorDialog, { parseTags } from '../components/ChatDataEditorDialog';
import ChatHistoryPanel from '../components/ChatHistoryPanel';
import { mockMaterial, mockIl8n } from './mockMaterial';
import { ChatState } from '../types';

const baseChat: ChatState = {
  id: 'chat-1',
  personaId: 'ReactorAIPersona',
  botId: 'ReactorAIPersona',
  title: 'Auth token refresh',
  summary: 'Fixing the refresh-token race in the auth service.',
  tags: ['auth', 'bugfix'],
  icon: 'pending',
  color: '#f9a825',
  history: [{ role: 'user', content: 'hi' } as any],
  created: new Date('2026-09-13T00:00:00Z'),
} as any;

describe('parseTags', () => {
  it('splits, trims, drops blanks and de-duplicates', () => {
    expect(parseTags('a, b , a ,, c')).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array for empty input', () => {
    expect(parseTags('')).toEqual([]);
  });
});

describe('ChatDataEditorDialog', () => {
  const renderDialog = (props: Partial<React.ComponentProps<typeof ChatDataEditorDialog>> = {}) => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const utils = render(
      <ChatDataEditorDialog
        open
        chat={baseChat}
        onClose={onClose}
        onSave={onSave}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...props}
      />
    );
    return { ...utils, onSave, onClose };
  };

  it('seeds the form from the conversation', () => {
    renderDialog();

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Auth token refresh');
    expect((screen.getByLabelText('Summary') as HTMLInputElement).value).toBe(
      'Fixing the refresh-token race in the auth service.'
    );
    expect((screen.getByLabelText('Tags') as HTMLInputElement).value).toBe('auth, bugfix');
    expect((screen.getByLabelText('Status icon') as HTMLInputElement).value).toBe('pending');
    expect((screen.getByLabelText('Colour') as HTMLInputElement).value).toBe('#f9a825');
  });

  it('saves the edited fields', async () => {
    const { onSave } = renderDialog();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Renamed conversation' },
    });
    fireEvent.change(screen.getByLabelText('Tags'), {
      target: { value: 'auth, race-condition' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Renamed conversation',
      summary: 'Fixing the refresh-token race in the auth service.',
      tags: ['auth', 'race-condition'],
      icon: 'pending',
      color: '#f9a825',
    });
  });

  it('applies a status preset to the icon and colour', async () => {
    const { onSave } = renderDialog();

    fireEvent.click(screen.getByText('Complete'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'check_circle', color: '#2e7d32' }),
    );
  });

  it('clears the status when the active preset is clicked again', async () => {
    const { onSave } = renderDialog();

    // 'In progress' is already active (pending / #f9a825).
    fireEvent.click(screen.getByText('In progress'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];
    expect(payload.icon).toBeUndefined();
    expect(payload.color).toBeUndefined();
  });

  it('surfaces save errors and keeps the dialog open', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('not authorised'));
    renderDialog({ onSave });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('not authorised');
  });

  it('does not save when the conversation id is missing', async () => {
    const onSave = jest.fn();
    renderDialog({ chat: { ...baseChat, id: undefined } as any, onSave });

    fireEvent.click(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ChatHistoryPanel edit affordances', () => {
  const renderPanel = (props: any = {}) => {
    const onEditChat = jest.fn();
    render(
      <ChatHistoryPanel
        open
        onClose={jest.fn()}
        chats={[baseChat]}
        chatState={baseChat}
        getPersona={() => null}
        onChatSelect={jest.fn()}
        onDeleteChat={jest.fn()}
        onEditChat={onEditChat}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...props}
      />
    );
    return { onEditChat };
  };

  it('invokes onEditChat from the row edit button', () => {
    const { onEditChat } = renderPanel();

    fireEvent.click(screen.getByLabelText('Edit conversation details'));

    expect(onEditChat).toHaveBeenCalledTimes(1);
    expect(onEditChat.mock.calls[0][0].id).toBe('chat-1');
  });

  it('invokes onEditChat from the preview pane button', () => {
    const { onEditChat } = renderPanel();

    fireEvent.click(screen.getByText('Edit details'));

    expect(onEditChat).toHaveBeenCalledTimes(1);
    expect(onEditChat.mock.calls[0][0].id).toBe('chat-1');
  });

  it('omits edit affordances when onEditChat is not provided', () => {
    renderPanel({ onEditChat: undefined });

    expect(screen.queryByLabelText('Edit conversation details')).toBeNull();
    expect(screen.queryByText('Edit details')).toBeNull();
  });
});
