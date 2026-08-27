/**
 * Thin authenticated REST helpers for the shell subsystem.
 *
 * Output flows to the browser over SSE (`shell` events); these calls carry the
 * IN direction — creating the streaming channel, opening/killing a PTY, and
 * sending keystrokes/resize. Auth uses the user JWT + client key, matching the
 * idiom in ReactoryApolloClient.
 */

type ReactorySDK = Reactory.Client.ReactorySDK & {
  API_ROOT: string;
  CLIENT_KEY: string;
  CLIENT_PWD: string;
  getAuthToken: () => string | null;
};

/**
 * Auth headers for a REST call, matching ReactoryApolloClient exactly.
 *
 * `x-client-pwd` is not optional: the ReactoryClient middleware resolves the
 * partner with `validatePassword(clientPwd)` and answers 401 without it. It
 * keeps a five-minute cache of validated client keys, so a request missing the
 * header only appears to work while some other call (a GraphQL query) has
 * recently warmed that cache — which is exactly the kind of bug that shows up
 * as "works while I'm chatting, dead after a restart".
 */
function authHeaders(reactory: ReactorySDK): Record<string, string> {
  const token = reactory.getAuthToken?.();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    authorization: token ? `Bearer ${token}` : '',
    'x-client-key': reactory.CLIENT_KEY,
    'x-client-pwd': reactory.CLIENT_PWD,
  };
}

export interface CreateSessionResult {
  sessionId: string;
  channelId: string;
  endpoint: string;
  expiresAt: string;
}

export interface OpenShellResult {
  shellSessionId: string;
  pid: number;
  shell: string;
  cwd: string;
}

/** Create a dedicated streaming session and return its fully-authenticated SSE endpoint URL. */
export async function createStreamingSession(reactory: ReactorySDK, channelId: string): Promise<CreateSessionResult> {
  const res = await fetch(`${reactory.API_ROOT}/reactor-chat/streaming/session`, {
    method: 'POST',
    headers: authHeaders(reactory),
    body: JSON.stringify({ channelId }),
  });
  if (!res.ok) throw new Error(`createStreamingSession failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Open an interactive PTY on a channel. Output streams as `shell` events on that channel. */
export async function openShell(
  reactory: ReactorySDK,
  args: { channelId: string; shell?: string; cwd?: string; cols?: number; rows?: number },
): Promise<OpenShellResult> {
  const res = await fetch(`${reactory.API_ROOT}/reactor-chat/shell/session`, {
    method: 'POST',
    headers: authHeaders(reactory),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`openShell failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Write keystrokes / input to a PTY. */
export async function sendInput(reactory: ReactorySDK, shellSessionId: string, data: string): Promise<void> {
  await fetch(`${reactory.API_ROOT}/reactor-chat/shell/session/${shellSessionId}/input`, {
    method: 'POST',
    headers: authHeaders(reactory),
    body: JSON.stringify({ data }),
  });
}

/** Resize a PTY. */
export async function resizeShell(reactory: ReactorySDK, shellSessionId: string, cols: number, rows: number): Promise<void> {
  await fetch(`${reactory.API_ROOT}/reactor-chat/shell/session/${shellSessionId}/resize`, {
    method: 'POST',
    headers: authHeaders(reactory),
    body: JSON.stringify({ cols, rows }),
  });
}

/** Terminate a PTY. */
export async function closeShell(reactory: ReactorySDK, shellSessionId: string): Promise<void> {
  await fetch(`${reactory.API_ROOT}/reactor-chat/shell/session/${shellSessionId}`, {
    method: 'DELETE',
    headers: authHeaders(reactory),
  });
}

/** Shape of a `shell` SSE event payload (StreamingEvent.data). */
export interface ShellEventData {
  shellSessionId: string;
  phase: 'start' | 'stdout' | 'stderr' | 'exit';
  source: 'macro' | 'widget' | 'workflow';
  chunk?: string;
  command?: string;
  cwd?: string;
  pid?: number;
  exitCode?: number;
  timedOut?: boolean;
}
