import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {
  AuthUser,
  AuthUserResponse,
  BroadcastChatHistoryResponse,
  BroadcastChatMessage,
  BroadcastChatMessageResponse,
  BroadcastState,
} from '@digistream/contracts';
import {
  ApiClientError,
  apiRequest,
  jsonBody,
  realtimeEndpoint,
} from '../../lib/api-client';
import './broadcast-chat.css';

type BroadcastChatProps = {
  organisationId: string;
  broadcastId: string;
  messagesPath: string;
  variant?: 'listener' | 'creator';
};

type RealtimeState =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'recovering';

type HistoryState = 'idle' | 'loading' | 'ready' | 'unavailable';

type RealtimeEvent = {
  type?: unknown;
  room?: { kind?: unknown; id?: unknown };
  message?: BroadcastChatMessage;
  error?: { code?: unknown; message?: unknown };
};

const REALTIME_PROTOCOL = 'digistream.realtime.v1';
const MAX_MESSAGE_LENGTH = 1000;
const REALTIME_CHAT_STATES = new Set<BroadcastState>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
]);

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Live chat could not complete that request.';
}

function canRetryHistory(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return true;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

function historyUnavailableMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'CHAT_NOT_AVAILABLE') {
    return 'This live chat is not available for this broadcast.';
  }
  if (error instanceof ApiClientError && error.status === 403) {
    return 'This live chat is not available to this account.';
  }
  return readableError(error);
}

function readOnlyMessage(status: BroadcastState | null): string {
  if (status === 'scheduled') return 'Chat opens when the broadcast starts.';
  if (status === 'completed') return 'This broadcast has ended. Chat history is read-only.';
  if (status === 'ending') return 'This broadcast is ending. Chat is now read-only.';
  if (status === 'starting') return 'Chat will open when the broadcast is ready.';
  return 'Chat is read-only right now.';
}

function clientMessageId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function mergeMessages(
  current: BroadcastChatMessage[],
  incoming: BroadcastChatMessage[],
): BroadcastChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => {
    const timeDifference =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return timeDifference || left.id.localeCompare(right.id);
  });
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function realtimeLabel(state: RealtimeState): string {
  if (state === 'connected') return 'Live updates connected';
  if (state === 'connecting') return 'Connecting live updates';
  if (state === 'recovering') return 'Recovering missed messages';
  return 'History mode';
}

function statusLabel(status: BroadcastState | null, historyState: HistoryState): string {
  if (historyState === 'loading' || historyState === 'idle') return 'Loading';
  if (historyState === 'unavailable') return 'Chat unavailable';
  if (!status) return 'Chat';
  if (status === 'completed') return 'Chat history';
  if (status === 'scheduled') return 'Opens when broadcast starts';
  if (status === 'starting') return 'Opening chat';
  if (status === 'reconnecting') return 'Broadcast reconnecting';
  if (status === 'ending') return 'Broadcast ending';
  return status;
}

