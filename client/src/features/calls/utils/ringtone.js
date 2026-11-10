// Call ringtones synthesized live with the Web Audio API — no audio assets
// to ship, and patterns can loop forever until the call resolves.
//
// - startIncoming(): classic double-pulse phone ring (the "being called" tone).
// - startOutgoing(): single-pulse dispatch ringback (the "calling someone" tone).
//
// Both patterns repeat until stop(). Browsers only allow audio after the user
// has interacted with the page at least once (autoplay policy), so
// installUnlockListeners() resumes a suspended context on the first gesture.

const TONE_FREQUENCIES = [440, 480]; // classic telephone alert pairing
const VOLUME = 0.12;

// Incoming: two quick pulses, then wait. Outgoing: one long pulse per cycle.
const INCOMING_SEQUENCE = [
  { offset: 0, duration: 0.4 },
  { offset: 0.55, duration: 0.4 },
];
const INCOMING_CYCLE_MS = 2600;

const OUTGOING_SEQUENCE = [{ offset: 0, duration: 1.1 }];
const OUTGOING_CYCLE_MS = 3000;

// Felt only on devices with a vibration motor; ignored elsewhere.
const INCOMING_VIBRATION = [400, 300, 400, 1000];

class Ringtone {
  constructor() {
    this.ctx = null;
    this.stopped = true;
    this.timeoutIds = [];
    this.gains = [];
    this.unlockInstalled = false;
  }

  getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  // Idempotent: resumes the context if autoplay policy suspended it.
  resume() {
    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  // Keep nudging the context until the first user gesture unlocks audio.
  // Necessary when the tab loads while a call is already ringing.
  installUnlockListeners() {
    if (this.unlockInstalled) return;
    this.unlockInstalled = true;

    const unlock = () => {
      this.resume();
      const ctx = this.getContext();
      if (ctx?.state === "running") {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
      }
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
  }

  // One dual-tone burst starting at `when`, with click-free envelope.
  _burst(when, duration) {
    const ctx = this.getContext();
    if (!ctx || this.stopped) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(VOLUME, when + 0.02);
    gain.gain.setValueAtTime(VOLUME, when + Math.max(0.02, duration - 0.05));
    gain.gain.linearRampToValueAtTime(0, when + duration);
    gain.connect(ctx.destination);
    this.gains.push(gain);

    const oscillators = TONE_FREQUENCIES.map((frequency) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(when);
      oscillator.stop(when + duration);
      return oscillator;
    });

    // Cleanup once the burst has fully finished.
    oscillators[0].onended = () => {
      oscillators.forEach((osc) => osc.disconnect());
      gain.disconnect();
      this.gains = this.gains.filter((g) => g !== gain);
    };
  }

  _start(cycleMs, sequence, vibrate = false) {
    this.stop();
    const ctx = this.getContext();
    if (!ctx) return;
    this.resume();

    this.stopped = false;

    const loop = () => {
      if (this.stopped) return;
      const base = ctx.currentTime + 0.05;
      sequence.forEach(({ offset, duration }) =>
        this._burst(base + offset, duration),
      );
      if (vibrate) navigator.vibrate?.(INCOMING_VIBRATION);
      this.timeoutIds.push(setTimeout(loop, cycleMs));
    };
    loop();
  }

  startIncoming() {
    this._start(INCOMING_CYCLE_MS, INCOMING_SEQUENCE, true);
  }

  startOutgoing() {
    this._start(OUTGOING_CYCLE_MS, OUTGOING_SEQUENCE);
  }

  stop() {
    this.stopped = true;
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.timeoutIds = [];
    this.gains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(0);
        gain.gain.value = 0;
        gain.disconnect();
      } catch {
        // node already torn down
      }
    });
    this.gains = [];
    navigator.vibrate?.(0);
  }
}

// Shared instance — CallProvider is mounted app-wide, and every call screen
// reads the same ringer state.
const ringtone = new Ringtone();

export default ringtone;
