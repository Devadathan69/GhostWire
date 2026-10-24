import { useCallback, useEffect, useRef, useState } from 'react';
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const active = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    active.current?.getTracks().forEach((t) => t.stop());
    active.current = null;
    setStream(null);
    setLoading(false);
  }, []);
  const start = useCallback(async () => {
    const id = ++generation.current;
    setError('');
    setLoading(true);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera needs HTTPS or localhost. Manual controls are ready to use.');
      setLoading(false);
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        },
      });
      if (id !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      active.current?.getTracks().forEach((t) => t.stop());
      active.current = media;
      setStream(media);
      media.getVideoTracks()[0].onended = () => {
        stop();
        setError('Camera stopped. You can re-enable it or use manual controls.');
      };
    } catch (e) {
      if (id === generation.current)
        setError(
          (e as DOMException).name === 'NotAllowedError'
            ? 'Camera permission was declined. Allow it in browser settings to retry, or use manual controls.'
            : (e as DOMException).name === 'NotFoundError'
              ? 'No camera found. Keyboard and touch controls are available.'
              : 'Camera could not start. Close other camera apps and retry.',
        );
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [stop]);
  useEffect(
    () => () => {
      generation.current++;
      active.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  return { stream, error, loading, start, stop };
}
