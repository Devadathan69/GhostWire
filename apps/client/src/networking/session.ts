import { io } from 'socket.io-client';
import type {
  Ack,
  Action,
  BattleState,
  RoomReply,
  Session,
  Target,
  Movement,
  BattleSpec,
  BattleSnapshot,
} from '@ghostwire/shared';
import { heroView, restoreSnapshot } from '@ghostwire/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

export const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 700,
  reconnectionDelayMax: 2500,
});
class RequestError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}
export function request<T>(event: string, payload: unknown = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new RequestError('Connecting to the raid server. Try again in a moment.', true));
      return;
    }
    socket.timeout(7000).emit(event, payload, (error: Error | null, reply: Ack<T>) => {
      if (error)
        reject(new RequestError('The server took too long to respond. Please retry.', true));
      else if (!reply?.ok) reject(new RequestError(reply?.error || 'The request failed.'));
      else resolve(reply.data);
    });
  });
}
const storageKey = 'ghostwire-coop-session-v2';
export function useSession() {
  const [state, setState] = useState<BattleState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState('');
  const current = useRef<Session | null>(null);
  const blueprint = useRef<BattleSpec | null>(null);
  const sequence = useRef(0);
  const resumeVersion = useRef(0);
  const accept = useCallback((r: RoomReply) => {
    resumeVersion.current++;
    current.current = r.session;
    blueprint.current = r.state.spec;
    setSession(r.session);
    setState(heroView(r.state, r.session.playerId));
    setJoinUrl(r.joinUrl);
    setConnected(true);
    setNotice('');
    sequence.current = 0;
    sessionStorage.setItem(storageKey, JSON.stringify(r.session));
  }, []);
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      const version = ++resumeVersion.current;
      clearTimeout(retry);
      setConnected(false);
      try {
        const saved = current.current || JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (!saved) {
          setConnected(true);
          return;
        }
        const reply = await request<RoomReply>('room:resume', saved);
        if (version === resumeVersion.current && socket.connected) accept(reply);
      } catch (e) {
        if (version !== resumeVersion.current) return;
        if (e instanceof RequestError && e.retryable) {
          // A lost reply is not a rejected identity. Keep the private token and
          // retry while connected; the server still owns expiry and validity.
          setNotice('Connection interrupted. Recovering your hero…');
          retry = setTimeout(() => {
            if (version === resumeVersion.current && socket.connected) void connect();
          }, 1000);
          return;
        }
        sessionStorage.removeItem(storageKey);
        current.current = null;
        blueprint.current = null;
        setSession(null);
        setState(null);
        setConnected(socket.connected);
        setNotice((e as Error).message);
      }
    };
    const disconnect = () => {
      resumeVersion.current++;
      clearTimeout(retry);
      setConnected(false);
    };
    const closed = ({ reason }: { reason: string }) => {
      resumeVersion.current++;
      clearTimeout(retry);
      current.current = null;
      blueprint.current = null;
      setSession(null);
      setState(null);
      setNotice(reason);
      setConnected(socket.connected);
      sessionStorage.removeItem(storageKey);
    };
    socket.on('connect', connect);
    socket.on('disconnect', disconnect);
    const snapshot = (s: BattleSnapshot) => {
      if (s.code !== current.current?.code || !blueprint.current) return;
      setState(heroView(restoreSnapshot(s, blueprint.current), current.current.playerId));
    };
    socket.on('battle:snapshot', snapshot);
    socket.on('room:closed', closed);
    socket.connect();
    return () => {
      resumeVersion.current++;
      clearTimeout(retry);
      socket.off('connect', connect);
      socket.off('disconnect', disconnect);
      socket.off('battle:snapshot', snapshot);
      socket.off('room:closed', closed);
      socket.disconnect();
    };
  }, [accept]);
  const intent = useCallback((action: Action, target?: Target) => {
    if (!socket.connected || !current.current) return;
    socket.emit('gesture:intent', {
      action,
      sequence: ++sequence.current,
      ...(target ? { target } : {}),
    });
  }, []);
  const move = useCallback((movement: Movement) => {
    if (socket.connected && current.current) socket.volatile.emit('fighter:move', movement);
  }, []);
  const leave = useCallback(async () => {
    resumeVersion.current++;
    if (socket.connected) await request('room:leave').catch(() => {});
    current.current = null;
    blueprint.current = null;
    setConnected(socket.connected);
    setSession(null);
    setState(null);
    sessionStorage.removeItem(storageKey);
    history.replaceState(null, '', '/');
  }, []);
  return {
    state,
    session,
    joinUrl,
    connected,
    notice,
    setNotice,
    accept,
    intent,
    move,
    leave,
  };
}
