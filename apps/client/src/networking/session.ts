import { io } from 'socket.io-client';
import type { Ack, Action, BattleState, RoomReply, Session, Target } from '@ghostwire/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

export const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 700,
  reconnectionDelayMax: 2500,
});
export function request<T>(event: string, payload: unknown = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('Connecting to the raid server. Try again in a moment.'));
      return;
    }
    socket.timeout(7000).emit(event, payload, (error: Error | null, reply: Ack<T>) => {
      if (error) reject(new Error('The server took too long to respond. Please retry.'));
      else if (!reply?.ok) reject(new Error(reply?.error || 'The request failed.'));
      else resolve(reply.data);
    });
  });
}
const storageKey = 'ghostwire-session-v1';
export function useSession() {
  const [state, setState] = useState<BattleState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState('');
  const current = useRef<Session | null>(null);
  const sequence = useRef(0);
  const accept = useCallback((r: RoomReply) => {
    current.current = r.session;
    setSession(r.session);
    setState(r.state);
    setJoinUrl(r.joinUrl);
    sequence.current = 0;
    sessionStorage.setItem(storageKey, JSON.stringify(r.session));
  }, []);
  useEffect(() => {
    const connect = async () => {
      setConnected(true);
      try {
        const saved = current.current || JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (saved) accept(await request<RoomReply>('room:resume', saved));
      } catch (e) {
        sessionStorage.removeItem(storageKey);
        current.current = null;
        setSession(null);
        setState(null);
        setNotice((e as Error).message);
      }
    };
    const disconnect = () => setConnected(false);
    const closed = ({ reason }: { reason: string }) => {
      current.current = null;
      setSession(null);
      setState(null);
      setNotice(reason);
      sessionStorage.removeItem(storageKey);
    };
    socket.on('connect', connect);
    socket.on('disconnect', disconnect);
    socket.on('battle:snapshot', setState);
    socket.on('room:closed', closed);
    socket.connect();
    return () => {
      socket.off('connect', connect);
      socket.off('disconnect', disconnect);
      socket.off('battle:snapshot', setState);
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
  const aim = useCallback((target: Target) => {
    if (socket.connected && current.current?.role === 'boss')
      socket.volatile.emit('boss:target', target);
  }, []);
  const leave = useCallback(async () => {
    if (socket.connected) await request('room:leave').catch(() => {});
    current.current = null;
    setSession(null);
    setState(null);
    sessionStorage.removeItem(storageKey);
    history.replaceState(null, '', '/');
  }, []);
  return { state, session, joinUrl, connected, notice, setNotice, accept, intent, aim, leave };
}
