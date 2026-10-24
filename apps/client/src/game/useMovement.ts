import { useCallback, useEffect, useRef } from 'react';
import type { Movement } from '@ghostwire/shared';

const neutral = (): Movement => ({ x: 0, z: 0, sprint: false });
export function useMovement(active: boolean, send: (movement: Movement) => void) {
  const keys = useRef(new Set<string>()),
    touch = useRef(neutral()),
    motion = useRef(neutral());
  const callbacks = useRef(send);
  callbacks.current = send;
  const onMotion = useCallback((value: Movement) => {
    motion.current = value;
  }, []);
  const onTouch = useCallback((value: Movement) => {
    touch.current = value;
  }, []);
  useEffect(() => {
    keys.current.clear();
    touch.current = neutral();
    motion.current = neutral();
    if (!active) {
      callbacks.current(neutral());
      return;
    }
    const movementKeys = [
      'w',
      'a',
      's',
      'd',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Shift',
    ];
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[role="dialog"]')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (movementKeys.includes(key)) {
        e.preventDefault();
        keys.current.add(key);
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    const release = () => {
      keys.current.clear();
      touch.current = neutral();
      motion.current = neutral();
      callbacks.current(neutral());
    };
    const visibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', visibility);
    let previous = '';
    const timer = setInterval(() => {
      const held = keys.current;
      const x =
        Number(held.has('d') || held.has('ArrowRight')) -
        Number(held.has('a') || held.has('ArrowLeft'));
      const z =
        Number(held.has('s') || held.has('ArrowDown')) -
        Number(held.has('w') || held.has('ArrowUp'));
      const input =
        x || z
          ? { x, z, sprint: held.has('Shift') }
          : touch.current.x || touch.current.z
            ? touch.current
            : motion.current;
      const length = Math.max(1, Math.hypot(input.x, input.z));
      const next = {
        x: input.x / length,
        z: input.z / length,
        sprint: input.sprint || held.has('Shift') || touch.current.sprint,
      };
      const signature = JSON.stringify(next);
      // Active movement refreshes the server's short dead-man timeout.
      if (signature !== previous || next.x || next.z) callbacks.current(next);
      previous = signature;
    }, 80);
    return () => {
      clearInterval(timer);
      release();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active]);
  return { onMotion, onTouch };
}
