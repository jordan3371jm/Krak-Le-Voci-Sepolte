// Audio System - WebAudio API per effetti dinamici

let audioContext: AudioContext | null = null;
let audioEnabled = true;
let masterGain: GainNode | null = null;

export function initAudio() {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.3;
  } catch (e) {
    console.warn('Audio not available');
    audioEnabled = false;
  }
}

export function toggleAudio(): boolean {
  audioEnabled = !audioEnabled;
  if (masterGain && audioContext) {
    masterGain.gain.value = audioEnabled ? 0.3 : 0;
  }
  return audioEnabled;
}

export function isAudioEnabled(): boolean {
  return audioEnabled;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.2) {
  if (!audioContext || !audioEnabled || !masterGain) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(masterGain);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

export function playResonanceSound() {
  playTone(440, 0.3, 'sine', 0.15);
  setTimeout(() => playTone(660, 0.3, 'sine', 0.1), 100);
  setTimeout(() => playTone(880, 0.4, 'sine', 0.08), 200);
}

export function playDissonanceSound() {
  playTone(150, 0.4, 'sawtooth', 0.15);
  setTimeout(() => playTone(120, 0.3, 'square', 0.1), 150);
}

export function playAttackSound() {
  playTone(200, 0.1, 'square', 0.2);
  setTimeout(() => playTone(150, 0.15, 'sawtooth', 0.15), 50);
}

export function playHealSound() {
  playTone(523, 0.2, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.1), 100);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.08), 200);
}

export function playChoiceSound() {
  playTone(330, 0.15, 'triangle', 0.1);
  setTimeout(() => playTone(440, 0.2, 'triangle', 0.08), 100);
}

export function playEchoSound() {
  playTone(220, 0.5, 'sine', 0.15);
  setTimeout(() => playTone(330, 0.5, 'sine', 0.12), 200);
  setTimeout(() => playTone(440, 0.6, 'sine', 0.1), 400);
  setTimeout(() => playTone(660, 0.7, 'sine', 0.08), 600);
}

export function playCorruptionSound() {
  playTone(80, 0.6, 'sawtooth', 0.2);
  setTimeout(() => playTone(60, 0.5, 'square', 0.15), 200);
}

export function playVictorySound() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => {
    setTimeout(() => playTone(note, 0.3, 'sine', 0.12), i * 150);
  });
}

export function playDefeatSound() {
  const notes = [440, 330, 220, 110];
  notes.forEach((note, i) => {
    setTimeout(() => playTone(note, 0.4, 'sawtooth', 0.1), i * 200);
  });
}

export function playAmbientDrone() {
  if (!audioContext || !audioEnabled || !masterGain) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(masterGain);

  oscillator.frequency.value = 55;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 3);
}