export function BroadcastChat({
  organisationId,
  broadcastId,
  messagesPath,
  variant = 'listener',
}: BroadcastChatProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [messages, setMessages] = useState<BroadcastChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<BroadcastState | null>(null);
  const [draft, setDraft] = useState('');
  const [historyState, setHistoryState] = useState<HistoryState>('idle');
  const [historyError, setHistoryError] = useState('');
  const [historyRetryable, setHistoryRetryable] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeState, setRealtimeState] = useState<RealtimeState>('offline');
  const [realtimeNotice, setRealtimeNotice] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const userRef = useRef<AuthUser | null>(null);
  const nextCursorRef = useRef<string | null>(null);

  const roomRequest = useMemo(
    () => ({
      kind: 'broadcast' as const,
      id: broadcastId,
      organisationId,
    }),
    [broadcastId, organisationId],
  );

  const appendMessage = useCallback(
    (message: BroadcastChatMessage) => {
      if (message.broadcastId !== broadcastId) return;
      setMessages((current) => mergeMessages(current, [message]));
    },
    [broadcastId],
  );

  const applyHistory = useCallback(
    (response: BroadcastChatHistoryResponse, mode: 'initial' | 'latest' | 'older') => {
      setMessages((current) =>
        mode === 'initial' ? response.messages : mergeMessages(current, response.messages),
      );
      setCanSend(response.chat.canSend);
      setBroadcastStatus(response.chat.status);
      if (mode !== 'latest' || nextCursorRef.current === null) {
        nextCursorRef.current = response.pageInfo.nextCursor;
        setNextCursor(response.pageInfo.nextCursor);
        setHasMore(response.pageInfo.hasMore);
      }
    },
    [],
  );

  const loadLatest = useCallback(
    async (mode: 'initial' | 'latest' = 'latest') => {
      if (!userRef.current) return;
      if (mode === 'initial') {
        setHistoryState('loading');
        setHistoryError('');
        setHistoryRetryable(false);
      }
      try {
        const separator = messagesPath.includes('?') ? '&' : '?';
        const response = await apiRequest<BroadcastChatHistoryResponse>(
          `${messagesPath}${separator}limit=50`,
        );
        if (mountedRef.current) {
          applyHistory(response, mode);
          setHistoryState('ready');
          setHistoryError('');
          setHistoryRetryable(false);
          setError('');
        }
      } catch (requestError) {
        if (requestError instanceof ApiClientError && requestError.status === 401) {
          userRef.current = null;
          setUser(null);
          setAuthError('Your session ended. Sign in again to continue chatting.');
        } else if (mountedRef.current && mode === 'initial') {
          setCanSend(false);
          setBroadcastStatus(null);
          setHistoryState('unavailable');
          setHistoryError(historyUnavailableMessage(requestError));
          setHistoryRetryable(canRetryHistory(requestError));
        } else if (mountedRef.current) {
          setError(readableError(requestError));
        }
      }
    },
    [applyHistory, messagesPath],
  );

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder || historyState !== 'ready') return;
    setLoadingOlder(true);
    try {
      const separator = messagesPath.includes('?') ? '&' : '?';
      const response = await apiRequest<BroadcastChatHistoryResponse>(
        `${messagesPath}${separator}limit=50&before=${encodeURIComponent(nextCursor)}`,
      );
      if (mountedRef.current) {
        applyHistory(response, 'older');
        setError('');
      }
    } catch (requestError) {
      if (mountedRef.current) setError(readableError(requestError));
    } finally {
      if (mountedRef.current) setLoadingOlder(false);
    }
  }, [applyHistory, historyState, loadingOlder, messagesPath, nextCursor]);

  useEffect(() => {
    mountedRef.current = true;
    setCheckingSession(true);
    setAuthError('');
    void apiRequest<AuthUserResponse>('/api/v1/auth/me')
      .then((response) => {
        userRef.current = response.user;
        setUser(response.user);
      })
      .catch((requestError) => {
        userRef.current = null;
        setUser(null);
        if (!(requestError instanceof ApiClientError) || requestError.status !== 401) {
          setAuthError(readableError(requestError));
        }
      })
      .finally(() => {
        if (mountedRef.current) setCheckingSession(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    userRef.current = user;
    nextCursorRef.current = null;
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setCanSend(false);
    setBroadcastStatus(null);
    setHistoryState(user ? 'loading' : 'idle');
    setHistoryError('');
    setHistoryRetryable(false);
    setRealtimeNotice('');
    setError('');
    if (user) void loadLatest('initial');
  }, [broadcastId, loadLatest, messagesPath, user]);

  useEffect(() => {
    if (
      !user ||
      historyState !== 'ready' ||
      !broadcastStatus ||
      !REALTIME_CHAT_STATES.has(broadcastStatus)
    ) {
      setRealtimeState('offline');
      return;
    }
    let stopped = false;
    let reconnectAttempt = 0;
    let roomDenied = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (stopped || roomDenied || !userRef.current) return;
      clearReconnectTimer();
      setRealtimeState(reconnectAttempt > 0 ? 'recovering' : 'connecting');
      const socket = new WebSocket(realtimeEndpoint(), REALTIME_PROTOCOL);
      socketRef.current = socket;

      socket.addEventListener('message', (event) => {
        let message: RealtimeEvent;
        try {
          message = JSON.parse(String(event.data)) as RealtimeEvent;
        } catch {
          return;
        }

        if (message.type === 'realtime.connected') {
          socket.send(
            JSON.stringify({
              type: 'join',
              requestId: `chat-${broadcastId}`,
              room: roomRequest,
            }),
          );
          return;
        }
        if (
          message.type === 'room.joined' &&
          message.room?.kind === 'broadcast' &&
          message.room.id === broadcastId
        ) {
          reconnectAttempt = 0;
          setRealtimeState('connected');
          setRealtimeNotice('');
          void loadLatest('latest');
          return;
        }
        if (
          message.type === 'realtime.error' &&
          message.error?.code === 'REALTIME_ROOM_NOT_AVAILABLE'
        ) {
          roomDenied = true;
          setRealtimeState('offline');
          setRealtimeNotice('Live updates are unavailable. Stored chat history remains available.');
          socket.close(1000);
          return;
        }
        if (message.type === 'chat.message.created' && message.message) {
          appendMessage(message.message);
          return;
        }
        if (message.type === 'realtime.session-ended') {
          userRef.current = null;
          setUser(null);
          setRealtimeState('offline');
          setAuthError('Your session ended. Sign in again to continue chatting.');
          socket.close();
        }
      });

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (stopped || roomDenied || !userRef.current) {
          setRealtimeState('offline');
          return;
        }
        reconnectAttempt += 1;
        setRealtimeState('recovering');
        const delay = Math.min(10_000, 750 * 2 ** Math.min(4, reconnectAttempt));
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      });

      socket.addEventListener('error', () => socket.close());
    };

    connect();
    const recoveryPoll = window.setInterval(() => void loadLatest('latest'), 15_000);

    return () => {
      stopped = true;
      clearReconnectTimer();
      window.clearInterval(recoveryPoll);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000);
      setRealtimeState('offline');
    };
  }, [appendMessage, broadcastId, broadcastStatus, historyState, loadLatest, roomRequest, user]);

  useEffect(() => {
    if (!messages.length) return;
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    try {
      const response = await apiRequest<AuthUserResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      });
      userRef.current = response.user;
      setUser(response.user);
      setPassword('');
    } catch (requestError) {
      setAuthError(readableError(requestError));
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !canSend || historyState !== 'ready') return;
    setSending(true);
    setError('');
    try {
      const response = await apiRequest<BroadcastChatMessageResponse>(messagesPath, {
        method: 'POST',
        body: jsonBody({ clientMessageId: clientMessageId(), body }),
      });
      appendMessage(response.message);
      setDraft('');
    } catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.code === 'CHAT_READ_ONLY') {
        setCanSend(false);
      }
      if (requestError instanceof ApiClientError && requestError.status === 401) {
        userRef.current = null;
        setUser(null);
        setAuthError('Your session ended. Sign in again to continue chatting.');
      } else {
        setError(readableError(requestError));
      }
    } finally {
      setSending(false);
    }
  }

  const recoveringHistory = historyState === 'ready' && realtimeState === 'recovering';
  const showEmptyState = historyState === 'ready' && !recoveringHistory && canSend && messages.length === 0;
  const showReadOnlyState = historyState === 'ready' && !recoveringHistory && !canSend;
  const showMessages = historyState === 'ready' && messages.length > 0;

  return (
    <section className={`broadcast-chat broadcast-chat-${variant}`}>
      <header className="broadcast-chat-header">
        <div>
          <span className="broadcast-chat-eyebrow">Live conversation</span>
          <h2>Broadcast chat</h2>
        </div>
        <div className="broadcast-chat-state">
          <span className={`broadcast-chat-dot ${historyState === 'ready' ? realtimeState : 'offline'}`} />
          <strong>{statusLabel(broadcastStatus, historyState)}</strong>
          {historyState === 'ready' ? <small>{realtimeLabel(realtimeState)}</small> : null}
        </div>
      </header>

      {checkingSession ? (
        <div className="broadcast-chat-empty">Checking your DigiStream session…</div>
      ) : !user ? (
        <form className="broadcast-chat-login" onSubmit={signIn}>
          <div>
            <strong>Sign in to join the conversation</strong>
            <p>Playback can remain public, while chat uses a revocable DigiStream account session.</p>
          </div>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {authError ? <div className="broadcast-chat-error" role="alert">{authError}</div> : null}
          <button type="submit">Sign in to chat</button>
        </form>
      ) : historyState === 'loading' || historyState === 'idle' ? (
        <div className="broadcast-chat-empty">Loading chat history…</div>
      ) : historyState === 'unavailable' ? (
        <div className="broadcast-chat-empty" role="status">
          <strong>Chat unavailable</strong>
          <span>{historyError}</span>
          {historyRetryable ? (
            <button onClick={() => void loadLatest('initial')} type="button">Try again</button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="broadcast-chat-history" role="log" aria-live="polite">
            {hasMore && !recoveringHistory ? (
              <button
                className="broadcast-chat-older"
                disabled={loadingOlder}
                onClick={() => void loadOlder()}
                type="button"
              >
                {loadingOlder ? 'Loading…' : 'Load older messages'}
              </button>
            ) : null}

            {recoveringHistory ? (
              <div className="broadcast-chat-empty" role="status">
                <strong>Recovering missed messages…</strong>
                <span>DigiStream is reconnecting live updates and checking stored history.</span>
              </div>
            ) : showReadOnlyState && messages.length === 0 ? (
              <div className="broadcast-chat-empty" role="status">
                <strong>Chat is read-only</strong>
                <span>{readOnlyMessage(broadcastStatus)}</span>
              </div>
            ) : showEmptyState ? (
              <div className="broadcast-chat-empty">
                <strong>No messages yet.</strong>
                <span>The first committed message will appear here on every connected screen.</span>
              </div>
            ) : null}

            {showMessages ? messages.map((message) => (
              <article
                className={message.author.id === user.id ? 'broadcast-chat-message own' : 'broadcast-chat-message'}
                key={message.id}
              >
                <div className="broadcast-chat-message-meta">
                  <strong>{message.author.displayName}</strong>
                  <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                </div>
                <p>{message.body}</p>
              </article>
            )) : null}
            <div ref={messagesEndRef} />
          </div>

          {realtimeNotice ? <div className="broadcast-chat-empty" role="status">{realtimeNotice}</div> : null}
          {error ? <div className="broadcast-chat-error" role="alert">{error}</div> : null}

          {canSend && !recoveringHistory ? (
            <form className="broadcast-chat-composer" onSubmit={sendMessage}>
              <label>
                <span className="sr-only">Chat message</span>
                <textarea
                  disabled={sending}
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message…"
                  rows={2}
                  value={draft}
                />
              </label>
              <div>
                <small>{draft.length}/{MAX_MESSAGE_LENGTH}</small>
                <button disabled={sending || !draft.trim()} type="submit">
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          ) : showReadOnlyState && messages.length > 0 ? (
            <div className="broadcast-chat-empty" role="status">
              <strong>Chat is read-only</strong>
              <span>{readOnlyMessage(broadcastStatus)}</span>
            </div>
          ) : null}

          <footer className="broadcast-chat-footer">
            <span>Signed in as {user.displayName}</span>
            <span>Messages are stored before live delivery.</span>
          </footer>
        </>
      )}
    </section>
  );
}
