/* SocSound: soccer's own effects, a handful synthesised like the arcade's
   (no samples), on a context of their own. The arcade's mute silences
   them too; the test page has no Sound and is never muted. */
const SocSound = (() => {
  let ac = null, master = null, noiseBuf = null;
  function ctx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
  function tone(type, f0, f1, dur, vol, at = 0) {
    const c = ctx(), t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, .004, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(freq, q, dur, vol, at = 0, attack = .004) {
    const c = ctx(), t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    env(g, t, attack, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + attack + dur + .05);
  }
  const fx = {
    kick(p = 1) { tone('sine', 150, 50, .12, .5 * p); noise(1800, 1.2, .05, .25 * p); },
    pass() { tone('sine', 190, 70, .08, .3); noise(2200, 1.5, .03, .12); },
    bounce(p = 1) { tone('sine', 120, 60, .07, .22 * p); },
    header() { tone('triangle', 260, 120, .09, .3); noise(1400, 1, .04, .15); },
    tackle() { noise(700, .8, .22, .35); tone('sine', 90, 45, .15, .3); },
    post() { tone('square', 880, 860, .35, .08); tone('sine', 1320, 1300, .45, .1); },
    net() { noise(3200, .7, .35, .18, 0, .02); },
    whistle(n = 1) { for (let i = 0; i < n; i++) { tone('sine', 2900, 2750, i === n - 1 ? .5 : .16, .12, i * .22); tone('square', 2900, 2750, i === n - 1 ? .5 : .16, .02, i * .22); } },
    cheer() { noise(1100, .5, 1.8, .3, 0, .25); noise(2400, .6, 1.4, .12, .1, .3); },
    catch() { tone('sine', 220, 110, .08, .3); noise(900, 1, .06, .15); },
    /* the ball off the boards: a hollow knock, louder the harder it hits */
    board(p = 1) { tone('square', 120, 70, .07, .07 * p); tone('sine', 180, 90, .1, .28 * p); noise(500, .9, .06, .22 * p); },
    tick() { tone('square', 1200, 1200, .03, .05); }
  };
  const muted = () => { try { return typeof Sound !== 'undefined' && Sound.muted; } catch (e) { return false; } };
  return { play(name, ...a) { if (muted()) return; try { fx[name] && fx[name](...a); } catch (e) {} } };
})();
