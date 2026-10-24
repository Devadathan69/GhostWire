import { useEffect, useRef, useState } from 'react';
import type { Movement } from '@ghostwire/shared';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints } from 'lucide-react';

export function MovementPad({
  disabled,
  onMove,
  onStep,
}: {
  disabled: boolean;
  onMove: (value: Movement) => void;
  onStep: (action: 'left' | 'right' | 'forward' | 'back') => void;
}) {
  const [sprint, setSprint] = useState(false),
    [stick, setStick] = useState({ x: 0, z: 0 });
  const pointer = useRef<number | null>(null);
  useEffect(() => {
    if (disabled) {
      pointer.current = null;
      setStick({ x: 0, z: 0 });
      setSprint(false);
      onMove({ x: 0, z: 0, sprint: false });
    }
  }, [disabled, onMove]);
  const update = (element: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    const rawX = (clientX - rect.left - rect.width / 2) / (rect.width * 0.35),
      rawZ = (clientY - rect.top - rect.height / 2) / (rect.height * 0.35);
    const length = Math.max(1, Math.hypot(rawX, rawZ));
    const value = { x: rawX / length, z: rawZ / length };
    setStick(value);
    onMove({ ...value, sprint });
  };
  const release = () => {
    pointer.current = null;
    setStick({ x: 0, z: 0 });
    onMove({ x: 0, z: 0, sprint });
  };
  return (
    <div className="free-movement">
      <div className="movement-copy">
        <Footprints size={16} />
        <strong>Move freely</strong>
        <span>Hold WASD / arrows. Hold Shift to run.</span>
        <small>Drag the stick on touch. Release to stop.</small>
      </div>
      <div
        className="movement-stick"
        role="group"
        aria-label="Movement joystick"
        aria-disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.pointerId === pointer.current) update(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <div className="stick-cross" />
        <span
          className="stick-knob"
          style={{ transform: `translate(${stick.x * 26}px,${stick.z * 26}px)` }}
        />
      </div>
      <div className="movement-steps">
        {[
          { action: 'forward', label: 'Move forward', Icon: ArrowUp },
          { action: 'left', label: 'Move left', Icon: ArrowLeft },
          { action: 'back', label: 'Move backward', Icon: ArrowDown },
          { action: 'right', label: 'Move right', Icon: ArrowRight },
        ].map(({ action, label, Icon }) => (
          <button
            className="key-button"
            key={action}
            aria-label={label}
            disabled={disabled}
            onClick={() => onStep(action as 'left' | 'right' | 'forward' | 'back')}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <button
        className={`run-toggle ${sprint ? 'active' : ''}`}
        aria-label="Run movement"
        aria-pressed={sprint}
        disabled={disabled}
        onClick={() => {
          const next = !sprint;
          setSprint(next);
          onMove({ ...stick, sprint: next });
        }}
      >
        RUN {sprint ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
