/* ============================================================================
   SOUND — every effect, synthesised with WebAudio
   ========================================================================== */
const Sound = (() => {
  /* Everything here is synthesised. The hub is one file, so there are no
     samples to load - which is a constraint, not an excuse. What made the old
     set sound like a calculator was that each effect was a single square-wave
     oscillator on a single envelope. Real sounds are layered: a transient that
     tells you something happened, a body that tells you what it was, and a
     filter that moves while it decays. That is what this builds.

     Three things beyond the layering matter as much:
       - every voice is detuned a few cents per call, so the twentieth block
         you place does not sound cut-and-pasted from the first;
       - everything is scheduled on the audio clock rather than setTimeout, so
         a two-part sound is tight instead of loosely stapled together;
       - it all runs through one bus with a compressor, so ten things landing
         at once duck politely rather than clipping. */
  let actx = null, bus = null, sendGain = null, muted = Store.getPref('muted') === true;

  function ensure() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (e) { return null; }
      try { buildBus(); } catch (e) { bus = null; }
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return bus ? actx : null;
  }
  function buildBus() {
    bus = actx.createGain();
    /* Measured, not guessed: at this level the small frequent sounds land
       around -16dBFS and the worst pile-up I could provoke (a ten-block clear
       on top of an explosion) peaks around -4dBFS, so nothing ever runs out
       of headroom. */
    bus.gain.value = 3.5;
    /* a limiter in all but name: without it, a four-line clear is a dozen
       voices at once and the sum clips into a crackle.
       The knee is the number that matters. A 22dB knee under a -13dB threshold
       starts reducing gain at -35dBFS, which is quieter than almost everything
       here - the entire set came out limp because it was being compressed on
       every single hit. It should only catch a genuine pile-up. */
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -6; comp.knee.value = 8; comp.ratio.value = 5;
    comp.attack.value = 0.003; comp.release.value = 0.16;
    bus.connect(comp); comp.connect(actx.destination);
    /* a short plate on a send, so hits sit in a small room instead of being
       dead flat. Cheap: one convolver fed by whatever asks for it. */
    const verb = actx.createConvolver();
    verb.buffer = impulse(0.9, 3.2);
    const wet = actx.createGain(); wet.gain.value = 0.5;
    sendGain = actx.createGain(); sendGain.gain.value = 1;
    sendGain.connect(verb); verb.connect(wet); wet.connect(bus);
  }
  function impulse(dur, decay) {
    const n = Math.max(1, (actx.sampleRate * dur) | 0);
    const b = actx.createBuffer(2, n, actx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }
  const jit = c => 1 + (Math.random() - 0.5) * (c === undefined ? 0.03 : c);

  /* Where every layer ends up: optionally placed in the stereo field (`pan`,
     -1 left to 1 right, where the browser can), then the bus, and the reverb
     send if it asked for one. */
  function out(c, g, o) {
    let node = g;
    if (o.pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      g.connect(p); node = p;
    }
    node.connect(bus);
    if (o.send && sendGain) { const s = c.createGain(); s.gain.value = o.send; node.connect(s); s.connect(sendGain); }
  }
  /* Soft clipping, for a low note that has to be heard on a laptop: the
     speaker cannot move 40Hz, but it can play the harmonics a driven sine
     grows, and the ear fills the fundamental back in. */
  const curves = {};
  function shaper(c, k) {
    const key = k.toFixed(1);
    if (!curves[key]) {
      const n = 1024, cv = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * k) / Math.tanh(k); }
      curves[key] = cv;
    }
    const w = c.createWaveShaper();
    w.curve = curves[key]; w.oversample = '2x';
    return w;
  }
  /* two seconds of white noise per context, shared by everything that
     breathes rather than knocks */
  const noiseBufs = new WeakMap();
  function noise(c) {
    let b = noiseBufs.get(c);
    if (!b) {
      const n = c.sampleRate * 2;
      b = c.createBuffer(1, n, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBufs.set(c, b);
    }
    return b;
  }

  /* One pitched layer: oscillator -> filter -> envelope -> bus. `hold` keeps
     it at full level before the decay starts (a buzzer, not a pluck), and
     `drive` pushes it through the soft clipper. */
  function voice(o) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const dur = o.dur || 0.2, vol = o.vol === undefined ? 0.18 : o.vol;
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    const f = Math.max(20, o.f * jit(o.jit));
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * jit(o.jit)), t + dur);
    const flt = c.createBiquadFilter();
    flt.type = o.ftype || 'lowpass';
    flt.Q.value = o.q === undefined ? 0.8 : o.q;
    flt.frequency.setValueAtTime(o.fc || 9000, t);
    if (o.fcTo) flt.frequency.exponentialRampToValueAtTime(Math.max(60, o.fcTo), t + dur);
    const g = c.createGain();
    const att = o.att === undefined ? 0.004 : o.att, hold = o.hold || 0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + att);
    if (hold) g.gain.setValueAtTime(Math.max(0.0002, vol), t + att + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(att + hold + 0.01, dur));
    if (o.drive) { const w = shaper(c, o.drive); osc.connect(w); w.connect(flt); }
    else osc.connect(flt);
    flt.connect(g); out(c, g, o);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  /* the transient: a burst of noise with the filter closing as it decays,
     which is what a knock, a snap or an impact actually is */
  function hit(o) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const dur = o.dur || 0.09;
    const n = Math.max(1, (c.sampleRate * dur) | 0);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    const shape = o.shape === undefined ? 2 : o.shape;
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, shape);
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = o.ftype || 'lowpass';
    flt.Q.value = o.q === undefined ? 0.9 : o.q;
    flt.frequency.setValueAtTime((o.fc || 3200) * jit(0.10), t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(80, o.fcTo || 500), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol === undefined ? 0.16 : o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); out(c, g, o);
    src.start(t); src.stop(t + dur + 0.02);
  }
  /* Air: noise through a filter whose centre travels up to `fcPeak` and back
     down while the level swells in and dies away — a whoosh, a wing beat, a
     card leaving the deck, a flame. */
  function swell(o) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const dur = o.dur || 0.3, att = Math.min(dur * 0.9, o.att === undefined ? dur * 0.35 : o.att);
    const src = c.createBufferSource();
    src.buffer = noise(c); src.loop = true;
    const flt = c.createBiquadFilter();
    flt.type = o.ftype || 'bandpass';
    flt.Q.value = o.q === undefined ? 1 : o.q;
    const f0 = (o.fc || 800) * jit(0.1);
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, (o.fcPeak || f0 * 3) * jit(0.1)), t + att);
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, o.fcTo || f0), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol === undefined ? 0.12 : o.vol), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); out(c, g, o);
    /* a different stretch of the noise each time, so no two are the same */
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }
  /* Metal and glass: a sine whose pitch is swung by a second one at a fixed
     ratio, the swing dying away (over `dim` seconds) faster than the note.
     A whole-number ratio rings like a bell or a glass; an awkward one (1.41,
     2.76) clanks like a coin or a struck plate. */
  function ring(o) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const dur = o.dur || 0.4, f = Math.max(20, o.f * jit(o.jit));
    const car = c.createOscillator(), mod = c.createOscillator(), idx = c.createGain();
    car.frequency.setValueAtTime(f, t);
    mod.frequency.setValueAtTime(f * (o.ratio || 1.4), t);
    const deep = f * (o.index === undefined ? 2 : o.index);
    idx.gain.setValueAtTime(deep, t);
    idx.gain.exponentialRampToValueAtTime(Math.max(0.01, deep * 0.04), t + (o.dim || dur * 0.4));
    mod.connect(idx); idx.connect(car.frequency);
    const g = c.createGain();
    const att = o.att === undefined ? 0.002 : o.att;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol === undefined ? 0.1 : o.vol), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(att + 0.01, dur));
    car.connect(g); out(c, g, o);
    car.start(t); mod.start(t); car.stop(t + dur + 0.03); mod.stop(t + dur + 0.03);
  }
  /* Grit: single ticks sprinkled at `rate` a second and thinning out as it
     goes — what falls after a blast, a fire catching, coins settling. */
  function crackle(o) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const dur = o.dur || 0.6, n = Math.max(1, (c.sampleRate * dur) | 0);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    const p = (o.rate || 80) / c.sampleRate, grain = o.grain || 6;
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      if (Math.random() >= p * k * k) continue;
      const a = (0.3 + Math.random() * 0.7) * k * (Math.random() < 0.5 ? -1 : 1);
      const len = 2 + ((Math.random() * grain) | 0);
      for (let j = 0; j < len && i + j < n; j++) d[i + j] += a * (1 - j / len);
    }
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = o.ftype || 'highpass';
    flt.frequency.value = o.fc || 1800;
    flt.Q.value = o.q === undefined ? 0.7 : o.q;
    const g = c.createGain(); g.gain.value = o.vol === undefined ? 0.2 : o.vol;
    src.connect(flt); flt.connect(g); out(c, g, o);
    src.start(t); src.stop(t + dur + 0.02);
  }
  /* A held sound that a game keeps alive by calling it every frame — the
     crash rocket's engine. Nothing has to remember to stop it: each call
     pushes the fade a moment further out, so the frame the calls stop (a
     pause, another table, a hidden tab) it dies away by itself. */
  const drones = {};
  function drone(key, o) {
    let d = drones[key];
    const c = muted ? null : ensure();
    if (!c) { if (d) killDrone(key); return; }
    if (!d || d.c !== c) {
      if (d) killDrone(key);
      d = drones[key] = { c, oscs: [], g: c.createGain(), flt: c.createBiquadFilter(), src: null, airF: null, seen: 0, timer: 0 };
      d.flt.type = 'lowpass'; d.flt.Q.value = o.q === undefined ? 1.5 : o.q;
      d.g.gain.value = 0.0001;
      const types = o.types || ['sawtooth', 'sawtooth'];
      types.forEach((ty, i) => {
        const osc = c.createOscillator();
        osc.type = ty;
        osc.detune.value = (i - (types.length - 1) / 2) * (o.spread === undefined ? 14 : o.spread);
        osc.frequency.value = o.f;
        osc.connect(d.flt); osc.start(); d.oscs.push(osc);
      });
      if (o.air) {
        d.src = c.createBufferSource(); d.src.buffer = noise(c); d.src.loop = true;
        d.airF = c.createBiquadFilter(); d.airF.type = 'bandpass'; d.airF.Q.value = 0.8;
        const a = c.createGain(); a.gain.value = o.air;
        d.src.connect(d.airF); d.airF.connect(a); a.connect(d.g); d.src.start();
      }
      d.flt.connect(d.g); d.g.connect(bus);
      d.timer = setInterval(() => { if (performance.now() - d.seen > 1500) killDrone(key); }, 700);
    }
    const now = c.currentTime, T = 0.06;
    for (const osc of d.oscs) osc.frequency.setTargetAtTime(o.f, now, T);
    d.flt.frequency.setTargetAtTime(o.fc || o.f * 6, now, T);
    if (d.airF) d.airF.frequency.setTargetAtTime(o.airF || o.fc || 800, now, T);
    d.g.gain.cancelScheduledValues(now);
    d.g.gain.setTargetAtTime(o.vol === undefined ? 0.04 : o.vol, now, 0.05);
    d.g.gain.setTargetAtTime(0, now + (o.hold || 0.1), 0.06);
    d.seen = performance.now();
  }
  function killDrone(key) {
    const d = drones[key]; if (!d) return;
    delete drones[key];
    clearInterval(d.timer);
    try {
      const now = d.c.currentTime;
      d.g.gain.cancelScheduledValues(now);
      d.g.gain.setTargetAtTime(0, now, 0.03);
      for (const osc of d.oscs) osc.stop(now + 0.3);
      if (d.src) d.src.stop(now + 0.3);
    } catch (e) {}
  }

  /* A minor pentatonic, so anything that climbs stays in tune with itself no
     matter how many steps it takes. */
  const PENT = [0, 3, 5, 7, 10];
  const semis = n => Math.pow(2, n / 12);

  let lastBig = 0;

  /* ---- money ----
     A coin is a short, bright, clanky ring — an FM tone at an awkward ratio —
     and a pile of them is a handful at random pitches, spread across the
     stereo field, landing close together and then settling. Returns when
     the last one lands. */
  function coins(at, n, o) {
    o = o || {};
    let a = at;
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 0;
      ring({ f: (o.lo || 3000) + Math.random() * (o.span || 2800), ratio: 1.38 + Math.random() * 0.35,
             index: 1.1 + Math.random() * 0.6, dur: 0.07 + Math.random() * 0.12, dim: 0.03,
             vol: (o.vol || 0.04) * (1 - k * 0.5), at: a, pan: (Math.random() - 0.5) * (o.width || 0.9) });
      a += (o.gap || 0.04) * (0.6 + Math.random() * 0.9) * (1 + k * 0.8);
    }
    return a;
  }
  /* The till: the lever's clunk and its ratchet, then — unless `bell` is
     false — the bell, struck once, with its shimmer. */
  function register(at, bell) {
    hit({ dur: 0.04, vol: 0.12, fc: 2200, fcTo: 800, ftype: 'bandpass', q: 2.2, shape: 2, at });
    hit({ dur: 0.03, vol: 0.08, fc: 3200, fcTo: 1300, ftype: 'bandpass', q: 3, shape: 2.4, at: at + 0.045 });
    voice({ f: 180, to: 100, dur: 0.07, type: 'sine', vol: 0.08, at: at + 0.04 });
    if (bell === false) return;
    ring({ f: 2637, ratio: 2.76, index: 1.5, dur: 1.2, vol: 0.068, at: at + 0.085, send: 0.3, dim: 0.3, jit: 0.004 });
    ring({ f: 3951, ratio: 1.41, index: 0.7, dur: 0.6, vol: 0.024, at: at + 0.09, send: 0.25, jit: 0.004 });
    voice({ f: 1318.5, dur: 0.45, type: 'triangle', vol: 0.032, at: at + 0.085, send: 0.2, jit: 0.004 });
  }

  const S = {
    get muted() { return muted; },
    setMuted(v) {
      muted = v; Store.setPref('muted', v);
      if (v) for (const k in drones) killDrone(k);
      else ensure();
    },
    unlock() { if (!muted) ensure(); },
    /* Build a sound on an offline context and hand back its samples, so a
       sound can be measured (peak, length, spectrum) rather than guessed at.
       Nothing in play calls this. Resolves to an AudioBuffer, or null. */
    render(fn, secs) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC) return Promise.resolve(null);
      const keep = [actx, bus, sendGain, muted];
      actx = new OC(2, Math.ceil(44100 * (secs || 2)), 44100);
      buildBus(); muted = false;
      try { fn(S); } catch (e) {}
      const job = actx.startRendering();
      [actx, bus, sendGain, muted] = keep;
      return job;
    },

    /* --- the original thirteen, rebuilt --- */
    blip:   () => { voice({ f: 680, dur: .07, type: 'triangle', vol: .13, fc: 4200, fcTo: 1800 }); },
    pickup: () => { hit({ dur: .04, vol: .08, fc: 5200, fcTo: 1400 });
                    voice({ f: 720, to: 1180, dur: .11, type: 'triangle', vol: .13, fc: 6000 }); },
    hit:    () => { hit({ dur: .06, vol: .17, fc: 2600, fcTo: 320 });
                    voice({ f: 200, to: 120, dur: .11, type: 'sine', vol: .16, fc: 1400 }); },
    shoot:  () => { hit({ dur: .05, vol: .09, fc: 4200, fcTo: 900 });
                    voice({ f: 820, to: 300, dur: .09, type: 'sawtooth', vol: .07, fc: 3000, fcTo: 700 }); },
    explode:() => { hit({ dur: .38, vol: .26, fc: 1800, fcTo: 90, shape: 1.4, send: .35 });
                    voice({ f: 130, to: 38, dur: .34, type: 'sine', vol: .22, fc: 900, fcTo: 120 });
                    voice({ f: 74, to: 30, dur: .40, type: 'triangle', vol: .16, at: .01 }); },
    jump:   () => { voice({ f: 300, to: 760, dur: .13, type: 'triangle', vol: .13, fc: 5000, att: .006 }); },
    thud:   () => { hit({ dur: .05, vol: .12, fc: 1200, fcTo: 180 });
                    voice({ f: 150, to: 82, dur: .13, type: 'sine', vol: .19 }); },
    /* a falling third, which is what "no" sounds like in every language */
    fail:   () => { voice({ f: 330, to: 240, dur: .20, type: 'triangle', vol: .15, fc: 2600, fcTo: 900 });
                    voice({ f: 196, to: 132, dur: .42, type: 'triangle', vol: .14, at: .13, send: .25, fc: 1800, fcTo: 500 });
                    voice({ f: 165, to: 110, dur: .46, type: 'sine', vol: .11, at: .15 }); },
    /* a real cadence rather than four beeps in a row */
    win:    () => { [0, 4, 7, 12, 16].forEach((n, i) =>
                      voice({ f: 523.25 * semis(n), dur: .5 - i * .04, type: 'triangle',
                              vol: .12, fc: 7000, send: .3, at: i * .085 })); },
    coin:   () => { voice({ f: 1046, dur: .06, type: 'triangle', vol: .10, fc: 8000 });
                    voice({ f: 1568, dur: .13, type: 'triangle', vol: .09, at: .055, send: .25 }); },
    place:  () => { hit({ dur: .045, vol: .13, fc: 3000, fcTo: 420 });
                    voice({ f: 232, to: 168, dur: .10, type: 'sine', vol: .17, fc: 2200 });
                    voice({ f: 464, to: 336, dur: .06, type: 'triangle', vol: .05 }); },
    zap:    () => { voice({ f: 1500, to: 620, dur: .07, type: 'sawtooth', vol: .06, fc: 5000, fcTo: 1200, q: 4 }); },

    /* --- new, for things that happen in a run --- */
    /* Lift a piece: a small upward tick. */
    grab:   () => { hit({ dur: .03, vol: .07, fc: 6000, fcTo: 2200 });
                    voice({ f: 520, to: 700, dur: .07, type: 'triangle', vol: .08, fc: 6000 }); },
    /* A piece that would not fit, going home. Deliberately soft - it is a
       correction, not a punishment. */
    nope:   () => { voice({ f: 300, to: 220, dur: .10, type: 'triangle', vol: .08, fc: 1600, fcTo: 600 }); },
    /* One block of a clearing line. `i` of `n` walks up a pentatonic scale, so
       a row going out is an arpeggio that resolves as the last block lands -
       the single thing that makes a cascade feel good rather than noisy. */
    clearStep(i, n) {
      const step = PENT[i % PENT.length] + 12 * Math.floor(i / PENT.length);
      const f = 523.25 * semis(Math.min(step, 34));
      const k = n > 1 ? i / (n - 1) : 1;
      voice({ f, dur: .16 - k * .04, type: 'triangle', vol: .18, jit: .012,
              fc: 9000, send: .22, att: .003 });
      voice({ f: f * 2, dur: .07, type: 'sine', vol: .03, jit: .012 });
      hit({ dur: .022, vol: .045, fc: 7000, fcTo: 2600 });
    },
    /* ---- the maze game, which wants its own voice ----
       A chomp is not a blip and a ghost being eaten is not a coin. These are
       square-wave sweeps because that is what the original hardware could make
       and what the ear expects from a maze. */
    /* The waka. Two sweeps that alternate on every dot, so a run of them
       warbles rather than beeping. The filter stays wide open on purpose: the
       arcade voice is a bare square wave and the hardness IS the character -
       rolling it off at 2.4kHz, as this used to, sanded the sound into a
       generic blip that could have come from any game. */
    chomp(alt) {
      const a = alt ? 360 : 540, b = alt ? 540 : 360;
      voice({ f: a, to: b, dur: .085, type: 'square', vol: .085, fc: 9000, att: .001, jit: .006 });
      voice({ f: a * 2, to: b * 2, dur: .05, type: 'square', vol: .022, fc: 9000, att: .001, jit: .006 });
    },
    /* The fright siren: a fast square-wave warble that climbs and falls over
       eight steps. It is driven a step at a time by the game rather than left
       to free-run, so it starts and stops exactly with the energizer. */
    frightStep(i) {
      const k = i % 8, up = k < 4 ? k : 7 - k;
      const fq = 175 * semis(up * 3);
      voice({ f: fq, to: fq * 1.06, dur: .085, type: 'square', vol: .05, fc: 5200, att: .002, jit: 0 });
      voice({ f: fq * .5, dur: .08, type: 'square', vol: .022, fc: 2200, att: .002, jit: 0 });
    },
    /* The siren underneath ordinary play, climbing as the maze empties. Quiet
       on purpose - it runs constantly, and it is atmosphere, not an event. */
    sirenStep(i, tension) {
      const k = i % 6, up = k < 3 ? k : 5 - k;
      const base = 116 + tension * 78;
      const fq = base * semis(up * 2);
      voice({ f: fq, to: fq * 1.04, dur: .135, type: 'square', vol: .024, fc: 1500, att: .005, jit: 0 });
    },
    /* the bonus: brighter and longer than a pellet, so it lands as an event */
    fruit() {
      voice({ f: 520, to: 1180, dur: .14, type: 'square', vol: .095, fc: 8000, att: .002 });
      voice({ f: 1040, to: 2360, dur: .10, type: 'triangle', vol: .04, at: .02, send: .25 });
      hit({ dur: .03, vol: .05, fc: 6000, fcTo: 2000 });
    },
    /* changing sides: the death warble, caught halfway and turned into the
       ghost's own tone rather than resolving */
    pacTurn() {
      for (let i = 0; i < 5; i++) {
        const fq = 600 - i * 78;
        voice({ f: fq, to: fq * .6, dur: .13, type: 'square', vol: .085 - i * .008, at: i * .09, fc: 3000, jit: 0 });
      }
      voice({ f: 150, to: 240, dur: .45, type: 'square', vol: .085, at: .46, fc: 2200, send: .3 });
      voice({ f: 300, to: 480, dur: .40, type: 'triangle', vol: .04, at: .48 });
    },
    /* the energizer: same idea an octave down, and slower */
    energizer() {
      voice({ f: 170, to: 92, dur: .30, type: 'square', vol: .11, fc: 1500, send: .2, att: .003 });
      voice({ f: 340, to: 184, dur: .26, type: 'triangle', vol: .05 });
    },
    /* eating a ghost: a fast rise, pitched up for each one in the chain */
    eatGhost(n) {
      const base = 200 * Math.pow(1.22, n || 0);
      voice({ f: base, to: base * 5.5, dur: .26, type: 'square', vol: .10, fc: 6000, send: .3, att: .003 });
      voice({ f: base * 2, to: base * 8, dur: .20, type: 'triangle', vol: .045, at: .02 });
    },
    /* a ghost heading home as a pair of eyes: a thin warble, not a fanfare */
    ghostHome() {
      voice({ f: 900, to: 1500, dur: .12, type: 'triangle', vol: .04, fc: 7000 });
    },
    /* the death: a descending warble that keeps folding down on itself */
    pacDeath() {
      for (let i = 0; i < 8; i++) {
        const f = 640 - i * 64;
        voice({ f, to: f * .55, dur: .16, type: 'square',
                vol: Math.max(.03, .10 - i * .008), at: i * .105, fc: 3000, jit: 0 });
      }
      voice({ f: 190, to: 55, dur: .55, type: 'triangle', vol: .09, at: .86, send: .3 });
    },
    /* the little four-note run before a life starts */
    pacReady() {
      [392, 523, 659, 784].forEach((f, i) =>
        voice({ f, dur: .17, type: 'square', vol: .085, at: i * .13, fc: 6000, send: .25 }));
    },
    /* ---- the casino ----
       Money sounds like money: chips are clay clacking on clay, a cash out
       is the till — lever, bell, coins into the tray, more of them the more
       the bet multiplied — and a mine is a real blast. Losing stays quiet on
       purpose: at a table where half the bets lose, a loud loss would be most
       of what you heard. */
    /* clay chips: two hard clacks a hair apart, the ring of one landing on
       another, and a last settle that never falls on the beat */
    csChip() {
      const d = .028 + Math.random() * .02;
      hit({ dur: .022, vol: .432, fc: 4200, fcTo: 2600, ftype: 'bandpass', q: 5, shape: 3 });
      voice({ f: 3150, dur: .035, type: 'sine', vol: .065, att: .001 });
      hit({ dur: .018, vol: .281, fc: 3600, fcTo: 2300, ftype: 'bandpass', q: 5, shape: 3, at: d });
      hit({ dur: .014, vol: .13, fc: 3300, fcTo: 2200, ftype: 'bandpass', q: 5, shape: 3, at: d + .035 + Math.random() * .02 });
    },
    /* the house's +25, every thirty seconds: a chip on your stack and a
       couple of coins */
    csDrip() {
      S.csChip();
      coins(.06, 2, { vol: .035, gap: .05 });
    },
    /* The cash out. `x` is the multiplier it paid at: a small win is the
       till and a few coins, a big one keeps pouring. */
    csCash(x) {
      const m = Math.max(1, x || 1.5);
      register(0);
      coins(.14, Math.min(14, 3 + Math.round(Math.log2(m) * 2.5)));
    },
    /* a win big enough for the whole table to hear about: a fanfare over a
       shower of coins. Twice at once (the feed and a table can both ask) is
       once. */
    csBig() {
      const now = performance.now();
      if (now - lastBig < 400) return;
      lastBig = now;
      [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => {
        voice({ f: 392 * semis(n), dur: .55 - i * .035, type: 'triangle', vol: .075, at: i * .065, fc: 9500, send: .45 });
        ring({ f: 784 * semis(n), ratio: 2, index: .6, dur: .35, vol: .025, at: i * .065 + .008, send: .35, jit: .004 });
      });
      coins(.35, 16, { gap: .05, vol: .045, width: 1.4 });
      crackle({ dur: 1.2, rate: 45, fc: 6000, vol: .04, at: .4 });
    },
    /* Soft on purpose: a falling pair and a low bump. */
    csLose() {
      voice({ f: 294, to: 196, dur: .2, type: 'triangle', vol: .06, fc: 2000, fcTo: 600 });
      voice({ f: 98, to: 70, dur: .18, type: 'sine', vol: .06 });
    },
    /* A mine. The crack of the charge, a blast of air closing down to a
       rumble, the thump under it (driven, so a laptop speaker still hears
       it), and grit coming down after. */
    csBoom() {
      hit({ dur: .07, vol: .181, fc: 9500, fcTo: 1400, shape: 2.2 });
      hit({ dur: 1.3, vol: .206, fc: 3200, fcTo: 110, shape: 1.15, send: .45 });
      voice({ f: 120, to: 30, dur: 1, type: 'sine', vol: .206, fc: 900, fcTo: 90, drive: 3, att: .002 });
      voice({ f: 240, to: 55, dur: .35, type: 'triangle', vol: .072, fc: 1800, fcTo: 200, drive: 2, at: .004 });
      crackle({ dur: 1.1, rate: 90, fc: 2400, vol: .097, at: .06 });
      swell({ dur: 1.5, att: .12, fc: 380, fcPeak: 700, fcTo: 120, ftype: 'lowpass', q: .7, vol: .072, at: .1 });
    },
    /* Dragon Tower's skull: the dragon wakes. A growl rolls up under a gout
       of flame, and the flame crackles on after. */
    csFire() {
      hit({ dur: .06, vol: .112, fc: 5000, fcTo: 900 });
      voice({ f: 70, to: 112, dur: .75, type: 'sawtooth', vol: .062, fc: 500, fcTo: 1400, q: 3, att: .06, drive: 2.5, send: .3 });
      voice({ f: 74, to: 104, dur: .75, type: 'sawtooth', vol: .05, fc: 500, fcTo: 1200, q: 3, att: .08 });
      swell({ dur: 1.1, att: .25, fc: 300, fcPeak: 2600, fcTo: 500, q: .6, vol: .174, send: .35, at: .05 });
      crackle({ dur: 1.2, rate: 70, fc: 1500, vol: .087, at: .15, grain: 10 });
    },
    /* A glassy strike that climbs a major pentatonic with the streak, so a
       run of gems (or eggs, or safe steps) plays a tune, with a sparkle over
       the top. */
    csGem(n) {
      const STEP = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
      const f = 659.25 * semis(STEP[Math.max(0, Math.min(STEP.length - 1, (n || 1) - 1))]);
      ring({ f, ratio: 3, index: 1.4, dur: .42, vol: .09, send: .3, dim: .12, jit: .004 });
      voice({ f, dur: .25, type: 'triangle', vol: .05, send: .2, jit: .004 });
      voice({ f: f * 2.01, dur: .12, type: 'sine', vol: .025, at: .03, send: .3, jit: .004 });
      voice({ f: f * 3, dur: .08, type: 'sine', vol: .015, at: .06, send: .3, jit: .004 });
    },
    /* a card: the slide off the shoe and the snap as it lands on the felt */
    csCard() {
      swell({ dur: .085, att: .05, fc: 1800, fcPeak: 5200, fcTo: 3000, q: .9, vol: .068 });
      hit({ dur: .03, vol: .075, fc: 3200, fcTo: 900, shape: 2.4, at: .07 });
    },
    /* the wheel's flapper, knocking over a peg */
    csSpin() {
      hit({ dur: .016, vol: .3, fc: 2600, fcTo: 1500, ftype: 'bandpass', q: 1.5, shape: 2.6 });
      voice({ f: 2100, dur: .014, type: 'triangle', vol: .05, att: .002 });
    },
    /* dice: a few knocks, tumbling to a stop */
    csRoll() {
      let a = 0;
      for (let i = 0; i < 5; i++) {
        hit({ dur: .02, vol: .12 - i * .018, fc: 3400 + Math.random() * 1400, fcTo: 1400, ftype: 'bandpass', q: 3, shape: 2.6, at: a });
        a += .035 + Math.random() * .03 + i * .012;
      }
      voice({ f: 520, to: 420, dur: .05, type: 'triangle', vol: .03 });
    },
    /* a keno ball that is not one of yours: a soft pop */
    csDraw() {
      voice({ f: 340, to: 520, dur: .05, type: 'sine', vol: .109, att: .002 });
      hit({ dur: .015, vol: .062, fc: 3000, fcTo: 1400 });
    },
    /* limbo's number racing up, for as long as it climbs */
    csRise(secs) {
      const d = Math.max(.3, Math.min(1.2, secs || .6));
      voice({ f: 180, to: 1100, dur: d, type: 'sawtooth', vol: .035, fc: 900, fcTo: 4200, q: 2, att: .03 });
      swell({ dur: d, att: d * .85, fc: 400, fcPeak: 3200, fcTo: 2600, q: 1, vol: .06 });
    },
    /* A plinko peg: a small glassy tick, pitched down a pentatonic as the
       ball falls, so a drop plays itself downhill. */
    csPeg(r) {
      const PEG = [28, 26, 24, 21, 19, 16, 14, 12, 9, 7, 4, 2, 0, -3, -5, -8];
      const f = 523.25 * semis(PEG[Math.max(0, Math.min(PEG.length - 1, r || 0))]);
      ring({ f, ratio: 3.5, index: .9, dur: .07, vol: .054, dim: .02, jit: .02 });
    },
    /* the ball dropping into its slot: a knock, then a note that rises with
       what the slot pays — and coins, then the till, as it gets serious */
    csLand(x) {
      const m = x || 1;
      hit({ dur: .03, vol: .07, fc: 2600, fcTo: 800, shape: 2 });
      if (m < 1) { voice({ f: 247, to: 196, dur: .12, type: 'triangle', vol: .045, fc: 2000 }); return; }
      const k = Math.max(0, Math.min(1, Math.log10(m) / 2 + .2));
      ring({ f: 523.25 * semis(Math.round(k * 19)), ratio: 2, index: .9, dur: .35, vol: .055 + k * .04, send: .25, jit: .004 });
      if (m >= 10) { register(.04); coins(.18, Math.min(14, 4 + Math.round(Math.log2(m)))); }
      else if (m >= 2) coins(.05, Math.round(m));
    },
    /* The rocket leaving the pad: ignition, a roar opening up, and the note
       it climbs on. */
    csLaunch() {
      hit({ dur: .08, vol: .042, fc: 2000, fcTo: 300 });
      swell({ dur: .9, att: .35, fc: 150, fcPeak: 1600, fcTo: 600, ftype: 'lowpass', q: .7, vol: .077, send: .2 });
      voice({ f: 55, to: 90, dur: .8, type: 'sawtooth', vol: .025, fc: 300, fcTo: 900, att: .1, drive: 2 });
    },
    /* Its engine in flight, called every frame with the multiplier: the
       pitch and the brightness climb with it, which is the tension. */
    csEngine(m) {
      const L = Math.log2(Math.max(1, m || 1));
      drone('crash', { f: 55 * (1 + L * .5), fc: 320 + L * 420, vol: .01 + Math.min(.008, L * .0017),
                       air: .6, airF: 600 + L * 500 });
    },
    /* the rocket blowing up: a blast and the engine dying under it */
    csCrash() {
      hit({ dur: .06, vol: .106, fc: 9000, fcTo: 1500, shape: 2.2 });
      hit({ dur: .9, vol: .113, fc: 2800, fcTo: 120, shape: 1.2, send: .4 });
      voice({ f: 100, to: 32, dur: .7, type: 'sine', vol: .113, fc: 800, fcTo: 90, drive: 2.5 });
      voice({ f: 620, to: 90, dur: .55, type: 'sawtooth', vol: .023, fc: 2600, fcTo: 250, at: .02 });
      crackle({ dur: .8, rate: 70, fc: 2600, vol: .045, at: .05 });
    },
    /* the chicken: "buk-buk", nasal and quick */
    csCluck() {
      [[0, 1], [.085, 1.12]].forEach(([a, k]) => {
        voice({ f: 560 * k, to: 400 * k, dur: .06, type: 'sawtooth', vol: .115, fc: 1500, ftype: 'bandpass', q: 3, att: .003, at: a });
        voice({ f: 1120 * k, to: 800 * k, dur: .04, type: 'square', vol: .034, fc: 2400, ftype: 'bandpass', q: 4, at: a });
      });
    },
    /* its hop: a flutter of wings and a little lift */
    csHop() {
      swell({ dur: .14, att: .03, fc: 900, fcPeak: 3000, fcTo: 1400, q: 1.2, vol: .1 });
      swell({ dur: .1, att: .02, fc: 1400, fcPeak: 3600, fcTo: 1800, q: 1.6, vol: .06, at: .05 });
      voice({ f: 330, to: 520, dur: .09, type: 'triangle', vol: .04 });
    },
    /* the car's horn, twice, a moment before it arrives */
    csHonk() {
      [0, .16].forEach(a => {
        voice({ f: 370, dur: .13, type: 'square', vol: .038, fc: 1800, q: 2, att: .008, at: a });
        voice({ f: 466, dur: .13, type: 'sawtooth', vol: .034, fc: 1800, q: 2, att: .008, at: a });
      });
    },
    /* and the car arriving: a thump, a clank of bumper, the squawk cut
       short, and feathers */
    csSmack() {
      hit({ dur: .08, vol: .3, fc: 4200, fcTo: 600, shape: 1.8 });
      voice({ f: 130, to: 50, dur: .22, type: 'sine', vol: .3, drive: 2 });
      ring({ f: 420, ratio: 1.41, index: 3, dur: .25, vol: .06, at: .005 });
      voice({ f: 1400, to: 700, dur: .16, type: 'sawtooth', vol: .05, fc: 3200, q: 4, at: .02 });
      voice({ f: 1250, to: 600, dur: .14, type: 'square', vol: .03, fc: 2800, q: 4, at: .025 });
      swell({ dur: .5, att: .05, fc: 2500, fcPeak: 5500, fcTo: 1500, q: .8, vol: .1, at: .04 });
    },
    /* the count in: 3, 2, 1 climbing, and the last ten seconds ticking */
    csTick(n) {
      voice({ f: n ? 660 + (3 - n) * 110 : 1046.5, dur: n ? .12 : .06, type: 'square', vol: n ? .14 : .1,
              fc: 3200, att: .002, send: n ? .15 : .05 });
      hit({ dur: .012, vol: .143, fc: 6000, fcTo: 3000 });
    },
    /* GO: a bright stab of a chord, a splash, and chips going down */
    csGo() {
      [0, 4, 7, 12].forEach(n => {
        voice({ f: 392 * semis(n), dur: .5, type: 'sawtooth', vol: .035, fc: 3000, fcTo: 1400, att: .004, send: .35 });
        voice({ f: 392 * semis(n), dur: .55, type: 'triangle', vol: .06, send: .3 });
      });
      hit({ dur: .25, vol: .1, fc: 7000, fcTo: 1000, shape: 1.4 });
      coins(.08, 5, { vol: .04 });
    },
    /* The buzzer, because "most chips at the buzzer" should end on one:
       flat, rasping, held, then cut. */
    csEnd() {
      voice({ f: 146.8, dur: .95, hold: .75, type: 'square', vol: .034, fc: 2600, att: .01, jit: 0 });
      voice({ f: 148.2, dur: .95, hold: .75, type: 'sawtooth', vol: .027, fc: 2600, att: .01, jit: 0 });
      voice({ f: 73.4, dur: .95, hold: .75, type: 'square', vol: .02, fc: 900, att: .01, jit: 0 });
    },
    /* ---- the casino's newer tables ---- */
    /* Roulette: the ball running round the track is a hollow whirr, held by
       being called every frame with its speed (0..1), so it slows with it. */
    csBallRun(v) {
      const k = Math.max(0, Math.min(1, v || 0));
      drone('roul', { f: 70 + k * 40, types: ['triangle'], fc: 260 + k * 420, vol: .003 + k * .009,
                      air: 1, airF: 1300 + k * 2600, q: .7 });
    },
    /* and its knocks as it drops off the track and rattles over the frets:
       one per call, `v` how hard */
    csBall(v) {
      const k = v == null ? 1 : Math.max(.15, v);
      hit({ dur: .02, vol: .2 * k, fc: 5200, fcTo: 2600, ftype: 'bandpass', q: 3.5, shape: 2.6 });
      ring({ f: 2300 + Math.random() * 900, ratio: 2.7, index: .8, dur: .06, vol: .03 * k, dim: .02 });
    },
    /* a small, dry tick: a card or a case going past the pointer */
    csTock() {
      hit({ dur: .014, vol: .2, fc: 3400, fcTo: 2000, ftype: 'bandpass', q: 2.2, shape: 2.6 });
    },
    /* a coin flicked off the thumb: the ping, and the whirr of it turning */
    csFlip() {
      ring({ f: 2900, ratio: 1.41, index: 1.2, dur: .35, vol: .06, dim: .08, send: .2 });
      swell({ dur: .5, att: .2, fc: 2400, fcPeak: 5200, fcTo: 2600, q: 3, vol: .035 });
    },
    /* and the coin landing */
    csCoinLand() {
      hit({ dur: .03, vol: .1, fc: 3800, fcTo: 1200, shape: 2.2 });
      ring({ f: 3300, ratio: 1.38, index: 1, dur: .22, vol: .05, dim: .05, at: .005 });
    },
    /* one stroke of the pump: air forced through the valve, higher as the
       balloon fills (`n` strokes so far) */
    csPump(n) {
      const k = Math.min(1, (n || 0) / 12);
      swell({ dur: .3, att: .2, fc: 500 + k * 400, fcPeak: 1800 + k * 1400, fcTo: 900, q: 1.4, vol: .13 });
      voice({ f: 140 + k * 80, to: 220 + k * 130, dur: .22, type: 'triangle', vol: .04, fc: 1200 });
      hit({ dur: .04, vol: .07, fc: 1400, fcTo: 400, at: .2 });
    },
    /* a balloon going: the crack, the rush of air, rubber slapping about */
    csPop() {
      hit({ dur: .05, vol: .3, fc: 9000, fcTo: 2200, shape: 2.4 });
      hit({ dur: .35, vol: .12, fc: 3000, fcTo: 250, shape: 1.3, send: .35 });
      voice({ f: 180, to: 60, dur: .16, type: 'sine', vol: .12, drive: 2 });
      crackle({ dur: .35, rate: 60, fc: 3000, vol: .05, at: .04 });
    },
    /* a dart through the air, and into the board */
    csThrow() { swell({ dur: .22, att: .16, fc: 900, fcPeak: 3800, fcTo: 1800, q: 1.5, vol: .09 }); },
    csThunk(v) {
      const k = v == null ? 1 : v;
      hit({ dur: .05, vol: .2 * k, fc: 2400, fcTo: 300, shape: 1.8 });
      voice({ f: 190, to: 110, dur: .12, type: 'sine', vol: .15 * k });
      ring({ f: 820, ratio: 1.41, index: 1.4, dur: .18, vol: .03 * k, at: .01 });
    },
    /* the mallet coming down: a hollow wooden bonk, and a squeak if it
       caught a mole */
    csWhack(got) {
      hit({ dur: .04, vol: .22, fc: 2600, fcTo: 500, shape: 2 });
      voice({ f: got ? 420 : 250, to: got ? 250 : 160, dur: .12, type: 'triangle', vol: .14, fc: 2600 });
      if (got) voice({ f: 1250, to: 1750, dur: .09, type: 'square', vol: .028, fc: 3200, at: .06 });
    },
    /* a mole popping up out of its hole */
    csPeek() {
      voice({ f: 300, to: 720, dur: .09, type: 'sine', vol: .08 });
      swell({ dur: .12, att: .04, fc: 800, fcPeak: 2400, fcTo: 1200, q: 1, vol: .045 });
    },
    /* the drill boring down: a motor held by being called every frame, `d`
       how deep it is (it labours as it goes) */
    csDrill(d) {
      const k = Math.max(0, Math.min(1, d || 0));
      drone('drill', { f: 88 - k * 28, types: ['sawtooth', 'square'], spread: 30, fc: 900 - k * 380, vol: .016,
                       air: .8, airF: 2400 - k * 1100, q: 2 });
    },
    /* something rare turning up: a rising shimmer, fuller the rarer (n 1..5) */
    csShine(n) {
      const k = Math.max(1, Math.min(5, n || 1));
      for (let i = 0; i < 2 + k; i++) {
        ring({ f: 1318.5 * semis([0, 4, 7, 12, 16, 19, 24][i]), ratio: 3, index: .8, dur: .5, vol: .026 + k * .005,
               at: i * .055, send: .4, jit: .004 });
      }
      swell({ dur: .6, att: .3, fc: 3000, fcPeak: 9000, fcTo: 6000, q: .9, vol: .025 + k * .007 });
    },
    /* a snake: the hiss and the rattle */
    csHiss() {
      swell({ dur: .7, att: .12, fc: 5000, fcPeak: 7000, fcTo: 4000, ftype: 'highpass', q: .7, vol: .08 });
      crackle({ dur: .5, rate: 120, fc: 900, ftype: 'bandpass', vol: .06, grain: 8 });
    },
    /* ---- crossy road: the level crossing ----
       A crossing bell is struck, not beeped: a hard attack, a body that rings
       on, a glassy overtone above it, and two bells a tone apart taking
       turns. The horn is a three-note chord with some growl under it; the
       wheels are low knocks, two to a bogie. Each takes a volume, so the
       crossing in front of you is louder than the one four rows up. */
    crBell(v, alt) {
      const k = v == null ? 1 : v, f = alt ? 1046.5 : 1174.7;
      voice({ f, dur: .42, type: 'triangle', vol: .085 * k, fc: 9000, att: .002, send: .32 });
      voice({ f: f * 2.76, dur: .16, type: 'sine', vol: .03 * k, att: .001, send: .25 });
      hit({ dur: .018, vol: .05 * k, fc: 9500, fcTo: 5000 });
    },
    crHorn(v) {
      const k = v == null ? 1 : v;
      [233.1, 293.7, 349.2].forEach(f => voice({ f, to: f * .985, dur: 1.1, type: 'sawtooth', vol: .04 * k, fc: 1500, fcTo: 1000, q: 1.2, att: .04, send: .38 }));
      voice({ f: 116.5, dur: 1.1, type: 'square', vol: .025 * k, fc: 600, att: .05 });
    },
    crClack(v) {
      const k = v == null ? 1 : v;
      hit({ dur: .05, vol: .1 * k, fc: 1200, fcTo: 180, shape: 2.2 });
      hit({ dur: .045, vol: .075 * k, fc: 900, fcTo: 150, shape: 2.2, at: .075 });
    },
    crPlop() {
      voice({ f: 380, to: 760, dur: .09, type: 'sine', vol: .07, fc: 5000 });
      hit({ dur: .05, vol: .045, fc: 2600, fcTo: 700 });
    },
    /* A splash is layered like the real thing: the slap of the surface and a
       plume of spray hissing down, the bird going in with a deep bloop,
       droplets pattering back, and a few bubbles after. A log takes a
       landing with a hollow knock and a little slosh. */
    crSplash() {
      hit({ dur: .55, vol: .3, fc: 7000, fcTo: 420, shape: 1.25, send: .35 });
      hit({ dur: .2, vol: .22, fc: 1700, fcTo: 200, shape: 1.8 });
      voice({ f: 620, to: 140, dur: .2, type: 'sine', vol: .16, fc: 3000 });
      voice({ f: 320, to: 85, dur: .28, type: 'sine', vol: .12, at: .06, fc: 2000 });
      for (let i = 0; i < 4; i++) voice({ f: 1300 + Math.random() * 900, to: 2300 + Math.random() * 900, dur: .05, type: 'sine', vol: .035, at: .15 + i * .07 + Math.random() * .04, jit: .06 });
      for (let i = 0; i < 3; i++) voice({ f: 240 + i * 70, to: 600 + i * 90, dur: .07, type: 'sine', vol: .05, at: .42 + i * .11, fc: 2400 });
    },
    crLog() {
      hit({ dur: .05, vol: .13, fc: 1700, fcTo: 260, shape: 2 });
      voice({ f: 200, to: 125, dur: .1, type: 'triangle', vol: .12, fc: 1700 });
      hit({ dur: .13, vol: .055, fc: 4400, fcTo: 1300, shape: 1.6, at: .012 });
    },
    /* ---- crossy road: the other countries ----
       The sandworm is felt before it is seen: a rumble under the lane that
       comes round every half second, then the dune tearing open, gravel
       flying and a driven growl. A bite is two hard snaps over a low grunt.
       Quicksand is a slow, sucking bloop with a few bubbles after; thin ice
       ticks and splinters, then goes with a spray of glassy rings. A bobsled
       run warns like a start gate and passes as a hiss of steel on ice; lava
       surges with a roar and spits; a bird in it sizzles. The eagle screams
       as it dives and its wings slam on the grab. A new country gets a
       little fanfare. Each warning takes a volume, like the crossing. */
    crRumble(v) {
      const k = v == null ? 1 : v;
      voice({ f: 44, to: 36, dur: .55, type: 'sawtooth', vol: .09 * k, fc: 190, drive: 3, att: .08 });
      swell({ dur: .55, att: .2, fc: 70, fcPeak: 260, fcTo: 70, ftype: 'lowpass', q: .7, vol: .16 * k });
      crackle({ dur: .45, rate: 50, fc: 900, ftype: 'bandpass', vol: .05 * k, grain: 10 });
    },
    crWorm(v) {
      const k = v == null ? 1 : v;
      hit({ dur: .3, vol: .2 * k, fc: 900, fcTo: 120, shape: 1.5 });
      swell({ dur: 1.2, att: .1, fc: 220, fcPeak: 2600, fcTo: 260, ftype: 'lowpass', q: .6, vol: .22 * k, send: .2 });
      voice({ f: 120, to: 48, dur: 1.1, type: 'sawtooth', vol: .1 * k, fc: 800, fcTo: 220, drive: 3.5, att: .06 });
      voice({ f: 91, to: 37, dur: 1.2, type: 'square', vol: .05 * k, fc: 420, att: .1 });
      crackle({ dur: 1, rate: 180, fc: 1600, vol: .14 * k });
    },
    crChomp() {
      hit({ dur: .07, vol: .22, fc: 2600, fcTo: 380, shape: 2 });
      voice({ f: 170, to: 62, dur: .18, type: 'sawtooth', vol: .1, fc: 900, drive: 2.5 });
      hit({ dur: .06, vol: .18, fc: 2000, fcTo: 320, shape: 2, at: .11 });
      voice({ f: 120, to: 55, dur: .14, type: 'sine', vol: .12, at: .11 });
    },
    crSink() {
      voice({ f: 280, to: 55, dur: .8, type: 'sine', vol: .12, fc: 700, att: .02 });
      swell({ dur: 1, att: .35, fc: 250, fcPeak: 800, fcTo: 160, ftype: 'lowpass', q: 1.4, vol: .15 });
      for (let i = 0; i < 3; i++) voice({ f: 150 + i * 45, to: 340 + i * 60, dur: .09, type: 'sine', vol: .05, at: .5 + i * .16, fc: 1500 });
    },
    crCrack() {
      hit({ dur: .05, vol: .12, fc: 7500, fcTo: 2600, ftype: 'highpass', shape: 2.5 });
      ring({ f: 2900 + Math.random() * 700, ratio: 2.9, index: 1.3, dur: .14, vol: .05, dim: .04 });
      crackle({ dur: .18, rate: 300, fc: 3500, vol: .09 });
    },
    crBreak() {
      hit({ dur: .14, vol: .18, fc: 6000, fcTo: 900, shape: 1.6 });
      crackle({ dur: .5, rate: 420, fc: 3000, vol: .18 });
      for (let i = 0; i < 5; i++) ring({ f: 2300 + Math.random() * 2800, ratio: 2.3 + Math.random(), index: 1, dur: .22, vol: .03, at: i * .03, dim: .06 });
    },
    crBuzz(v, go) {
      const k = v == null ? 1 : v, f = go ? 1318.5 : 659.3;
      voice({ f, dur: go ? .42 : .16, type: 'square', vol: .045 * k, fc: 3200, hold: go ? .26 : .08, att: .004 });
      voice({ f: f * 2, dur: go ? .42 : .16, type: 'sine', vol: .015 * k, hold: go ? .26 : .08, att: .004 });
    },
    crSled(v) {
      const k = v == null ? 1 : v;
      swell({ dur: 1, att: .4, fc: 1400, fcPeak: 5600, fcTo: 1100, ftype: 'bandpass', q: .8, vol: .18 * k });
      crackle({ dur: .9, rate: 320, fc: 4200, vol: .06 * k });
      voice({ f: 180, to: 120, dur: .8, type: 'sawtooth', vol: .02 * k, fc: 600, att: .3 });
    },
    crSurge(v) {
      const k = v == null ? 1 : v;
      swell({ dur: 1.3, att: .3, fc: 160, fcPeak: 1300, fcTo: 200, ftype: 'lowpass', q: .7, vol: .22 * k, send: .15 });
      voice({ f: 70, to: 44, dur: 1.2, type: 'sawtooth', vol: .07 * k, fc: 300, drive: 3, att: .15 });
      crackle({ dur: 1.2, rate: 260, fc: 2200, vol: .15 * k });
    },
    crSizzle() {
      hit({ dur: .12, vol: .14, fc: 1800, fcTo: 300 });
      swell({ dur: .9, att: .04, fc: 3800, fcPeak: 7500, fcTo: 3000, ftype: 'highpass', q: .6, vol: .17 });
      crackle({ dur: .8, rate: 320, fc: 2500, vol: .18 });
      voice({ f: 160, to: 55, dur: .35, type: 'sine', vol: .13 });
    },
    crEagle() {
      voice({ f: 2500, to: 2900, dur: .12, type: 'sawtooth', vol: .035, fc: 5000, ftype: 'bandpass', q: 2.5 });
      voice({ f: 2900, to: 1650, dur: .55, type: 'sawtooth', vol: .045, fc: 4200, fcTo: 2600, ftype: 'bandpass', q: 3, at: .1, att: .02 });
      voice({ f: 1450, to: 830, dur: .55, type: 'square', vol: .018, fc: 3000, at: .1 });
      ring({ f: 2600, ratio: 1.41, index: 2.2, dur: .5, vol: .02, at: .1, dim: .3 });
      swell({ dur: .5, att: .2, fc: 1200, fcPeak: 3600, fcTo: 900, q: .9, vol: .07, at: .15 });
    },
    crGrab() {
      swell({ dur: .45, att: .08, fc: 500, fcPeak: 2400, fcTo: 400, q: .9, vol: .16 });
      hit({ dur: .06, vol: .14, fc: 1600, fcTo: 300, shape: 2 });
      voice({ f: 900, to: 1400, dur: .14, type: 'square', vol: .04, fc: 3000, at: .03 });
      voice({ f: 1300, to: 800, dur: .18, type: 'square', vol: .035, fc: 3000, at: .16 });
    },
    crZone() {
      [0, 4, 7, 12].forEach((n, i) => voice({ f: 523.25 * semis(n), dur: .32, type: 'triangle', vol: .07, at: i * .08, fc: 6000, send: .3 }));
      ring({ f: 2093, ratio: 3, index: .7, dur: .6, vol: .025, at: .32, send: .4 });
    },
    crFloe() {
      hit({ dur: .05, vol: .12, fc: 3800, fcTo: 900, shape: 2 });
      ring({ f: 1800, ratio: 2.4, index: .8, dur: .12, vol: .03 });
      voice({ f: 260, to: 170, dur: .08, type: 'triangle', vol: .08 });
    },
    /* ---- crossy road: the endings ----
       A splat is a wet slap with a squelch dropping under it and the thump
       of whatever did it. A bonk is a hollow knock that springs up in pitch,
       and a whoosh after it if the throw was a big one. A gulp is a throat
       closing over something, twice. */
    crSplat() {
      hit({ dur: .08, vol: .26, fc: 3400, fcTo: 450, shape: 1.7 });
      voice({ f: 540, to: 90, dur: .17, type: 'sine', vol: .17, fc: 2400, drive: 1.6 });
      hit({ dur: .24, vol: .1, fc: 1500, fcTo: 170, shape: 1.3, at: .02, send: .2 });
      voice({ f: 96, to: 46, dur: .22, type: 'sine', vol: .2 });
    },
    crBonk(big) {
      hit({ dur: .05, vol: .22, fc: 2600, fcTo: 500, shape: 2 });
      voice({ f: big ? 170 : 250, to: big ? 640 : 760, dur: big ? .3 : .19, type: 'triangle', vol: .12, fc: 3200, at: .015 });
      if (big) swell({ dur: .7, att: .12, fc: 800, fcPeak: 3200, fcTo: 600, q: .8, vol: .09, at: .05 });
    },
    crGulp() {
      voice({ f: 250, to: 72, dur: .2, type: 'sine', vol: .17, fc: 900, drive: 1.6 });
      hit({ dur: .1, vol: .09, fc: 900, fcTo: 200, shape: 1.4, at: .04 });
      voice({ f: 150, to: 58, dur: .16, type: 'sine', vol: .12, at: .17 });
    },
    /* ---- the territory game ----
       Claiming is the whole point of it, so it gets a chord rather than a
       blip, and the chord opens wider the more ground the loop took in. */
    turfClaim(frac) {
      const base = 330 * semis(frac > .10 ? 7 : frac > .04 ? 4 : 0);
      [0, 4, 7, 11].forEach((n, i) =>
        voice({ f: base * semis(n), dur: .34 - i * .03, type: 'triangle',
                vol: .085 - i * .012, at: i * .035, fc: 7000, send: .3, att: .004 }));
      hit({ dur: .05, vol: .10, fc: 5200, fcTo: 900 });
    },
    /* somebody's line being clipped: a snap with a falling tail */
    turfCut() {
      hit({ dur: .07, vol: .19, fc: 6500, fcTo: 700, shape: 1.5, send: .3 });
      voice({ f: 900, to: 200, dur: .17, type: 'sawtooth', vol: .07, fc: 3000, q: 3 });
    },
    /* your own ground going out from under you */
    turfLost() {
      voice({ f: 260, to: 70, dur: .55, type: 'triangle', vol: .13, fc: 2200, fcTo: 300, send: .35 });
      hit({ dur: .34, vol: .16, fc: 1400, fcTo: 90, shape: 1.6, send: .3 });
    },
    /* the count in, with the last one landing higher */
    turfTick(last) {
      voice({ f: last ? 880 : 520, dur: last ? .24 : .09, type: 'triangle',
              vol: last ? .14 : .09, fc: 6000, send: last ? .3 : .1 });
    },
    /* the flourish once a multi-line clear has finished falling */
    clearEnd(lines) {
      const base = 523.25 * semis(lines >= 4 ? 12 : lines >= 3 ? 7 : lines >= 2 ? 5 : 0);
      voice({ f: base, dur: .30, type: 'triangle', vol: .10, send: .35, at: .02 });
      voice({ f: base * 1.5, dur: .26, type: 'sine', vol: .06, send: .3, at: .05 });
    },

    /* ---- the fruit ----
       A cut is two sounds that have to arrive together: the blade going
       through, which is bright, short and mostly air, and the fruit itself,
       which is wet and pitched low. Splitting them is what stops twenty slices
       in a row sounding like one sample on repeat — the whoosh is jittered
       hard and the body is pitched by how big the fruit was, so a watermelon
       lands a fifth under a strawberry. */
    ninjaSlice(size, n) {
      hit({ dur: .05, vol: .12, fc: 9000, fcTo: 2400, shape: 2.6, q: 1.4, jit: .18 });
      const f = 520 / (0.7 + size * 0.9);
      voice({ f: f * 1.6, to: f, dur: .11, type: 'triangle', vol: .10, fc: 5200, fcTo: 1200, att: .003 });
      /* every fruit in one swipe steps up the scale, so a combo is audibly a
         run rather than the same note five times */
      if (n > 1) voice({ f: 660 * semis(Math.min(16, (n - 1) * 2)), dur: .13, type: 'triangle',
                         vol: .075, fc: 8000, send: .28, at: .015 });
    },
    /* the cross-section landing — a short wet slap under the cut */
    ninjaSplat() {
      hit({ dur: .08, vol: .09, fc: 1500, fcTo: 260, shape: 1.8 });
    },
    /* a throw: cloth and air, nothing pitched, so it never competes with a cut */
    ninjaToss() {
      hit({ dur: .13, vol: .035, fc: 2400, fcTo: 700, shape: 1.2, q: 1.6, jit: .3 });
    },
    ninjaCombo(n) {
      [0, 4, 7, 12].forEach((s, i) =>
        voice({ f: 392 * semis(s + Math.min(12, (n - 3) * 2)), dur: .38 - i * .04,
                type: 'triangle', vol: .095 - i * .012, at: i * .055, fc: 8000, send: .38 }));
    },
    /* a life gone: the wooden knock of fruit hitting the floor, then a flat
       falling second. Deliberately dull — it is the sound of nothing happening */
    ninjaMiss(left) {
      hit({ dur: .07, vol: .12, fc: 1000, fcTo: 160, shape: 2.2 });
      voice({ f: 300 - (2 - left) * 40, to: 150, dur: .26, type: 'triangle', vol: .11, fc: 1800, fcTo: 400 });
    },
    ninjaBomb() {
      hit({ dur: .45, vol: .30, fc: 2200, fcTo: 70, shape: 1.3, send: .4 });
      voice({ f: 150, to: 34, dur: .40, type: 'sine', vol: .24, fc: 900, fcTo: 110 });
      voice({ f: 82, to: 28, dur: .48, type: 'triangle', vol: .17, at: .012 });
    },
    /* the fuse, ticking while a bomb is in the air */
    ninjaFuse() {
      hit({ dur: .02, vol: .05, fc: 9000, fcTo: 4000, shape: 3, jit: .25 });
    },

    /* ---- flappy bird ----
       The five sounds the original is made of, and nothing else: the wing on
       every tap, the ding through every gap, the smack of a collision, the
       whistle all the way down after a pipe, and the swoosh between screens.
       The pitched ones hardly vary between calls (jit near zero): the ding
       is the same ding every time, which is half of why it is so satisfying. */
    /* a quick "fwip" of air, with the second half of the beat right behind */
    flapWing() {
      swell({ dur: .12, att: .022, fc: 650, fcPeak: 2800, fcTo: 1100, q: 1.3, vol: .17 });
      swell({ dur: .085, att: .012, fc: 1600, fcPeak: 4200, fcTo: 2200, q: 1.8, vol: .068, at: .028 });
      voice({ f: 150, to: 95, dur: .07, type: 'sine', vol: .051 });
    },
    /* the ding: a grace note up into a bright bell */
    flapPoint() {
      voice({ f: 1318.5, dur: .05, type: 'square', vol: .028, fc: 5200, att: .004, jit: .004 });
      ring({ f: 1760, ratio: 2, index: 1.1, dur: .55, vol: .074, at: .045, send: .2, dim: .1, jit: .004 });
      voice({ f: 1760, dur: .3, type: 'triangle', vol: .025, at: .045, jit: .004 });
      voice({ f: 3520, dur: .16, type: 'sine', vol: .015, at: .05, jit: .004 });
    },
    /* a pipe or the ground: one hard smack */
    flapHit() {
      hit({ dur: .045, vol: .32, fc: 8000, fcTo: 1400, shape: 1.8 });
      voice({ f: 240, to: 70, dur: .1, type: 'square', vol: .1, fc: 2600, fcTo: 300, att: .001 });
      voice({ f: 110, to: 42, dur: .16, type: 'sine', vol: .26, att: .002, drive: 2 });
    },
    /* the fall after a pipe: a slide-whistle "fwoooo" with air around it.
       `at` lets it land just behind the smack, the way the original does */
    flapDie(at) {
      const a = at || 0;
      voice({ f: 880, to: 170, dur: .6, type: 'triangle', vol: .12, fc: 4200, fcTo: 900, att: .015, at: a, send: .15, jit: .004 });
      voice({ f: 440, to: 85, dur: .6, type: 'square', vol: .025, fc: 2000, fcTo: 400, att: .015, at: a, jit: .004 });
      swell({ dur: .55, att: .08, fc: 1800, fcPeak: 2600, fcTo: 500, q: .9, vol: .06, at: a });
    },
    /* between screens: a soft whoosh */
    flapSwoosh() {
      swell({ dur: .45, att: .17, fc: 280, fcPeak: 2400, fcTo: 600, q: .8, vol: .079, send: .12 });
      swell({ dur: .4, att: .15, fc: 900, fcPeak: 5200, fcTo: 1600, q: 1.4, vol: .022, at: .02 });
    },

    /* ---- Ball Brawl ----
       A blade into a ball: a smack with a bite to it, deeper and longer the
       harder it hit (p is 0..1). */
    bbHit(p) {
      const k = Math.max(0, Math.min(1, p || 0));
      hit({ dur: .05 + k * .05, vol: .2 + k * .1, fc: 5200 + k * 2000, fcTo: 500, shape: 1.8 });
      voice({ f: 190 - k * 70, to: 55, dur: .12 + k * .1, type: 'sine', vol: .2 + k * .1, drive: 2, att: .002 });
      if (k > .45) swell({ dur: .3, att: .02, fc: 1600, fcPeak: 3800, fcTo: 700, q: .8, vol: .06 * k, at: .01 });
    },
    /* weapon on weapon: a bright clang that rings off */
    bbClash() {
      hit({ dur: .025, vol: .16, fc: 8000, fcTo: 2600, shape: 2.2 });
      ring({ f: 1480, ratio: 1.41, index: 2.4, dur: .55, vol: .075, dim: .12, send: .3, jit: .02 });
      ring({ f: 2350, ratio: 2.76, index: 1.2, dur: .3, vol: .035, dim: .08, at: .004, jit: .02 });
    },
    /* a blow on the shield: duller, with more body */
    bbBlock() {
      hit({ dur: .05, vol: .18, fc: 2600, fcTo: 380, shape: 1.6 });
      ring({ f: 560, ratio: 1.5, index: 1.4, dur: .45, vol: .075, dim: .14, send: .25, jit: .02 });
      voice({ f: 150, to: 90, dur: .12, type: 'sine', vol: .12 });
    },
    /* ball on ball: a rubbery bonk, or a slam from something heavy */
    bbBump(big) {
      voice({ f: big ? 130 : 230, to: big ? 48 : 120, dur: big ? .26 : .09, type: 'sine', vol: big ? .3 : .15, drive: big ? 2.5 : 0 });
      hit({ dur: big ? .08 : .035, vol: big ? .18 : .08, fc: big ? 2400 : 1800, fcTo: 250 });
    },
    /* a ball off the rail: small, so a hundred of them are not tiring */
    bbWall(pan) {
      voice({ f: 340, to: 190, dur: .05, type: 'triangle', vol: .045, fc: 2400, pan });
      hit({ dur: .018, vol: .05, fc: 3000, fcTo: 900, pan });
    },
    /* the bow: a twang and the arrows' hiss */
    bbShoot() {
      voice({ f: 560, to: 190, dur: .13, type: 'triangle', vol: .08, fc: 3200, fcTo: 900 });
      swell({ dur: .22, att: .03, fc: 1800, fcPeak: 5200, fcTo: 2600, q: 1.4, vol: .05 });
    },
    bbDeflect() { ring({ f: 3100, ratio: 1.41, index: .8, dur: .12, vol: .04, dim: .04 }); hit({ dur: .015, vol: .08, fc: 7000, fcTo: 2500 }); },
    /* a bomb put down, fizzing */
    bbDrop() {
      hit({ dur: .03, vol: .1, fc: 1600, fcTo: 400 });
      crackle({ dur: .35, rate: 70, fc: 3500, vol: .05, at: .02 });
    },
    /* and going off: the crack, the rush, the thump, the grit */
    bbBoom(big) {
      const k = big ? 1 : .75;
      hit({ dur: .06, vol: .17 * k, fc: 9000, fcTo: 1400, shape: 2.2 });
      hit({ dur: .9, vol: .19 * k, fc: 3000, fcTo: 120, shape: 1.2, send: .35 });
      voice({ f: 110, to: 32, dur: .75, type: 'sine', vol: .2 * k, fc: 900, fcTo: 90, drive: 3, att: .002 });
      crackle({ dur: .8, rate: 80, fc: 2400, vol: .08 * k, at: .05 });
    },
    bbFade() { swell({ dur: .55, att: .22, fc: 420, fcPeak: 2600, fcTo: 700, q: 2.2, vol: .09, send: .5 }); },
    bbHeal() { [0, 4, 7].forEach((n, i) => voice({ f: 740 * semis(n), dur: .2, type: 'sine', vol: .05, at: i * .045, send: .35 })); },
    bbFreeze() { ring({ f: 2800, ratio: 2, index: .9, dur: .5, vol: .04, dim: .2, send: .45 }); hit({ dur: .03, vol: .06, fc: 7000, fcTo: 3000 }); },
    bbGrow() { voice({ f: 80, to: 150, dur: .32, type: 'sawtooth', vol: .07, fc: 500, fcTo: 1400, drive: 2 }); },
    /* something thrown: a boomerang's whirr, a star's zip, a spell's shimmer */
    bbThrow(what) {
      if (what === 'spell') {
        [0, 4, 7].forEach((n, i) => voice({ f: 660 * semis(n), to: 990 * semis(n), dur: .16, type: 'sine', vol: .035, at: i * .03, send: .45 }));
        swell({ dur: .3, att: .08, fc: 1400, fcPeak: 5200, fcTo: 2400, q: 2, vol: .04, send: .3 });
      } else if (what === 'star') {
        swell({ dur: .14, att: .03, fc: 2600, fcPeak: 7000, fcTo: 3600, q: 1.6, vol: .06 });
        ring({ f: 3400, ratio: 1.41, index: .6, dur: .1, vol: .02, dim: .04 });
      } else {
        swell({ dur: .3, att: .07, fc: 500, fcPeak: 2600, fcTo: 900, q: 2.2, vol: .08 });
        voice({ f: 180, to: 260, dur: .22, type: 'triangle', vol: .03, fc: 900 });
      }
    },
    /* a boomerang back in hand: a woody tock */
    bbCatch() { voice({ f: 520, to: 360, dur: .06, type: 'triangle', vol: .08, fc: 2200 }); hit({ dur: .02, vol: .06, fc: 2600, fcTo: 900 }); },
    /* the laser winding up, and letting go */
    bbCharge() {
      voice({ f: 240, to: 1500, dur: 1, type: 'sawtooth', vol: .028, fc: 900, fcTo: 4200, att: .25 });
      voice({ f: 480, to: 3000, dur: 1, type: 'sine', vol: .018, att: .3 });
    },
    bbBeam(hit2) {
      voice({ f: 2400, to: 180, dur: .28, type: 'square', vol: .06, fc: 5000, fcTo: 700 });
      voice({ f: 1200, to: 90, dur: .32, type: 'sawtooth', vol: .05, fc: 3000, fcTo: 400, drive: 2 });
      hit({ dur: .08, vol: .1, fc: 7000, fcTo: 1500 });
      if (hit2) voice({ f: 140, to: 50, dur: .3, type: 'sine', vol: .18, drive: 2.5, at: .01 });
    },
    /* a shock: a snap and a buzz */
    bbZap() {
      crackle({ dur: .16, rate: 420, fc: 3800, vol: .12, grain: 3 });
      voice({ f: 110, to: 96, dur: .14, type: 'square', vol: .045, fc: 1800, q: 4 });
      hit({ dur: .03, vol: .1, fc: 9000, fcTo: 3000 });
    },
    /* the cactus letting fly: a burst of air and needles ticking off */
    bbSpray() {
      swell({ dur: .22, att: .04, fc: 1200, fcPeak: 5200, fcTo: 2000, q: 1.2, vol: .07 });
      crackle({ dur: .25, rate: 160, fc: 5000, vol: .07, grain: 2 });
    },
    /* the katana going for it */
    bbDash() {
      swell({ dur: .32, att: .05, fc: 380, fcPeak: 4200, fcTo: 800, q: 1.4, vol: .1 });
      ring({ f: 1900, ratio: 2.76, index: .7, dur: .25, vol: .03, dim: .1, at: .05 });
    },
    /* a star off the wall */
    bbPing() { ring({ f: 2900, ratio: 1.41, index: .5, dur: .07, vol: .018, dim: .03 }); },
    /* a burn: a short sizzle */
    bbBurn() { crackle({ dur: .22, rate: 110, fc: 3200, vol: .06 }); swell({ dur: .2, att: .03, fc: 2000, fcPeak: 4200, fcTo: 1800, vol: .025 }); },
    /* the saw biting: a rasp */
    bbSaw() {
      voice({ f: 190, to: 150, dur: .13, type: 'sawtooth', vol: .05, fc: 2400, fcTo: 900, drive: 2.2 });
      hit({ dur: .06, vol: .07, fc: 5200, fcTo: 1600, ftype: 'bandpass', q: 3 });
    },
    /* the knockout: an impact with everything in it, and the pieces coming
       down after */
    bbKO() {
      hit({ dur: .09, vol: .28, fc: 9000, fcTo: 900, shape: 1.8 });
      voice({ f: 150, to: 34, dur: .9, type: 'sine', vol: .26, drive: 3, att: .002 });
      hit({ dur: 1.1, vol: .14, fc: 2600, fcTo: 140, shape: 1.3, send: .5 });
      ring({ f: 880, ratio: 2.76, index: 2, dur: .9, vol: .05, dim: .3, send: .4 });
      crackle({ dur: 1.3, rate: 70, fc: 3000, vol: .09, at: .1, grain: 8 });
    },
    /* a heart breaking: glass */
    bbHeart() {
      ring({ f: 1900, ratio: 2.1, index: 1.4, dur: .6, vol: .06, dim: .15, send: .4 });
      ring({ f: 2600, ratio: 1.41, index: 1, dur: .4, vol: .04, at: .03 });
      crackle({ dur: .6, rate: 140, fc: 4500, vol: .08, grain: 4 });
      voice({ f: 330, to: 200, dur: .3, type: 'triangle', vol: .06, at: .05 });
    },
    /* the cards: pointing at one, turning them over, taking one */
    bbHover() { hit({ dur: .012, vol: .09, fc: 4200, fcTo: 2400, ftype: 'bandpass', q: 2, shape: 2.6 }); },
    bbFlip() { swell({ dur: .16, att: .05, fc: 1200, fcPeak: 4800, fcTo: 2000, q: 1.2, vol: .06 }); hit({ dur: .015, vol: .08, fc: 5000, fcTo: 2500, at: .12 }); },
    bbPick() {
      voice({ f: 523.3, dur: .09, type: 'triangle', vol: .09, fc: 5000 });
      voice({ f: 784, dur: .22, type: 'triangle', vol: .09, fc: 6000, at: .07, send: .3 });
      swell({ dur: .3, att: .08, fc: 900, fcPeak: 4200, fcTo: 1600, q: 1, vol: .05 });
    },
    bbLock() {
      hit({ dur: .04, vol: .16, fc: 2200, fcTo: 400 });
      voice({ f: 110, to: 70, dur: .1, type: 'sine', vol: .16 });
      ring({ f: 1318.5, ratio: 2, index: .9, dur: .4, vol: .05, at: .03, send: .3 });
    },
    /* VS: two sides meeting, and the word coming down between them */
    bbVs() {
      swell({ dur: .5, att: .4, fc: 300, fcPeak: 3600, fcTo: 3000, q: .8, vol: .09 });
      hit({ dur: .12, vol: .24, fc: 6000, fcTo: 500, shape: 1.6, at: .42 });
      voice({ f: 98, to: 40, dur: .6, type: 'sine', vol: .26, drive: 3, at: .42 });
      ring({ f: 740, ratio: 1.41, index: 2, dur: .7, vol: .05, at: .43, send: .4 });
    },
    bbFight() {
      [0, 7, 12].forEach(n => voice({ f: 196 * semis(n), dur: .45, type: 'sawtooth', vol: .04, fc: 2600, fcTo: 900, send: .3 }));
      hit({ dur: .1, vol: .22, fc: 7000, fcTo: 700, shape: 1.6 });
      voice({ f: 110, to: 45, dur: .35, type: 'sine', vol: .22, drive: 2.5 });
    },
    /* the last seconds of a pick or an aim */
    bbTick(last) { voice({ f: last ? 1318.5 : 988, dur: .06, type: 'square', vol: .06, fc: 3600, att: .002 }); },
    /* a round won or lost */
    bbRound(won) {
      if (won) [0, 4, 7, 12].forEach((n, i) => voice({ f: 523.3 * semis(n), dur: .3, type: 'triangle', vol: .075, at: i * .07, send: .35 }));
      else [7, 3, 0].forEach((n, i) => voice({ f: 311 * semis(n), dur: .32, type: 'triangle', vol: .07, at: i * .1, fc: 2400 }));
    }
  };
  return S;
})();

