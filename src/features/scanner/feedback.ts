"use client";
/** Audio + haptic feedback for scans. Generated tones: no audio files to load. */
let ctx: AudioContext | null = null;

/** Must be called from a user gesture (e.g. the "Start" tap) to unlock audio on iOS. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export type FeedbackKind = "ok" | "already" | "error";

export function feedback(kind: FeedbackKind) {
  if (kind === "ok") {
    tone(988, 0, 0.09);
    tone(1319, 0.08, 0.14);
    navigator.vibrate?.(60);
  } else if (kind === "already") {
    tone(660, 0, 0.08, "triangle", 0.12);
    navigator.vibrate?.([30, 40, 30]);
  } else {
    tone(196, 0, 0.28, "square", 0.08);
    navigator.vibrate?.([120, 60, 120]);
  }
}
