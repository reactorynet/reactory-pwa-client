import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatTransferDialog from '../components/ChatTransferDialog';
import ChatHistoryPanel from '../components/ChatHistoryPanel';
import { mockMaterial, mockIl8n } from './mockMaterial';
import { ChatState } from '../types';

const personas = [
  { id: 'agentA', name: 'Agent A', description: 'The first agent', avatar: '' },
  { id: 'agentB', name: 'Agent B', description: 'The second agent', avatar: '' },
  { id: 'agentC', name: 'Agent C', description: 'The third agent', avatar: '' },
] as any;

const baseChat: ChatState = {
  id: 'chat-1',
  personaId: 'agentA',
  botId: 'agentA',
  title: 'Auth token refresh',
  history: [{ role: 'user', content: 'hi' } as any],
  created: new Date('2026-09-13T00:00:00Z'),
} as any;

describe('ChatTransferDialog', () => {
  const renderDialog = (props: Partial<React.ComponentProps<typeof ChatTransferDialog>> = {}) => {
    const onTransfer = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    render(
      <ChatTransferDialog
        open
        personas={personas}
        currentPersonaId="agentA"
        onClose={onClose}
        onTransfer={onTransfer}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...props}
      />
    );
    return { onTransfer, onClose };
  };

  it('excludes the current agent from the transfer targets', () => {
    renderDialog();

    expect(screen.getByText('Agent B')).toBeTruthy();
    expect(screen.getByText('Agent C')).toBeTruthy();
    expect(screen.queryByText('Agent A')).toBeNull();
  });

  it('transfers to the selected agent', async () => {
    const { onTransfer } = renderDialog();

    fireEvent.click(screen.getByText('Agent B'));
    fireEvent.click(screen.getByText('Transfer'));

    await waitFor(() => expect(onTransfer).toHaveBeenCalledTimes(1));
    expect(onTransfer).toHaveBeenCalledWith('agentB');
  });

  it('does not transfer until an agent is selected', () => {
    const { onTransfer } = renderDialog();

    fireEvent.click(screen.getByText('Transfer'));

    expect(onTransfer).not.toHaveBeenCalled();
  });

  it('surfaces transfer failures inline', async () => {
    const onTransfer = jest.fn().mockRejectedValue(new Error('transfer rejected'));
    renderDialog({ onTransfer });

    fireEvent.click(screen.getByText('Agent C'));
    fireEvent.click(screen.getByText('Transfer'));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('transfer rejected');
  });

  it('explains when there is no other agent to transfer to', () => {
    renderDialog({ personas: [personas[0]] });

    expect(screen.getByText(/no other agents available/i)).toBeTruthy();
  });
});

describe('ChatHistoryPanel transfer affordance', () => {
  const renderPanel = (props: any = {}) => {
    const onTransferChat = jest.fn();
    render(
      <ChatHistoryPanel
        open
        onClose={jest.fn()}
        chats={[baseChat]}
        chatState={baseChat}
        getPersona={() => null}
        onChatSelect={jest.fn()}
        onDeleteChat={jest.fn()}
        onTransferChat={onTransferChat}
        Material={mockMaterial}
        il8n={mockIl8n}
        {...props}
      />
    );
    return { onTransferChat };
  };

  it('invokes onTransferChat from the preview pane', () => {
    const { onTransferChat } = renderPanel();

    fireEvent.click(screen.getByText('Transfer'));

    expect(onTransferChat).toHaveBeenCalledTimes(1);
    expect(onTransferChat.mock.calls[0][0].id).toBe('chat-1');
  });

  it('omits the transfer affordance when not provided', () => {
    renderPanel({ onTransferChat: undefined });

    expect(screen.queryByText('Transfer')).toBeNull();
  });
});
