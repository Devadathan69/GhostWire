import { useEffect, useRef, useState } from 'react';
import type { Role, Signal } from '@ghostwire/shared';
import { request, socket } from './session';

/** Only the boss offers. Generation IDs prevent late ICE from an old camera session. */
export function usePeerVideo(
  role: Role | undefined,
  code: string | undefined,
  stream: MediaStream | null,
  peerConnected: boolean,
  connected: boolean,
) {
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('Camera link idle');
  const [retry, setRetry] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!role || !code || !connected || !peerConnected) {
      setRemote(null);
      setStatus('Waiting for opponent');
      return;
    }
    let disposed = false,
      pc: RTCPeerConnection | null = null,
      generation = '',
      negotiating = false;
    let queue: RTCIceCandidateInit[] = [];
    let config: RTCConfiguration = {};
    const send = (signal: Signal) => {
      if (!disposed && socket.connected) socket.emit('webrtc:signal', signal);
    };
    function reset() {
      if (pc) {
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.onicecandidate = null;
        pc.close();
      }
      pc = null;
      queue = [];
      setRemote(null);
    }
    function peer() {
      const connection = new RTCPeerConnection(config);
      pc = connection;
      const gen = generation;
      connection.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'ice', generation: gen, candidate: e.candidate.toJSON() });
      };
      connection.ontrack = (e) => {
        const media = e.streams[0] || new MediaStream([e.track]);
        setRemote(media);
        e.track.onended = () => {
          if (!disposed && pc === connection) setRemote(null);
        };
        setStatus('Live camera connected');
      };
      connection.onconnectionstatechange = () => {
        if (disposed) return;
        if (connection.connectionState === 'connected') setStatus('Live camera connected');
        if (['failed', 'disconnected'].includes(connection.connectionState)) {
          setStatus('Camera link interrupted · retrying');
          setRemote(null);
          if (!retryRef.current)
            retryRef.current = setTimeout(() => {
              retryRef.current = null;
              if (!disposed) setRetry((n) => n + 1);
            }, 3500);
        }
      };
      return connection;
    }
    async function offer() {
      if (disposed || role !== 'boss' || !stream || negotiating) return;
      negotiating = true;
      try {
        reset();
        generation = crypto.randomUUID();
        const connection = peer();
        stream.getVideoTracks().forEach((track) => connection.addTrack(track, stream));
        const description = await connection.createOffer();
        if (disposed || pc !== connection) return;
        await connection.setLocalDescription(description);
        send({ type: 'offer', sdp: description.sdp, generation });
        setStatus('Connecting live camera…');
      } catch {
        if (!disposed) setStatus('Camera link unavailable · manual controls still work');
      } finally {
        negotiating = false;
      }
    }
    let chain = Promise.resolve();
    async function signal(message: Signal) {
      if (disposed) return;
      if (message.type === 'request') {
        await offer();
        return;
      }
      if (message.type === 'stop') {
        reset();
        setStatus('Opponent camera is off');
        return;
      }
      if (message.type === 'offer' && role === 'hero' && message.sdp) {
        reset();
        generation = message.generation || '';
        const connection = peer();
        await connection.setRemoteDescription({ type: 'offer', sdp: message.sdp });
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        send({ type: 'answer', sdp: answer.sdp, generation });
        setStatus('Connecting live camera…');
      } else if (message.generation === generation && pc) {
        if (
          message.type === 'answer' &&
          message.sdp &&
          role === 'boss' &&
          pc.signalingState === 'have-local-offer'
        ) {
          await pc.setRemoteDescription({ type: 'answer', sdp: message.sdp });
          for (const candidate of queue) await pc.addIceCandidate(candidate);
          queue = [];
        } else if (message.type === 'ice' && message.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(message.candidate);
          else queue.push(message.candidate);
        }
      }
    }
    const onSignal = (message: Signal) => {
      chain = chain
        .then(() => signal(message))
        .catch(() => {
          if (!disposed) setStatus('Camera link unavailable · retry camera link');
        });
    };
    const joined = () => {
      if (role === 'boss') void offer();
      else send({ type: 'request' });
    };
    void request<RTCConfiguration>('webrtc:config')
      .then((c) => {
        if (disposed) return;
        config = c;
        socket.on('webrtc:signal', onSignal);
        socket.on('peer:joined', joined);
        if (role === 'boss') {
          if (stream) void offer();
          else {
            send({ type: 'stop' });
            setStatus('Enable your camera to share the room');
          }
        } else {
          send({ type: 'request' });
          setStatus('Waiting for boss camera');
        }
      })
      .catch(() => {
        if (!disposed) setStatus('Camera configuration unavailable');
      });
    return () => {
      disposed = true;
      socket.off('webrtc:signal', onSignal);
      socket.off('peer:joined', joined);
      reset();
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = null;
      if (role === 'boss' && socket.connected) socket.emit('webrtc:signal', { type: 'stop' });
    };
  }, [role, code, stream, peerConnected, connected, retry]);
  return { remote, status, retry: () => setRetry((n) => n + 1) };
}
