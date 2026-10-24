import { useEffect } from 'react';
import { Camera, CameraOff, ScanLine, RotateCcw, Hand, ShieldCheck } from 'lucide-react';
import type { Action, Movement, Role, Target } from '@ghostwire/shared';
import { useTracking } from '../cv/useTracking';
import type { useCamera } from '../cv/useCamera';

export function CameraPanel({
  camera,
  role,
  onAction,
  onTarget,
  onMode,
  motion,
  onMotionChange,
  mode,
  onTrackingModeChange,
  onMove,
}: {
  camera: ReturnType<typeof useCamera>;
  role: Role;
  onAction: (a: Action) => void;
  onTarget: (t: Target) => void;
  onMode: (mode: 'manual' | 'motion') => void;
  motion: boolean;
  onMotionChange: (enabled: boolean) => void;
  mode: 'pose' | 'hand';
  onTrackingModeChange: (mode: 'pose' | 'hand') => void;
  onMove: (value: Movement) => void;
}) {
  const tracker = useTracking(camera.stream, role, motion, mode, onAction, onTarget, onMove);
  useEffect(
    () => onMode(camera.stream && motion ? 'motion' : 'manual'),
    [camera.stream, motion, onMode],
  );
  return (
    <section className="camera-panel">
      <div className="section-heading">
        <h3>
          <ScanLine size={16} /> Motion link
        </h3>
        <span className={`status-dot ${camera.stream ? 'online' : ''}`}>
          {camera.stream ? 'CAMERA ON' : 'OPTIONAL'}
        </span>
      </div>
      <div className={`camera-preview ${camera.stream ? 'has-camera' : ''}`}>
        <video ref={tracker.video} muted playsInline autoPlay />
        <canvas ref={tracker.overlay} />
        {!camera.stream && (
          <div className="camera-placeholder">
            <Camera size={24} />
            <span>Your body. Your controller.</span>
          </div>
        )}
        {camera.stream && <span className="camera-state">{tracker.gesture}</span>}
      </div>
      {camera.stream ? (
        <>
          <div className="tracking-line">
            <span className={`tiny-dot ${tracker.calibrated ? 'green' : ''}`} />
            {tracker.status}
          </div>
          <div className="camera-options">
            <label>
              <input
                type="checkbox"
                checked={motion}
                onChange={(e) => onMotionChange(e.target.checked)}
              />{' '}
              Motion controls
            </label>
            {
              <select
                aria-label="Tracking mode"
                value={mode}
                onChange={(e) => onTrackingModeChange(e.target.value as 'pose' | 'hand')}
              >
                <option value="pose">Body gestures</option>
                <option value="hand">One hand</option>
              </select>
            }
          </div>
          <div className="button-pair">
            <button className="button subtle small" onClick={tracker.recalibrate}>
              <RotateCcw size={13} />
              Calibrate
            </button>
            <button className="button subtle small" onClick={camera.stop}>
              <CameraOff size={13} />
              Stop camera
            </button>
          </div>
          <p className="camera-tip">
            {mode === 'hand'
              ? role === 'hero'
                ? 'Open palm to calibrate. Swipe to strike, pinch for overdrive, fist to guard, point one index finger up to jump. Move an open palm away from its neutral center to walk.'
                : 'Hold an open palm to calibrate. Swipe to attack, pinch to charge, make a fist to guard. Move your palm to aim during the breach.'
              : role === 'hero'
                ? 'Punch to strike; cross hands to guard; duck to evade. Hold both hands high for overdrive, one hand high to jump, or lift one knee to kick. Lean left/right to move; step closer/farther to advance/retreat.'
                : 'Lean left/right and step closer/farther to walk in the arena. Extend an arm to swipe, hold both hands high for power, or cross hands to guard. Your wrist aims in Reality Breach.'}{' '}
            Small, comfortable movements work best.
          </p>
        </>
      ) : (
        <>
          <p>
            {role === 'boss'
              ? 'Enable your camera to share live video with the hero and turn your room into the final arena.'
              : 'Enable your camera for local motion controls. Your video stays on this device.'}
          </p>
          <button
            className="button secondary full"
            onClick={camera.start}
            disabled={camera.loading}
          >
            {camera.loading ? <span className="spinner" /> : <Camera size={16} />}{' '}
            {camera.loading ? 'Starting camera…' : 'Enable camera'}
          </button>
          {camera.loading && (
            <button className="button subtle full" onClick={camera.stop}>
              Cancel camera request
            </button>
          )}
          <span className="privacy-line">
            <ShieldCheck size={12} />
            No audio. No recording. Stop anytime.
          </span>
        </>
      )}
      {camera.error && (
        <p className="inline-error" role="alert">
          {camera.error}
        </p>
      )}
      <div className="manual-note">
        <Hand size={13} />
        Keyboard & touch are always available.
      </div>
    </section>
  );
}
