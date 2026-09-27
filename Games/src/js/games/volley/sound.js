/* VolSound: the beach's own sounds, synthesised like the arcade's (no
   samples), on a context of their own: the thump of a bump, the slap of a
   spike, the ball into the sand, the net, the umpire's whistle, the crowd,
   and the sea and the gulls behind it all. The arcade's mute silences them
   too; the test page has no Sound and is never muted. */
const VolSound = (() => {
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
  function noise(freq, q, dur, vol, at = 0, attack = .004, type = 'bandpass') {
    const c = ctx(), t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, attack, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + attack + dur + .05);
  }
  const fx = {
    /* the ball off the forearms: a padded thump */
    bump(p = 1) { tone('sine', 210, 90, .1, .42 * p); noise(900, 1.1, .05, .2 * p); },
    /* off the fingers: lighter and higher */
    set() { tone('triangle', 420, 300, .06, .2); noise(2600, 2, .025, .08); },
    /* a spike: a hard slap and the punch behind it */
    spike(p = 1) { noise(3200, .9, .05, .45 * p); tone('sine', 240, 55, .15, .5 * p); noise(900, .7, .08, .2 * p, .01); },
    serve(p = 1) { tone('sine', 230, 110, .08, .36 * p); noise(2100, 1.3, .04, .2 * p); },
    block() { tone('sine', 170, 65, .13, .45); noise(1300, .8, .08, .32); noise(3000, 1, .03, .15); },
    /* into the sand: a soft, dry crunch */
    sand(p = 1) { noise(380, .7, .24, .34 * p, 0, .006, 'lowpass'); noise(1500, .9, .08, .08 * p); tone('sine', 95, 45, .1, .18 * p); },
    dive() { noise(520, .6, .32, .3, 0, .02, 'lowpass'); noise(1800, 1.2, .12, .05, .05); },
    land(p = 1) { noise(420, .8, .1, .14 * p, 0, .005, 'lowpass'); },
    net() { noise(1900, .6, .3, .16, 0, .01); tone('sine', 140, 90, .12, .12); },
    tape() { tone('triangle', 520, 380, .12, .12); noise(1800, 1, .1, .1); },
    whistle(n = 1) { for (let i = 0; i < n; i++) { tone('sine', 2900, 2750, i === n - 1 ? .45 : .15, .12, i * .22); tone('square', 2900, 2750, i === n - 1 ? .45 : .15, .02, i * .22); } },
    cheer(p = 1) { noise(1100, .5, 1.8, .26 * p, 0, .25); noise(2400, .6, 1.4, .1 * p, .1, .3); },
    /* a disappointed crowd: a falling murmur */
    groan() { noise(600, .5, 1, .1, 0, .12, 'lowpass'); tone('sine', 260, 170, .9, .025); },
    clap() { for (let i = 0; i < 7; i++) noise(2400, 1.5, .03, .05, i * .12 + Math.random() * .05); },
    /* the sea behind it all: a wave rolling in and hissing out */
    wave() { noise(520, .4, 2.6, .045, 0, 1.2, 'lowpass'); noise(1600, .5, 1.9, .018, .5, 1); },
    /* a gull: two falling cries */
    gull() { for (const at of [0, .24]) { tone('triangle', 1800, 1250, .17, .025, at); tone('sine', 3600, 2500, .14, .006, at); } },
    tick() { tone('square', 1200, 1200, .03, .05); }
  };
  const muted = () => { try { return typeof Sound !== 'undefined' && Sound.muted; } catch (e) { return false; } };
  return { play(name, ...a) { if (muted()) return; try { fx[name] && fx[name](...a); } catch (e) {} } };
})();
