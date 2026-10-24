let context: AudioContext | null = null;
let enabled = localStorage.getItem('ghostwire-audio') !== 'off';
export function unlockAudio() {
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') void context.resume().catch(() => {});
}
export function setAudio(value: boolean) {
  enabled = value;
  localStorage.setItem('ghostwire-audio', value ? 'on' : 'off');
  if (value) unlockAudio();
}
export function audioEnabled() {
  return enabled;
}
export function cue(kind: 'hit' | 'special' | 'breach' | 'guard' | 'win') {
  if (!enabled || !context || context.state !== 'running') return;
  const notes =
    kind === 'win'
      ? [392, 494, 587, 784]
      : kind === 'breach'
        ? [75, 55, 40]
        : [kind === 'special' ? 160 : kind === 'guard' ? 440 : 100];
  notes.forEach((note, i) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain(),
      at = context!.currentTime + i * 0.12;
    oscillator.type = kind === 'win' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(note, at);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, note * (kind === 'win' ? 1 : 0.4)),
      at + 0.22,
    );
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.065, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.4);
  });
}
