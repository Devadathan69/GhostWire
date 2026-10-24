import { useEffect, useRef, useState } from 'react';
import {
  cameraToStage,
  type Action,
  type Movement,
  type Role,
  type Target,
} from '@ghostwire/shared';
import { GestureClassifier, type Landmark } from './gestures';

export function useTracking(
  stream: MediaStream | null,
  role: Role,
  enabled: boolean,
  mode: 'pose' | 'hand',
  onAction: (a: Action) => void,
  onTarget: (t: Target) => void,
  onMove: (value: Movement) => void,
) {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const classifier = useRef(new GestureClassifier());
  const callbacks = useRef({ onAction, onTarget, onMove });
  callbacks.current = { onAction, onTarget, onMove };
  const [status, setStatus] = useState('Camera off');
  const [calibrated, setCalibrated] = useState(false);
  const [gesture, setGesture] = useState('Neutral');
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    if (stream) void element.play().catch(() => {});
    return () => {
      element.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    classifier.current.reset();
    setCalibrated(false);
    const ctx = overlay.current?.getContext('2d');
    ctx?.clearRect(0, 0, 640, 480);
    if (!stream || !enabled) {
      callbacks.current.onMove({ x: 0, z: 0, sprint: false });
      setStatus(stream ? 'Camera on · manual controls' : 'Camera off');
      return;
    }
    let disposed = false,
      timer: ReturnType<typeof setTimeout> | null = null;
    let detector:
      | import('@mediapipe/tasks-vision').PoseLandmarker
      | import('@mediapipe/tasks-vision').HandLandmarker
      | null = null;
    let lastFrame = -1;
    setStatus('Loading motion tracker…');
    void (async () => {
      try {
        const { FilesetResolver, PoseLandmarker, HandLandmarker } =
          await import('@mediapipe/tasks-vision');
        const files = await FilesetResolver.forVisionTasks('/models/wasm');
        if (disposed) return;
        const create = (delegate: 'GPU' | 'CPU') =>
          mode === 'pose'
            ? PoseLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate },
                runningMode: 'VIDEO',
                numPoses: 1,
                minPoseDetectionConfidence: 0.6,
                minPosePresenceConfidence: 0.6,
                minTrackingConfidence: 0.6,
              })
            : HandLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6,
              });
        try {
          detector = await create('GPU');
        } catch {
          detector = await create('CPU');
        }
        if (disposed) {
          detector.close();
          return;
        }
        const loop = () => {
          if (disposed || !detector) return;
          const v = video.current;
          try {
            if (v && v.readyState >= 2 && v.currentTime !== lastFrame && !document.hidden) {
              lastFrame = v.currentTime;
              const result = detector.detectForVideo(v, performance.now());
              const reading = classifier.current.read(
                (result.landmarks[0] || []) as Landmark[],
                performance.now(),
                role,
                mode,
              );
              setCalibrated(reading.calibrated);
              callbacks.current.onMove(
                reading.calibrated && reading.confidence >= 0.55
                  ? (reading.movement ?? { x: 0, z: 0, sprint: false })
                  : { x: 0, z: 0, sprint: false },
              );
              setStatus(
                reading.confidence < 0.55
                  ? 'Tracking lost · stay in frame'
                  : !reading.calibrated
                    ? `Hold neutral · calibrating ${Math.round(reading.progress * 100)}%`
                    : 'Motion tracking active',
              );
              if (reading.action) {
                callbacks.current.onAction(reading.action);
                setGesture(reading.action.toUpperCase());
              }
              if (reading.target && role === 'boss')
                callbacks.current.onTarget(
                  cameraToStage(reading.target, v.videoWidth, v.videoHeight, true),
                );
              const canvas = overlay.current,
                context = canvas?.getContext('2d');
              if (canvas && context) {
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.strokeStyle = '#c2f970';
                context.fillStyle = '#c2f970';
                context.lineWidth = 3;
                const links =
                  mode === 'pose'
                    ? [
                        [11, 12],
                        [11, 13],
                        [13, 15],
                        [12, 14],
                        [14, 16],
                        [11, 23],
                        [12, 24],
                        [23, 24],
                      ]
                    : [
                        [0, 5],
                        [5, 9],
                        [9, 13],
                        [13, 17],
                        [17, 0],
                        [0, 1],
                        [1, 2],
                        [2, 3],
                        [3, 4],
                        [5, 6],
                        [6, 7],
                        [7, 8],
                        [9, 10],
                        [10, 11],
                        [11, 12],
                        [13, 14],
                        [14, 15],
                        [15, 16],
                        [17, 18],
                        [18, 19],
                        [19, 20],
                      ];
                for (const [a, b] of links) {
                  const pa = reading.landmarks[a],
                    pb = reading.landmarks[b];
                  if (pa && pb) {
                    context.beginPath();
                    context.moveTo(pa.x * canvas.width, pa.y * canvas.height);
                    context.lineTo(pb.x * canvas.width, pb.y * canvas.height);
                    context.stroke();
                  }
                }
                reading.landmarks.forEach((p) => {
                  context.beginPath();
                  context.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, Math.PI * 2);
                  context.fill();
                });
              }
            }
            timer = setTimeout(loop, 67);
          } catch {
            callbacks.current.onMove({ x: 0, z: 0, sprint: false });
            setStatus('Tracking unavailable · use manual controls');
            detector.close();
            detector = null;
          }
        };
        loop();
      } catch {
        if (!disposed) setStatus('Motion assets unavailable · use manual controls');
      }
    })();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      detector?.close();
      callbacks.current.onMove({ x: 0, z: 0, sprint: false });
    };
  }, [stream, role, enabled, mode, reset]);
  return { video, overlay, status, calibrated, gesture, recalibrate: () => setReset((n) => n + 1) };
}
