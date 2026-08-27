import { createStreamingSession, openShell } from '../shellApi';

const reactory: any = {
  API_ROOT: 'http://localhost:4000',
  CLIENT_KEY: 'towerstone',
  CLIENT_PWD: 'sonicwasadog',
  getAuthToken: () => 'jwt-token',
};

describe('shellApi auth headers', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: 's', channelId: 'c', endpoint: 'http://x', expiresAt: '' }),
    });
    (global as any).fetch = fetchMock;
  });

  /**
   * The ReactoryClient middleware resolves the partner with
   * `validatePassword(x-client-pwd)` and answers 401 without it. It also caches
   * validated client keys for five minutes, so omitting the header fails only
   * intermittently — hence the explicit assertion.
   */
  it('sends the full client credential set, matching ReactoryApolloClient', async () => {
    await createStreamingSession(reactory, 'chat-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/reactor-chat/streaming/session',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          authorization: 'Bearer jwt-token',
          'x-client-key': 'towerstone',
          'x-client-pwd': 'sonicwasadog',
        },
        body: JSON.stringify({ channelId: 'chat-1' }),
      }),
    );
  });

  it('authenticates every shell route the same way', async () => {
    await openShell(reactory, { channelId: 'chat-1' });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-client-pwd']).toBe('sonicwasadog');
    expect(headers['x-client-key']).toBe('towerstone');
  });

  it('throws with the server status when the call is rejected', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => '{"error":"Credentials Invalid"}' });
    await expect(createStreamingSession(reactory, 'chat-1'))
      .rejects.toThrow(/createStreamingSession failed: 401/);
  });
});
