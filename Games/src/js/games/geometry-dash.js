/* ====================================================== GEOMETRY DASH ===== */
/* A one-button rhythm runner. The icon moves right at a fixed speed and never
   stops; the only input is the button, and every death puts you back at the
   start. That is the whole design, and it only works if three things are exact.

   - The ARCS ARE CONSTANTS. A jump rises two blocks and falls two, a pink pad
     throws you a block and a half, a UFO flap is always the same hop. Players
     learn each arc in seconds and then read the level through it, so nothing
     here quietly varies one — no press-length, no air control, no frame
     dependence.
   - COLLISION IS ASYMMETRIC ON PURPOSE. Landing on top of a block is free;
     touching the same block anywhere else is death. Spikes and saws use a
     hitbox well inside their art, because a spike that kills on the pixel is a
     spike that feels broken.
   - THE LEVEL IS NOT A TILE MAP. It is a sequence of named patterns — a gap,
     three spikes, a staircase, a wave corridor — laid end to end. Tuning a
     level means moving one number in one pattern.

   Five vehicles share one simulation: the cube jumps, the ship flies while
   held, the ball flips gravity when it touches down, the UFO hops once per
   tap, and the wave rides a forty-five degree line up while held and down
   while not. Pads and orbs come in three colours — yellow for a full jump,
   pink for a short one, blue to turn you over.

   ONE BUTTON IS NOT ONE IDEA, and the pattern vocabulary is where that gets
   proved. A gate is a wall with a slot in it, so the jump is aimed rather than
   merely taken. A duct is a ceiling two cells up — which is exactly the apex,
   so it takes the button away entirely and the level becomes the openings. A
   bridge is the same arc with nothing underneath. A channel is a corridor cut
   at forty-five degrees, which is the wave's own slope and the only shape it
   is really built for. And a saw can travel: `sawM` runs a blade along a rail,
   phased off the runner's own column rather than a clock, so where it is when
   you reach it is one number in one pattern and not a consequence of
   everything upstream of it.

   Every level is verified rather than eyeballed: the physics is a pure
   function of a small plain state object, so a search over press timings can
   play each one start to finish. All twelve are known to be completable with a
   decision every 50ms, and every one but the tightest wave channel with a
   decision every 100ms.

   ONLINE it is a race of up to four. Everyone picks the level together (the
   host chooses), counts down together, and gets one life. Each player runs
   their own simulation and sends a keyframe a few times a second; everybody
   else re-runs that keyframe forward through the same deterministic physics,
   so a ghost moves exactly like the real thing between packets instead of
   sliding between samples. When you are out you spectate whoever is still
   going, and the results come up when the last one falls or finishes.

   Drawn in WebGL — one instanced quad, sprites baked into an atlas at the
   density they are shown at, flat colour. There is a canvas fallback that
   walks the same draw list, because a locked-down school machine without
   WebGL2 should still get the game rather than a black box. */
registerGame({
  id: 'gdash',
  title: 'Geometry Dash',
  tagline: 'Twelve remixed courses, twelve original electronic soundtracks. Fly through neon cities, gravity tunnels and industrial drops with upgraded vehicles and live beat effects.',
  tags: ['Arcade', 'Timing', 'One button', 'Skill', 'Action', 'Online'],
  scoreLabel: 'Best %',
  mp: 'race', mpMin: 2, mpMax: 4,
  w: 960, h: 600,
  fluid: true, maxW: 1420,
  front: true,
  /* No options panel. Picking a level from a list of pill buttons before the
     game has drawn a single frame tells you nothing about what you are
     choosing; the select screen inside the game runs each level behind its own
     card instead, so you see what you are picking before you pick it. Online,
     the same screen is the lobby. */
  controls: [
    ['Jump / fly / flip / hop', 'Space / W / &uarr; / click'],
    ['Choose a level', '&larr; &rarr; then Enter'],
    ['Practice mode', 'P on the select screen'],
    ['Place checkpoint', 'Z &mdash; practice mode'],
    ['Retry / back to levels', 'R / Backspace'],
    ['Online: watch someone else', '&larr; &rarr; while you are out'],
    ['Music on / off', 'M'],
    ['Music volume', '[ / ]'],
    ['Pause', 'Esc']
  ],
  art: '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><rect width="320" height="180" fill="#2a6bf0"/><g fill="#255fd6" stroke="#4a82f2" stroke-width="2"><rect x="-10" y="16" width="70" height="70"/><rect x="104" y="-24" width="58" height="58"/><rect x="196" y="40" width="74" height="74"/><rect x="286" y="-8" width="50" height="50"/></g><rect y="136" width="320" height="44" fill="#1a47bd"/><rect y="154" width="320" height="26" fill="#153a9a"/><rect y="134" width="320" height="4" fill="#fff"/><g stroke="#153a9a" stroke-width="2"><path d="M40 138v42M100 138v42M160 138v42M220 138v42M280 138v42"/></g><g fill="#0b0a16" stroke="#fff" stroke-width="3" stroke-linejoin="miter"><path d="M150 134l14-28 14 28z"/><path d="M178 134l14-28 14 28z"/></g><g><rect x="226" y="94" width="40" height="40" fill="#0b0a16"/><rect x="229" y="97" width="34" height="37" fill="none" stroke="#fff" stroke-width="3"/></g><path d="M86 128h38v6H86z" fill="#0b0a16"/><path d="M89 128a16 13 0 0 1 32 0z" fill="#ffd43b" stroke="#0b0a16" stroke-width="3"/><g fill="none" stroke-linejoin="miter"><path d="M97 112l8-7 8 7" stroke="#0b0a16" stroke-width="6"/><path d="M97 112l8-7 8 7" stroke="#ffd43b" stroke-width="3"/><path d="M97 99l8-7 8 7" stroke="#0b0a16" stroke-width="6"/><path d="M97 99l8-7 8 7" stroke="#ffd43b" stroke-width="3"/></g><g transform="rotate(-22 60 76)"><rect x="41" y="57" width="38" height="38" rx="4" fill="#0b0a16"/><rect x="44.5" y="60.5" width="31" height="31" rx="2" fill="#ffd43b"/><rect x="44.5" y="85" width="31" height="6.5" fill="#f39a1c"/><rect x="47" y="63" width="26" height="26" rx="1.5" fill="none" stroke="#0b0a16" stroke-width="2"/><path d="M50.5 68.5l7.5 2.6v6.9h-7.5zM69.5 68.5l-7.5 2.6v6.9h7.5z" fill="#0b0a16"/><path d="M52 71l4.5 1.5v4h-4.5zM68 71l-4.5 1.5v4h4.5z" fill="#33e4ff"/><rect x="53.5" y="81.5" width="13" height="3" fill="#0b0a16"/></g><g transform="rotate(12 22 56)"><rect x="8" y="42" width="28" height="28" rx="3" fill="#0b0a16"/><rect x="10.5" y="44.5" width="23" height="23" rx="2" fill="#ff5fb8"/><path d="M14 50l6 2v5h-6zM30 50l-6 2v5h6z" fill="#0b0a16"/></g><g fill="#fff"><rect x="18" y="120" width="5" height="5"/><rect x="8" y="112" width="4" height="4"/></g></svg>',

  mount(api) {
    /* Twelve original arrangements. Transport follows simulation time, so a
       retry, checkpoint, speed portal, or pause never leaves the song behind. */
    const TRACKS = {
      drift: {title:'Chromatic Sunrise',genre:'melodic house',bpm:124,root:50,scale:[0,2,4,5,7,9,11],chords:[0,4,5,3],lead:[0,2,4,7,6,4,2,4,5,4,2,0,2,4,1,2],groove:0,tone:'triangle'},
      ironworks:{title:'Steel Heart',genre:'industrial electro',bpm:132,root:40,scale:[0,2,3,5,7,8,10],chords:[0,0,5,3],lead:[0,0,4,-1,2,0,6,4,0,2,4,2,6,4,2,-1],groove:1,tone:'sawtooth'},
      bounce:{title:'Candy Comet',genre:'future bounce',bpm:128,root:53,scale:[0,2,4,5,7,9,11],chords:[0,5,3,4],lead:[4,7,4,2,0,-1,2,4,5,7,9,7,4,2,1,4],groove:0,tone:'square'},
      static:{title:'Radio Afterglow',genre:'synthwave',bpm:118,root:45,scale:[0,2,3,5,7,8,10],chords:[0,5,3,6],lead:[0,4,7,6,4,2,0,-1,3,5,7,9,7,5,4,-1],groove:2,tone:'sawtooth'},
      deepsix:{title:'Under the Current',genre:'liquid drum & bass',bpm:168,root:43,scale:[0,2,3,5,7,9,10],chords:[0,3,5,4],lead:[7,-1,4,2,0,2,4,-1,5,-1,9,7,5,4,2,4],groove:3,tone:'sine'},
      saucer:{title:'Hello, Tomorrow',genre:'space disco',bpm:122,root:48,scale:[0,2,4,5,7,9,10],chords:[0,3,1,4],lead:[0,2,4,6,7,6,4,-1,9,7,6,4,2,4,6,7],groove:4,tone:'triangle'},
      sawmill:{title:'Timberline',genre:'breakbeat',bpm:138,root:41,scale:[0,2,3,5,7,8,10],chords:[0,3,0,6],lead:[0,-1,0,4,2,0,6,-1,4,2,0,2,3,4,2,-1],groove:3,tone:'square'},
      fault:{title:'Seismic Shift',genre:'bass house',bpm:140,root:38,scale:[0,1,3,5,7,8,10],chords:[0,5,3,1],lead:[0,7,0,-1,3,2,0,4,0,7,6,4,3,-1,2,0],groove:1,tone:'sawtooth'},
      skyline:{title:'Above the Noise',genre:'progressive trance',bpm:136,root:47,scale:[0,2,3,5,7,8,10],chords:[0,5,3,6],lead:[0,4,7,11,9,7,4,2,5,9,12,11,9,7,5,4],groove:0,tone:'triangle'},
      wave:{title:'Laser Tide',genre:'chiptune trance',bpm:150,root:45,scale:[0,2,3,5,7,8,10],chords:[0,6,5,3],lead:[0,7,4,7,2,9,4,9,5,12,9,12,4,11,7,11],groove:0,tone:'square'},
      overclock:{title:'Redline Protocol',genre:'neuro drum & bass',bpm:174,root:36,scale:[0,2,3,5,6,8,10],chords:[0,0,5,3],lead:[0,4,7,-1,6,4,2,0,0,7,6,4,3,2,0,-1],groove:3,tone:'sawtooth'},
      meltdown:{title:'Core Collapse',genre:'cinematic electro',bpm:144,root:42,scale:[0,2,3,5,7,8,11],chords:[0,5,3,4],lead:[0,4,7,6,4,2,3,4,5,9,7,5,4,3,1,0],groove:1,tone:'sawtooth'}
    };
    function scoreEvents(track,index) {
      const beat=60/track.bpm,sixteenth=beat/4,bar=Math.floor(index/16),s=index%16;
      const section=Math.floor(bar/4)%8,drop=section===1||section===3||section>=5,bridge=section===4;
      const degree=track.chords[Math.floor(bar/2)%4],events=[];
      const note=(d,oct=0)=>track.root+track.scale[((d%7)+7)%7]+12*(Math.floor(d/7)+oct);
      const add=(voice,n,dur,vol,pan=0)=>events.push({voice,n,dur,vol,pan});
      const breaks=track.groove===3,half=track.groove===1;
      if(!bridge||s===0){
        if(breaks?[0,6,10].includes(s):(half?[0,7,10].includes(s):s%4===0))add('kick',0,.32,bridge?.5:.9);
        if(breaks?[4,12].includes(s):half?s===8:s===4||s===12)add('snare',0,.17,.48);
        if(s%2===0||drop&&s%4===3)add('hat',0,s%4===2?.085:.035,s%4===2?.16:.08, s%4===0?-.25:.25);
        if(drop&&bar%4===3&&s>=12)add('snare',0,.08,.1+(s-12)*.04,0);
      }
      if(s===0){for(const [j,d]of [0,2,4,6].entries())add('pad',note(degree+d,1),beat*3.8,.032,[-.65,-.2,.25,.65][j]);if(bar%4===0)add('crash',0,1.1,.12);}
      if(!bridge&&(s%4===2||drop&&[0,7,11,14].includes(s))){add('bass',note(degree,-1)+(s===14?12:0),sixteenth*(s===2?1.7:1.3),.19);}
      // Four related phrases: motif, answer, octave lift, and turnaround.
      if(s%2===0){const phrase=Math.floor(bar/2)%4,k=(s/2+(bar%2)*8)%16,d=track.lead[(k+(phrase===3?8:0))%16];
        if(d>=0&&(!bridge||s%4===0)){add('lead',note(d+(phrase===1?2:0),1)+(drop&&phrase===2?12:0),beat*(bridge?.72:.38),drop?.105:.075,(k%3-1)*.15);}}
      if(drop||section===2){const d=degree+[0,4,2,6][s%4];add('arp',note(d,2),sixteenth*.6,.029,(s%2?-.5:.5));}
      return events;
    }
    function createSoundtrack(){
      let context=null,bus=null,master=null,compressor=null,delay=null,feedback=null,wet=null,noise=null;
      let key='',clock=0,playing=false,next=0,anchor=0,lastSim=-1,lastTouch=0,disposed=false,unlocked=false;
      let enabled=api.load('gd-music-enabled',true)!==false,volume=clamp(+api.load('gd-music-volume',.65)||0,0,1),nodes=new Set();
      const freq=n=>440*Math.pow(2,(n-69)/12);
      function ensure(){if(context||disposed||!unlocked)return !!context;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
        try{context=new AC();bus=context.createGain();master=context.createGain();compressor=context.createDynamicsCompressor();
          compressor.threshold.value=-17;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.006;compressor.release.value=.15;
          bus.connect(compressor);compressor.connect(master);master.connect(context.destination);master.gain.value=0;
          delay=context.createDelay(2);feedback=context.createGain();wet=context.createGain();feedback.gain.value=.26;wet.gain.value=.15;delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(bus);
          noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=noise.getChannelData(0);let seed=4567;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}
        }catch(e){context=null;return false;}return true;
      }
      function unlock(){unlocked=true;if(!Sound.muted&&enabled&&ensure()&&context.state==='suspended')context.resume().catch(()=>{});}
      document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
      function remember(source,links){nodes.add(source);source.onended=()=>{nodes.delete(source);try{source.disconnect();for(const n of links)n.disconnect();}catch(e){}};}
      function voice(e,at,track){const ctx=context,g=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner();
        const percussive=['hat','snare','crash'].includes(e.voice),source=percussive?ctx.createBufferSource():ctx.createOscillator();
        const end=at+e.dur+.08;filter.type=percussive?'highpass':'lowpass';pan.pan.value=e.pan;
        if(percussive){source.buffer=noise;filter.frequency.value=e.voice==='hat'?6800:e.voice==='snare'?1200:3400;}
        else{source.type=e.voice==='kick'?'sine':e.voice==='pad'?'sawtooth':e.voice==='bass'?'sawtooth':e.voice==='arp'?'triangle':track.tone;
          if(e.voice==='kick'){source.frequency.setValueAtTime(145,at);source.frequency.exponentialRampToValueAtTime(43,at+.11);filter.frequency.value=1200;}
          else{source.frequency.value=freq(e.n);source.detune.value=e.voice==='pad'?e.pan*9:0;
            const cut=e.voice==='bass'?950:e.voice==='pad'?1900:e.voice==='lead'?3800:4800;
            filter.frequency.setValueAtTime(cut,at);filter.frequency.exponentialRampToValueAtTime(e.voice==='bass'?160:Math.max(600,cut*.38),at+e.dur);filter.Q.value=e.voice==='bass'?1.8:.65;}}
        const attack=e.voice==='pad'?.065:.005;
        g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,e.vol),at+attack);g.gain.exponentialRampToValueAtTime(.0001,end);
        source.connect(filter);filter.connect(g);g.connect(pan);pan.connect(bus);if(e.voice==='lead'||e.voice==='arp')pan.connect(delay);
        source.start(at);source.stop(end+.01);remember(source,[filter,g,pan]);
        if(e.voice==='snare'){const osc=ctx.createOscillator(),body=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(185,at);osc.frequency.exponentialRampToValueAtTime(95,at+.1);body.gain.setValueAtTime(e.vol*.35,at);body.gain.exponentialRampToValueAtTime(.0001,at+.12);osc.connect(body);body.connect(bus);osc.start(at);osc.stop(at+.13);remember(osc,[body]);}
      }
      function silence(){if(context&&master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(0,context.currentTime,.012);}playing=false;}
      function tick(){if(disposed||!playing||!context)return;if(Sound.muted||!enabled||api.paused||performance.now()-lastTouch>350){silence();return;}
        const tr=TRACKS[key],dur=60/tr.bpm/4;let guard=0;while(anchor+next*dur<context.currentTime+.12&&guard++<12){const at=anchor+next*dur;if(at>=context.currentTime+.003)for(const event of scoreEvents(tr,next))voice(event,at,tr);next++;}}
      const timer=setInterval(tick,30);
      function sync(k,seconds,play){clock=seconds;lastTouch=performance.now();if(!play||!enabled||Sound.muted||api.paused){silence();lastSim=seconds;return;}
        if(!ensure())return;if(context.state==='suspended')return;
        const tr=TRACKS[k],duration=60/tr.bpm/4,seek=k!==key||!playing||seconds<lastSim-.025||Math.abs(context.currentTime-(anchor+seconds-.035))>.16;
        if(seek){for(const n of [...nodes])try{n.stop();}catch(e){};key=k;anchor=context.currentTime+.035-seconds;next=Math.ceil(seconds/duration-1e-8);delay.delayTime.setValueAtTime(60/tr.bpm*.75,context.currentTime);}
        lastSim=seconds;playing=true;master.gain.setTargetAtTime(volume*.62,context.currentTime,.025);tick();
      }
      return {sync,silence,get enabled(){return enabled;},get volume(){return volume;},get active(){return playing;},get track(){return key;},
        toggle(){if(Sound.muted){Sound.setMuted(false);enabled=true;}else enabled=!enabled;api.save('gd-music-enabled',enabled);unlock();if(!enabled)silence();},
        adjust(d){volume=clamp(Math.round((volume+d)*100)/100,0,1);api.save('gd-music-volume',volume);},
        destroy(){disposed=true;clearInterval(timer);document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);for(const n of [...nodes])try{n.stop();}catch(e){}nodes.clear();if(context)context.close().catch(()=>{});},
        _dev:{scoreEvents,tracks:TRACKS,get voices(){return nodes.size;}}
      };
    }
    const music=createSoundtrack();
    function musicStatus(){return Sound.muted?'SOUND MUTED · M TO ENABLE':!music.enabled?'MUSIC OFF · M TO ENABLE':'MUSIC '+Math.round(music.volume*100)+'% · M TO MUTE · [ / ] VOLUME';}

    /* ---------------------------------------------------------- constants */
    const H = 600;
    let W = api.W;
    const ROWS = 13;                 // cells of headroom above the floor

    /* Everything below is in CELLS and SECONDS. Pixels appear once, in the
       camera, which is the only place they belong. */
    const SPEED = 10.4;              // cells per second, the cabinet's pace
    const JUMP_V = 16;               // straight up, for a two-cell apex
    const GRAV = 64;                 // 0.5s of air, ~5.2 cells covered
    const FALL_CAP = 34;             // nothing falls faster than this
    const SZ = 0.9;                  // the body, a shade under a cell
    const HW = SZ / 2;
    const EPSO = 0.03;               // overlap slack, so resting is not touching

    const SHIP_GRAV = 30;
    const SHIP_THRUST = 62;          // net +32 while held
    const SHIP_CAP = 13;

    const BALL_GRAV = 56;            // a flip crosses five cells in a third of a second
    const BALL_KICK = 3;
    const UFO_GRAV = 40;
    const UFO_V = 10.8;              // one tap is a hop of a block and a half
    const UFO_CAP = 16;
    const WAVE_SZ = 0.42;            // the wave is a dart, and its hitbox is too

    const PAD_V = 21;                // a yellow pad throws you about 3.4 cells
    const PAD_PINK_V = 14.5;         // a pink one, about 1.6
    const PAD_BLUE_V = 11;           // a blue one turns you over and throws you at the new floor
    const ORB_V = 15.4;              // a yellow orb is a touch under a normal jump
    const ORB_PINK_V = 11.2;         // a pink one, a hop
    const ORB_BLUE_V = 6;

    const MODES = { cube: 1, ship: 1, ball: 1, ufo: 1, wave: 1 };
    const MODE_ID = ['cube', 'ship', 'ball', 'ufo', 'wave'];

    /* --------------------------------------------------------------- colour */
    /* Bright beveled vehicles and crisp hazard outlines sit in front of muted
       parallax scenery. Musical pulses stay in the scenery, away from hitboxes. */
    const hex3 = h => {
      const n = parseInt(h.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };
    const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

    const INK = '#0b0a16';
    /* A player's two colours and the flat shades each is lit with. Online,
       everyone gets their own pair by seat, so four cubes in one jump are four
       different cubes; on your own you are always seat one. */
    const SLOTS = [
      { pri: '#ffd43b', sec: '#33e4ff' },
      { pri: '#ff5fb8', sec: '#a3ff47' },
      { pri: '#4dff9a', sec: '#b36bff' },
      { pri: '#ff8a3d', sec: '#4d8bff' }
    ].map(s => ({
      pri: s.pri, priHi: shade(s.pri, 0.55), priLo: shade(s.pri, -0.2),
      sec: s.sec, secHi: shade(s.sec, 0.7), secLo: shade(s.sec, -0.28),
      pri3: hex3(s.pri), sec3: hex3(s.sec), priLo3: hex3(s.pri).map(v => v * 0.8)
    }));
    const PADCOL = {
      yellow: { base: '#ffd43b', hi: '#fff4b8', lo: '#e8931a' },
      pink:   { base: '#ff6ad5', hi: '#ffd6f4', lo: '#c7359f' },
      blue:   { base: '#4fc3ff', hi: '#d4f1ff', lo: '#1d7fcf' }
    };
    const COINC = { base: '#ffc234', hi: '#fff0a6', lo: '#d4800f' };
    const PORTALC = {
      ship:     { base: '#ff4fc8', hi: '#ffc6ef', lo: '#a8198a' },
      cube:     { base: '#43f06a', hi: '#c9ffd6', lo: '#16a03e' },
      ball:     { base: '#ff5a3c', hi: '#ffd0c6', lo: '#b82a12' },
      ufo:      { base: '#ffa21f', hi: '#ffe3b8', lo: '#b86a00' },
      wave:     { base: '#39d7ff', hi: '#c9f4ff', lo: '#0f8fbf' },
      gravUp:   { base: '#ffdc2e', hi: '#fff5b3', lo: '#bf9200' },
      gravDown: { base: '#3fb5ff', hi: '#c7ebff', lo: '#1670c4' },
      fast:     { base: '#43f06a', hi: '#c9ffd6', lo: '#16a03e' },
      norm:     { base: '#3fb5ff', hi: '#c7ebff', lo: '#1670c4' },
      slow:     { base: '#ff9f1c', hi: '#ffe0b3', lo: '#bb6a00' }
    };
    const C3 = {
      white: [1, 1, 1], ink: hex3(INK), coin: hex3(COINC.base), cp: hex3('#4ade80'),
      pad: { yellow: hex3(PADCOL.yellow.base), pink: hex3(PADCOL.pink.base), blue: hex3(PADCOL.blue.base) }
    };
    for (const k in PORTALC) C3['portal_' + k] = hex3(PORTALC[k].base);

    /* A level is not one colour. It drifts through a handful as you go, which
       is most of what makes a long run feel like it is going somewhere — the
       same stretch of spikes in a different sky is a different place. `at` is
       the column the colour is fully in by; the change takes twelve cells. */
    const THEMES = {
      drift: [
        { at: 0,   bg: '#2a6bf0', gr: '#1a47bd' },
        { at: 140, bg: '#1896c8', gr: '#0e6597' },
        { at: 270, bg: '#6246e6', gr: '#3f28b3' },
        { at: 380, bg: '#2a6bf0', gr: '#1a47bd' }
      ],
      bounce: [
        { at: 0,   bg: '#c7348f', gr: '#8e1a66' },
        { at: 150, bg: '#7b3cec', gr: '#5222b4' },
        { at: 290, bg: '#e0357a', gr: '#a11c52' },
        { at: 420, bg: '#6d31d8', gr: '#4a1ea3' }
      ],
      static: [
        { at: 0,   bg: '#7a3ff0', gr: '#5125bf' },
        { at: 150, bg: '#d4309a', gr: '#9c1670' },
        { at: 310, bg: '#3657e8', gr: '#2034b4' },
        { at: 430, bg: '#8a35dc', gr: '#5f1ea8' }
      ],
      saucer: [
        { at: 0,   bg: '#e9701b', gr: '#a64a08' },
        { at: 160, bg: '#0e8f83', gr: '#07625a' },
        { at: 320, bg: '#d95a16', gr: '#9b3a07' },
        { at: 460, bg: '#b8327a', gr: '#801a53' }
      ],
      fault: [
        { at: 0,   bg: '#e0364f', gr: '#a31a33' },
        { at: 150, bg: '#ec6a1f', gr: '#b1440b' },
        { at: 320, bg: '#b8267e', gr: '#7f1257' },
        { at: 460, bg: '#e0364f', gr: '#a31a33' }
      ],
      wave: [
        { at: 0,   bg: '#0f86a8', gr: '#095b75' },
        { at: 160, bg: '#2451d6', gr: '#16339c' },
        { at: 320, bg: '#0c9a8f', gr: '#066a62' },
        { at: 470, bg: '#4a35c9', gr: '#2f1f94' }
      ],
      overclock: [
        { at: 0,   bg: '#b91c2e', gr: '#7a0f1c' },
        { at: 150, bg: '#24203f', gr: '#141128' },
        { at: 300, bg: '#9e1a5c', gr: '#6a0f3c' },
        { at: 460, bg: '#2b2340', gr: '#17122a' }
      ],
      /* iron and rust, because the level is a building */
      ironworks: [
        { at: 0,   bg: '#c2711a', gr: '#8a4a08' },
        { at: 150, bg: '#3f4a5c', gr: '#252d3b' },
        { at: 300, bg: '#a8571c', gr: '#75380a' },
        { at: 440, bg: '#4a4030', gr: '#2c261c' }
      ],
      /* underwater, and then further down than that */
      deepsix: [
        { at: 0,   bg: '#1173b8', gr: '#0a4c7c' },
        { at: 160, bg: '#0d4a8c', gr: '#072f5c' },
        { at: 320, bg: '#12897f', gr: '#095c55' },
        { at: 460, bg: '#0a3a70', gr: '#052448' }
      ],
      sawmill: [
        { at: 0,   bg: '#6f9c1a', gr: '#496a09' },
        { at: 150, bg: '#2f5c3a', gr: '#1b3a24' },
        { at: 300, bg: '#8aa81c', gr: '#5c730c' },
        { at: 450, bg: '#35604a', gr: '#1f3c2d' }
      ],
      /* dusk over a city, which is the only thing under this one */
      skyline: [
        { at: 0,   bg: '#7a41c9', gr: '#4f2694' },
        { at: 160, bg: '#c2418c', gr: '#8a2360' },
        { at: 320, bg: '#4b3fd0', gr: '#2c229c' },
        { at: 470, bg: '#8a3aa8', gr: '#5c1f75' }
      ],
      meltdown: [
        { at: 0,   bg: '#d4581a', gr: '#963709' },
        { at: 150, bg: '#2a1a2e', gr: '#170e1a' },
        { at: 300, bg: '#c4341f', gr: '#8a1c0d' },
        { at: 450, bg: '#3a1c24', gr: '#210f15' }
      ]
    };
    for (const k in THEMES) for (const s of THEMES[k]) { s.bg3 = hex3(s.bg); s.gr3 = hex3(s.gr); }
    const _theme = { bg: [0, 0, 0], gr: [0, 0, 0], block: [0, 0, 0], grLine: [0, 0, 0] };
    function themeAt(key, x) {
      const list = THEMES[key] || THEMES.drift;
      let i = 0;
      while (i < list.length - 1 && x >= list[i + 1].at) i++;
      const a = list[i], b = list[Math.min(i + 1, list.length - 1)];
      /* hold a colour until twelve cells before the next one, then cross */
      const k = b === a ? 0 : clamp((x - (b.at - 12)) / 12, 0, 1);
      const e = k * k * (3 - 2 * k);
      _theme.bg = mix3(a.bg3, b.bg3, e);
      _theme.gr = mix3(a.gr3, b.gr3, e);
      _theme.block = mix3(_theme.gr, C3.ink, 0.82);
      _theme.grLine = mix3(_theme.gr, C3.ink, 0.35);
      return _theme;
    }

    /* ------------------------------------------------------ level patterns */
    /* A pattern is a width and a list of things standing in it, placed in cells
       from the pattern's own left edge. `y` is cells up from the top of the
       floor, so `y:0` is standing on the ground whatever the pattern does
       around it. The floor is implicit; `pit` cuts a hole in it.

       Every shape below is sized off the arcs rather than off what looks
       right, because those are not the same thing. The numbers that matter:

         jump apex            +2.0 cells, ~5.2 cells of ground per jump
         height at +1 cell    +1.25 — so a one-cell rise per step is climbable
         yellow pad           apex +3.4, lands ~6.8 cells on
         pink pad             apex +1.6, lands ~4.7 cells on
         yellow orb           apex +1.85 from wherever you are
         pink orb             apex +1.0
         ball flip            five cells of height in a third of a second
         UFO tap              +1.5 cells, back down level after ~5.6 cells
         wave                 one cell up (or down) per cell forward

       The first draft of this file had one-cell-wide staircases and platforms
       four cells up. Both look completely normal and neither can be climbed at
       all. The search caught it; eyes did not. */
    const pat = (w, obs, extra) => Object.assign({ w: w, obs: obs || [] }, extra || {});
    const gap = n => pat(n, []);
    const spk = (x, y, o) => Object.assign({ t: 'spike', x: x, y: y || 0 }, o || {});
    const blk = (x, y) => ({ t: 'block', x: x, y: y });
    const padK = (x, kind, down, y) => ({ t: 'pad', x: x, y: y || 0, kind: kind || 'yellow', down: !!down });
    const orbK = (x, y, kind) => ({ t: 'orb', x: x, y: y, kind: kind || 'yellow' });
    const saw = (x, y, r) => ({ t: 'saw', x: x, y: y, r: r || 0.9 });
    /* A saw that slides. It runs a sine between (x,y)±(dx,dy), and the thing
       it reads is not a clock — it is the runner's own column. `per` is how
       many cells of travel one full sweep takes, and the sine is measured from
       the saw's own column, so `ph` says exactly one thing: where the blade is
       at the moment you are level with it. Nought is the middle of the rail,
       a quarter is the far end, three quarters the near one.

       Keying it to the clock instead was the first attempt and it was wrong in
       a way worth writing down. `t` and `x` are the same quantity here — the
       runner never stops — so it *worked*, but the phase a blade was found at
       then depended on how long everything before it took. Changing a gap
       forty patterns upstream moved every blade downstream of it, which is the
       opposite of what this file is for: one number, one pattern. */
    const sawM = (x, y, r, dx, dy, per, ph) =>
      ({ t: 'saw', x: x, y: y, r: r || 0.9, dx: dx || 0, dy: dy || 0, per: per || 8, ph: ph || 0 });
    /* where a saw is when the runner is at column `px` — the one place that
       answer is computed, so the hitbox, the sprite and the minimap cannot
       drift apart */
    const sawAt = (s, px) => {
      if (!s.dx && !s.dy) return s;
      const k = Math.sin(((px - s.x) / s.per + s.ph) * TAU);
      _sawP.x = s.x + s.dx * k; _sawP.y = s.y + s.dy * k; _sawP.r = s.r;
      return _sawP;
    };
    const _sawP = { x: 0, y: 0, r: 0 };
    /* a column of blocks from `y0` up to (not including) `y1` */
    const pillar = (x, y0, y1) => { const o = []; for (let y = y0; y < y1; y++) o.push(blk(x, y)); return o; };
    /* n spikes in a row, with clear ground either side to take off from */
    const spikes = (n, lead) => {
      const L = lead === undefined ? 3 : lead, o = [];
      for (let i = 0; i < n; i++) o.push(spk(L + i, 0));
      return pat(L + n + 4, o);
    };
    /* Small spikes are half as tall and their hitbox is lower still: the same
       jump clears them with room to spare, so a row of them is somewhere to
       relax the rhythm rather than tighten it. */
    const tiny = (n, lead) => {
      const L = lead === undefined ? 3 : lead, o = [];
      for (let i = 0; i < n; i++) o.push(spk(L + i, 0, { small: true }));
      return pat(L + n + 4, o);
    };
    /* a one-cell block run to hop onto and along, optionally spiked on top */
    const step = (len, top) => {
      const o = [], L = len || 3;
      for (let c = 0; c < L; c++) o.push(blk(4 + c, 0));
      if (top) o.push(spk(4 + L + 2, 0));
      return pat(4 + L + (top ? 6 : 4), o);
    };
    /* A staircase. Each tread is one cell higher than the last, which is the
       shallowest climb the arc actually makes: you land on a tread with room to
       spare and the next jump clears the riser.

       The tread WIDTH is the difficulty. Three cells is the default and it is
       tight — the search can climb a three-tread flight of them with a decision
       every 50ms but not with one every 100ms, which is the wrong side of fair
       for a level whose job is to teach. Four gives the arc somewhere to land
       that is not a single point. */
    const stair = (h, tw) => {
      const T = tw || 3, o = [];
      for (let i = 0; i < h; i++)
        for (let c = 0; c < T; c++)
          for (let r = 0; r <= i; r++) o.push(blk(4 + i * T + c, r));
      return pat(4 + h * T + 7, o);
    };
    /* A pad, and the spikes it is there to clear. A pad fires the moment you
       are within reach of it rather than when you are on top of it, so the arc
       starts about half a cell early and the whole run has to sit inside what
       is left. Four spikes is the most a yellow pad clears; a pink one, two. */
    const padOver = (n, kind) => {
      const k = Math.min(n, kind === 'pink' ? 2 : 4);
      const o = [padK(4, kind)];
      for (let i = 0; i < k; i++) o.push(spk(5 + i, 0));
      return pat(5 + k + 6, o);
    };
    /* A pit with an orb over it. A plain jump crosses about four and a half
       cells of hole; tapping the orb near the top of that arc roughly doubles
       it, so the orb is the crossing rather than a decoration on it. It sits
       two cells past the lip, which is where the arc actually is. */
    const orbGap = (w, kind) => {
      const W2 = Math.min(w === undefined ? 7 : w, kind === 'pink' ? 6 : 8);
      return pat(W2 + 12, [orbK(6, 2, kind)], { pit: [4, 4 + W2] });
    };
    /* There used to be a `padUp` here: a pad, and a one-cell-thick shelf
       floating three cells up for it to throw you onto. It was a decoy twice
       over. A yellow pad tops out at 3.45 cells, and landing on a shelf needs
       to have been above it, so the shelf at three could not be landed on at
       all; and because a pad only fires when you are low enough to touch it,
       jumping over the pad skipped the whole thing and ran underneath. The
       search took that second route every time, which is how a section nobody
       could complete sat in three levels looking fine. `plateau` replaces it:
       the ledge is solid to the ground, so there is no underneath, and it is
       capped at a height the arc actually reaches. */
    /* a floating platform to be landed on */
    const plat = (x, y, w) => ({ t: 'plat', x: x, y: y, w: w });
    const coin = (x, y) => ({ t: 'coin', x: x, y: y });
    /* a pit whose far side you can only reach by chaining orbs */
    const orbChain = (kinds, spacing, w) => {
      const s = spacing || 5, o = [];
      kinds.forEach((k, i) => o.push(orbK(6 + i * s, 2, k)));
      const W2 = w || (kinds.length * s + 2);
      return pat(W2 + 10, o, { pit: [4, 4 + W2] });
    };

    /* ---------------------------------------------- the cube's architecture */
    /* Everything above is a thing to jump over. What follows is the level
       built as a place instead: a ceiling that takes the button away, holes
       you go through rather than over, stones with nothing under them. The
       cube has one move, and the only way to get variety out of one move is
       to keep changing what the move is for. */

    /* A DUCT. The jump's apex is exactly two cells and the arc has no short
       version, so a ceiling two cells up does not make jumping harder — it
       makes it fatal. A stretch of low roof is therefore a stretch where the
       button is off, and the level becomes the openings between them: one
       spike each, and the only place to clear it is the sky you were given.
       `segs` alternates roof, opening, roof, opening. An opening under about
       five cells has no room for the arc, so it is left empty. */
    const DUCT_Y = 2;
    const duct = segs => {
      const o = []; let x = 4, roof = true;
      for (const n of segs) {
        if (roof) {
          for (let c = 0; c < n; c++) { o.push(blk(x + c, DUCT_Y)); o.push(blk(x + c, DUCT_Y + 1)); }
        } else if (n >= 5) {
          o.push(spk(x + ((n / 2) | 0) - 1, 0));
        }
        x += n; roof = !roof;
      }
      return pat(x + 4, o);
    };

    /* A GATE: a wall with a slot cut in it at the height the arc is already
       passing through. The wall can only be one cell — two cells of wall is
       the apex exactly and nowhere else, which is not a jump anyone can make —
       so the slot sits at one, and the pillar above it turns a jump from
       something with a ceiling of its own choosing into something aimed. A
       yellow pad raises the whole idea by three cells, which is the only way a
       taller wall is fair. */
    const gate = (x, wall, slot, top) => {
      const o = [];
      for (let y = 0; y < wall; y++) o.push(blk(x, y));
      for (let y = wall + slot; y < (top === undefined ? 9 : top); y++) o.push(blk(x, y));
      return o;
    };
    const gates = (specs, lead, tail) => {
      const o = []; let x = lead === undefined ? 5 : lead, last = x;
      for (const g of specs) {
        for (const b of gate(x, g.wall === undefined ? 1 : g.wall, g.slot === undefined ? 2 : g.slot, g.top)) o.push(b);
        if (g.spike) o.push(spk(x + (g.spike > 0 ? g.spike : 0), 0));
        last = x; x += g.after === undefined ? 7 : g.after;
      }
      return pat(last + (tail === undefined ? 8 : tail), o);
    };

    /* A BRIDGE of stepping stones with nothing underneath. Each stone is at
       most one cell above the last and at most four cells past it, which is
       what the arc actually covers — the first draft of this used five and a
       two-cell rise, and the search walked straight off the end of it. */
    const bridge = (steps, gapw) => {
      const G = gapw === undefined ? 4 : gapw, o = [];
      let x = 5;
      for (const s of steps) {
        const w = s[1] === undefined ? 3 : s[1];
        o.push(plat(x, s[0], w));
        if (s[2]) o.push(coin(x + ((w / 2) | 0), s[0] + 2));
        x += w + G;
      }
      return pat(x + 6, o, { pit: [4, x - G] });
    };

    /* A PLATEAU: a pad up onto a long high ledge, whatever is waiting on top
       of it, and a drop off the far end. The ledge starts three cells past the
       pad because that is the first column the arc is above it, and it is
       solid all the way down so the drop at the end reads as a cliff. */
    const plateau = (h, len, top) => {
      /* two, and not three. A yellow pad's apex is 3.45 cells and landing is
         resolved against having been above the cell you land on, so a surface
         at four is unreachable however well it is timed. */
      const hh = Math.min(h, 2), o = [padK(4, 'yellow')];
      for (let i = 0; i < len; i++) for (let y = 0; y <= hh; y++) o.push(blk(7 + i, y));
      for (const e of (top || [])) o.push(Object.assign({}, e, { x: e.x + 7, y: (e.y || 0) + hh + 1 }));
      return pat(7 + len + 8, o);
    };

    /* Saws on the ground, far enough apart that each one is its own jump. A
       saw's kill circle is wider than a spike's is tall, so six cells between
       them is one clean landing and not much more. */
    const sawRun = (n, spacing, r) => {
      const s = spacing === undefined ? 6 : spacing, o = [];
      for (let i = 0; i < n; i++) o.push(saw(4.5 + i * s, 0.15, r || 1));
      return pat(4 + n * s + 5, o);
    };

    /* A pit with a blade rising out of it on a vertical rail. At the bottom it
       is down in the hole and the jump is an ordinary jump; at the top it is
       through the middle of the arc. `ph` is read at the blade's own column,
       which is the middle of the pit and so the middle of the jump: three
       quarters puts it at the bottom there and rising on both sides of you,
       which is the fair version. Anything else has to be argued for to the
       checker. */
    const sawGap = (w, per, ph) => {
      /* four, because there is no orb here and a plain jump clears about four
         and a half cells of hole. Six was the first try and the search fell in
         it every time — the blade was never the problem. */
      const W2 = w === undefined ? 4 : w;
      return pat(W2 + 12, [sawM(4 + W2 / 2, 1.4, 1, 0, 1.6, per || 8, ph === undefined ? 0.75 : ph)],
                 { pit: [4, 4 + W2] });
    };

    /* A blade sweeping up and down across open ground. There is no trick to
       it and that is the point: high when you get there and you run under,
       low and you jump it, and the only thing being asked is that you look. */
    const sawBar = (per, ph) =>
      pat(14, [sawM(7, 1.5, 1, 0, 1.7, per || 8, ph === undefined ? 0.25 : ph)]);

    /* ------------------------------------------------- vehicle architecture */
    /* A CHANNEL: a free band that climbs and dives one cell per cell, which is
       exactly the wave's own slope. A run of these is one long line held and
       released rather than a row of separate gates, and it is the only shape
       in the game that the wave is actually built for. `legs` is signed
       lengths; the band is the clear height inside it. */
    const chan = (legs, band, roofH, startLo) => {
      const o = []; let lo = startLo || 0, c = 0;
      for (const leg of legs) {
        const dir = leg[0], n = leg[1];
        for (let i = 0; i < n; i++, c++) {
          for (let r = 0; r < lo; r++) o.push(blk(c, r));
          for (let r = lo + band; r < roofH; r++) o.push(blk(c, r));
          lo = clamp(lo + dir, 0, roofH - band);
        }
      }
      return { obs: o, len: c };
    };
    /* The channel wrapped in its portals: flat at the mouth so the vehicle
       arrives somewhere it can be, and a dive long enough to reach the floor
       from anywhere at the end — the clamp eats whatever is left over — so
       that the cube it turns back into lands on the ground rather than in a
       wall. */
    const channel = (mode, legs, band, roofH, extra) => {
      const ch = chan([[0, 4]].concat(legs).concat([[-1, roofH], [0, 3]]), band, roofH, 0);
      const o = ch.obs.concat(extra || []);
      return section(mode, ch.len + 3, roofH, o);
    };

    /* A ship gate is two teeth at one column with a hole between them, which
       is a thing to aim at rather than a thing to avoid. `lo` is the bottom of
       the hole and `h` its height; three is comfortable, two is not. */
    const shipGate = (x, lo, h) => [{ x: x, up: true, h: lo }, { x: x, up: false, h: SHIP_ROOF - (lo + h) }];
    const shipGates = (len, specs, extra) => {
      let teeth = [];
      for (const g of specs) teeth = teeth.concat(shipGate(g[0], g[1], g[2] === undefined ? 3 : g[2]));
      return ship(len, teeth, extra);
    };

    /* A ship corridor: floor, roof, and teeth poking in from both. The roof is
       what makes it a corridor rather than an open sky — without something in
       the way upward, holding the button is never wrong. */
    const SHIP_ROOF = 9;
    const ship = (len, teeth, extra) => {
      const o = [{ t: 'portal', kind: 'ship', x: 2, y: 2 }];
      for (let c = 0; c < len; c++) o.push(blk(2 + c, SHIP_ROOF));
      for (const t of (teeth || [])) {
        const n = t.h === undefined ? 2 : t.h;
        for (let r = 0; r < n; r++) o.push(blk(2 + t.x, t.up ? r : (SHIP_ROOF - 1 - r)));
      }
      for (const e of (extra || [])) o.push(Object.assign({}, e, { x: e.x + 2 }));
      o.push({ t: 'portal', kind: 'cube', x: 2 + len - 1, y: 2, g: 1, vy: 3.2 });
      return pat(len + 5, o);
    };

    /* A gravity flip with a ceiling to run along on the other side. The roof
       sits low on purpose: the flip itself is a fall, and eleven cells of it
       would be four seconds of nothing to do. */
    const FLIP_ROOF = 6;
    const flip = (len, obs) => {
      const o = [{ t: 'portal', kind: 'grav', x: 2, y: 2 }];
      for (let c = 0; c < len; c++) o.push(blk(2 + c, FLIP_ROOF));
      for (const e of (obs || [])) {
        /* a spike up here hangs from the roof, so it lives one cell below it */
        o.push(Object.assign({}, e, { x: e.x + 2, y: e.down ? FLIP_ROOF - 1 : e.y }));
      }
      o.push({ t: 'portal', kind: 'grav', x: 2 + len - 1, y: 2, vy: FLIP_ROOF - 1.85 });
      return pat(len + 5, o);
    };
    /* The same, but a blue pad does the turning over and a blue pad hanging
       from the roof turns you back. The floor under the ceiling run is a pit,
       so the pad is the only way across — the first draft spiked that floor
       instead, and the search simply jumped the spikes and skipped the whole
       idea. */
    const padFlip = (len, obs) => {
      const o = [padK(4, 'blue')];
      for (let c = 0; c < len; c++) o.push(blk(2 + c, FLIP_ROOF));
      for (const e of (obs || [])) o.push(Object.assign({}, e, { x: e.x + 2, y: e.down ? FLIP_ROOF - 1 : e.y }));
      o.push(padK(len - 2, 'blue', true, FLIP_ROOF - 1));
      return pat(len + 5, o, { pit: [6, len - 1] });
    };

    /* The same crossing, but a blue ORB does the turning over, so the flip
       happens when you press rather than when you arrive. It needs the ceiling
       just as much as the pad version does: a blue orb taken in open sky turns
       gravity over with nothing above to land on, and the runner falls upward
       out of the world. That is not a hypothetical — the first draft of Deep
       Six put one in the middle of an orb chain and the search flew it off the
       top of the level every time. */
    const orbFlip = (len, obs) => {
      const o = [orbK(6, 2, 'blue')];
      for (let c = 0; c < len; c++) o.push(blk(2 + c, FLIP_ROOF));
      for (const e of (obs || [])) o.push(Object.assign({}, e, { x: e.x + 2, y: e.down ? FLIP_ROOF - 1 : e.y }));
      o.push(padK(len - 2, 'blue', true, FLIP_ROOF - 1));
      return pat(len + 5, o, { pit: [4, len - 1] });
    };

    /* A vehicle section: a portal in, a roof, whatever is in the way, and a
       cube portal out that also puts gravity the right way up — so a ball that
       leaves upside down drops back to the floor instead of falling off the
       top of the world. */
    const section = (mode, len, roof, obs) => {
      const o = [{ t: 'portal', kind: mode, x: 2, y: 2 }];
      if (roof) for (let c = 0; c < len; c++) o.push(blk(2 + c, roof));
      for (const e of (obs || [])) o.push(Object.assign({}, e, { x: e.x + 2 }));
      o.push({ t: 'portal', kind: 'cube', x: 2 + len - 1, y: 2, g: 1, vy: Math.max(1.95, (roof || 6) / 2) });
      return pat(len + 5, o);
    };

    const speed = k => pat(6, [{ t: 'portal', kind: 'speed', mul: k, x: 2, y: 2 }]);

    /* Lay patterns end to end and flatten to absolute cells. Ground is on
       everywhere except where a pattern punched a pit in it. */
    function build(parts) {
      const obs = [], pits = [], spans = [];
      let x = 0;
      for (const p of parts) {
        for (const o of p.obs) obs.push(Object.assign({}, o, { x: o.x + x }));
        if (p.pit) pits.push([p.pit[0] + x, p.pit[1] + x]);
        /* where each pattern ended up, so that a level checker reporting "stuck
           at column 291" can name the pattern instead of the column */
        spans.push([x, x + p.w]);
        x += p.w;
      }
      return { len: x, obs: obs, pits: pits, spans: spans };
    }

    /* --------------------------------------------------------- the levels */
    /* Written as sequences rather than as tile art, so a section that plays
       badly is one number away from playing well. Every one of these has been
       walked end to end by a search over press timings through `_dev`. */
    /* --------------------------------------------------------- the levels */
    /* Written as sequences rather than as tile art, so a section that plays
       badly is one number away from playing well. Every one of these has been
       walked end to end by a search over press timings through `_dev` — with a
       decision every 50ms, and for everything up to HARD every 100ms as well,
       which is the difference between "a machine can finish it" and "a person
       can". Each level is also meant to be about something: the cube's own
       architecture, the pads, the ceiling, the blades, the drop. A level that
       is a row of spikes with a vehicle in the middle is the thing this table
       exists to avoid. */
    const LEVELS = {
      drift:     DRIFT_LEVEL(),
      ironworks: IRONWORKS_LEVEL(),
      bounce:    BOUNCE_LEVEL(),
      static:    STATIC_LEVEL(),
      deepsix:   DEEPSIX_LEVEL(),
      saucer:    SAUCER_LEVEL(),
      sawmill:   SAWMILL_LEVEL(),
      fault:     FAULT_LEVEL(),
      skyline:   SKYLINE_LEVEL(),
      wave:      WAVE_LEVEL(),
      overclock: OVERCLOCK_LEVEL(),
      meltdown:  MELTDOWN_LEVEL()
    };

    /* Each level is a function only so that it can carry its own notes without
       the table above becoming a wall of text. */

    /* Every shape in the game, one at a time, with a flat stretch after each
       one to think about what just happened. */
    function DRIFT_LEVEL() {
      return {
        name: 'Neon Drift', tier: 1, accent: '#67e8f9',
        blurb: 'Room to breathe. Every shape the game has, shown one at a time.',
        parts: [
          gap(26),
          spikes(1), gap(5), spikes(1), gap(4), spikes(2), gap(6),
          step(3), gap(5), spikes(1), gap(5),
          pat(12, [coin(6, 2)]),
          stair(2), gap(6), spikes(2), gap(6),
          /* the first gate: a hole to go through rather than a thing to go over */
          gates([{ after: 9 }, { after: 9 }, {}], 5, 10), gap(6),
          padOver(4), gap(6),
          step(4), gap(4), spikes(1), gap(6),
          /* the first bridge, with only three cells of nothing under it */
          bridge([[0], [0, 3, 1], [1], [0]], 3), gap(7),
          spikes(3), gap(6),
          pat(18, [plat(5, 2, 4), coin(7, 4), spk(12, 0)]),
          gap(6), stair(3, 4), gap(7),
          /* the first duct: the ceiling takes the button away entirely */
          duct([7, 8, 8, 8, 8, 8, 7]), gap(7),
          spikes(2), gap(5), padOver(5), gap(6),
          plateau(2, 10, [spk(4, 0)]), gap(7),
          spikes(1), gap(5), spikes(2), gap(6),
          pat(12, [coin(5, 2)]),
          stair(2), gap(6), spikes(3), gap(10),
          gap(20)
        ]
      };
    }

    /* The cube on its own, with no vehicle to change the subject. It is here
       to make the point that one button is not one idea: a gate is aimed, a
       duct is the button taken away, a bridge is the arc with nothing under
       it, and a plateau is a wall that cannot be gone round. */
    function IRONWORKS_LEVEL() {
      return {
        name: 'Ironworks', tier: 2, accent: '#f59e0b',
        blurb: 'No vehicles and no orbs. One jump, and a building put in front of it.',
        parts: [
          gap(24),
          spikes(2), gap(4), step(3, true), gap(5),
          gates([{ after: 8 }, { after: 8 }, { after: 8 }, {}], 5, 9), gap(6),
          duct([6, 8, 7, 8, 7, 8, 6]), gap(7),
          bridge([[0], [1], [1, 3, 1], [2], [1]], 3), gap(7),
          spikes(2), gap(4), stair(3), gap(6),
          plateau(2, 12, [spk(4, 0), spk(9, 0)]), gap(7),
          pat(12, [coin(5, 2)]),
          gates([{ after: 8 }, { after: 8 }, {}], 5, 9), gap(6),
          sawRun(3, 7), gap(6),
          duct([6, 7, 8, 7, 8, 7, 6]), gap(7),
          bridge([[0], [0], [1], [0], [0, 3, 1]], 3), gap(7),
          stair(2), gap(5), spikes(3), gap(5), step(4, true), gap(6),
          plateau(2, 9, [spk(3, 0)]), gap(7),
          gates([{ after: 8 }, {}], 5, 9), gap(6),
          spikes(2), gap(5), stair(2), gap(10),
          gap(18)
        ]
      };
    }

    /* Everything that throws you: two strengths of pad, three colours of orb,
       and a ball that only knows up and down. Almost nothing in here is
       cleared by a plain jump, which is the whole point of it. */
    function BOUNCE_LEVEL() {
      return {
        name: 'Bounce Theory', tier: 2, accent: '#f472b6',
        blurb: 'Pink pads, blue pads, orbs strung into a ladder, and a ball that only knows up and down.',
        parts: [
          gap(24),
          spikes(1), gap(4), spikes(2), gap(5),
          tiny(3), gap(4), padOver(2, 'pink'), gap(5),
          spikes(2), gap(4), padOver(2, 'pink'), gap(6),
          pat(12, [coin(6, 2)]),
          orbGap(6, 'pink'), gap(6),
          /* an orb ladder: each one is a jump you did not have, taken from
             wherever the last one left you */
          orbChain(['yellow', 'yellow', 'pink'], 5), gap(6),
          tiny(2), gap(3), spikes(2), gap(6),
          /* the first blue pad, over a pit, so the flip reads as the way across */
          padFlip(30, [spk(8, 0, { down: true }), spk(14, 0, { down: true }), spk(15, 0, { down: true }),
                       spk(21, 0, { down: true })]),
          gap(8), spikes(2), gap(5),
          section('ball', 40, 5, [spk(8, 0), spk(9, 0), spk(15, 4, { down: true }), spk(16, 4, { down: true }),
                                  spk(22, 0), spk(23, 0), spk(24, 0), spk(30, 4, { down: true }), spk(31, 4, { down: true }),
                                  coin(19, 2)]),
          gap(8), tiny(3), gap(6),
          orbGap(6, 'pink'), gap(4), padOver(2, 'pink'), gap(6),
          plateau(2, 8, [spk(3, 0)]), gap(7),
          stair(2), gap(6),
          padFlip(24, [spk(9, 0, { down: true }), spk(10, 0, { down: true }), spk(16, 0, { down: true })]),
          gap(8), spikes(1), gap(4), spikes(2), gap(5), tiny(3), gap(6),
          pat(12, [coin(5, 2)]),
          orbChain(['yellow', 'pink'], 5), gap(6),
          spikes(2), gap(12),
          gap(18)
        ]
      };
    }

    /* The level that hands over the controls: a ship corridor with holes to
       aim at rather than teeth to avoid, and a ceiling you end up running
       along. The ducts are here because a cube that must not jump and a ship
       that must fly are the same instruction read two ways. */
    function STATIC_LEVEL() {
      return {
        name: 'Stereo Static', tier: 2, accent: '#a78bfa',
        blurb: 'A ship corridor with holes to aim at, a ceiling too low to jump under, and a real gravity flip.',
        parts: [
          gap(24),
          spikes(2), gap(4), spikes(2), gap(5),
          step(3), gap(3), spikes(2), gap(5),
          stair(3), gap(5), padOver(5), gap(5),
          pat(16, [plat(4, 2, 3), coin(5, 4), spk(11, 0)]),
          gap(5), duct([6, 8, 7, 8, 7, 8, 6]), gap(6),
          shipGates(36, [[7, 2, 3], [14, 4, 3], [21, 1, 3], [28, 3, 3]], [coin(17.5, 6.5)]),
          gap(7), spikes(2), gap(4), step(3, true), gap(4), spikes(2), gap(6),
          gates([{ after: 8 }, { after: 8 }, {}], 5, 9), gap(6),
          orbGap(7), gap(6),
          spikes(2), gap(4), spikes(3), gap(6),
          flip(26, [spk(7, 0, { down: true }), spk(13, 0, { down: true }),
                    spk(14, 0, { down: true }), spk(20, 0, { down: true })]),
          gap(7), stair(3), gap(5), spikes(2), gap(5),
          padOver(6), gap(5), spikes(2), gap(4), spikes(2), gap(5),
          plateau(2, 10, [spk(4, 0)]), gap(7),
          pat(10, [coin(4, 2)]),
          bridge([[0], [1], [0], [0]], 3), gap(7),
          spikes(3), gap(5), stair(2), gap(8),
          gap(18)
        ]
      };
    }

    /* Upside down for most of its length. Blue pads and blue orbs turn you
       over, the ceiling becomes the floor you are running along, and the
       spikes that matter are the ones hanging above what used to be your
       head. */
    function DEEPSIX_LEVEL() {
      return {
        name: 'Deep Six', tier: 3, accent: '#38bdf8',
        blurb: 'Gravity is the mechanic. Blue pads, blue orbs, and a ceiling you spend half the level standing on.',
        parts: [
          gap(24),
          spikes(2), gap(4), stair(2), gap(4), spikes(2), gap(5),
          padFlip(26, [spk(8, 0, { down: true }), spk(14, 0, { down: true }), spk(20, 0, { down: true })]),
          gap(8), spikes(2), gap(5),
          orbChain(['yellow', 'yellow', 'pink'], 5), gap(6),
          /* a blue ORB rather than a blue pad: the flip is yours to time */
          orbFlip(26, [spk(10, 0, { down: true }), spk(16, 0, { down: true }),
                       spk(17, 0, { down: true })]),
          gap(8),
          pat(12, [coin(5, 2)]),
          flip(30, [spk(6, 0, { down: true }), spk(7, 0, { down: true }), spk(13, 0, { down: true }),
                    spk(19, 0, { down: true }), spk(20, 0, { down: true }), spk(25, 0, { down: true })]),
          gap(7), spikes(2), gap(4), step(3, true), gap(6),
          section('ball', 38, 5, [spk(7, 0), spk(8, 0), spk(13, 4, { down: true }), spk(14, 4, { down: true }),
                                  spk(20, 0), spk(21, 0), spk(26, 4, { down: true }), spk(27, 4, { down: true }),
                                  spk(32, 0), coin(17, 2)]),
          gap(8), spikes(2), gap(5), stair(2), gap(5),
          padFlip(30, [spk(9, 0, { down: true }), spk(10, 0, { down: true }), spk(16, 0, { down: true }),
                       spk(22, 0, { down: true }), spk(23, 0, { down: true })]),
          gap(8),
          duct([6, 8, 7, 8, 7, 8, 6]), gap(6),
          gates([{ after: 8 }, { after: 8 }, {}], 5, 9), gap(6),
          pat(12, [coin(5, 2)]),
          flip(24, [spk(7, 0, { down: true }), spk(12, 0, { down: true }), spk(13, 0, { down: true }),
                    spk(18, 0, { down: true })]),
          gap(7), spikes(3), gap(5), stair(2), gap(5), spikes(2), gap(10),
          gap(18)
        ]
      };
    }

    /* The UFO, which is the only vehicle that wants a fresh press every time,
       and the first blades that travel. A sliding saw is not a wait for the
       right moment — nothing here can change how fast you arrive, so a blade
       is always in the same place when you get to it — but where it is depends
       on where you are in your own arc, which no fixed saw can ask. */
    function SAUCER_LEVEL() {
      return {
        name: 'Saucer Signal', tier: 3, accent: '#fb923c',
        blurb: 'A UFO that hops on every tap, blades that slide along their rails, and orbs in a chain.',
        parts: [
          gap(22),
          spikes(2), gap(4), step(3, true), gap(4),
          pat(14, [saw(8, 0.2, 1.1)]), spikes(2, 1), gap(5),
          orbChain(['yellow', 'yellow'], 5), gap(6),
          /* The UFO corridor: gates from floor and roof, a tap per gate. The
             gaps are four cells tall, which is two and a half hops of slack. */
          section('ufo', 56, 9, [].concat(
            pillar(9, 0, 4), pillar(16, 5, 9), pillar(23, 0, 3), pillar(23, 7, 9),
            pillar(30, 0, 5), pillar(37, 4, 9), pillar(44, 0, 2), pillar(44, 6, 9),
            [saw(12, 8.4, 1), saw(19.5, 0.3, 1), sawM(33.5, 4.5, 1, 0, 2.6, 11, 0.25), coin(26.5, 5)]
          )),
          gap(8), spikes(2, 2), gap(4),
          pat(18, [saw(6, 0.1, 1), saw(12, 0.1, 1)]), gap(4),
          sawGap(4), gap(5),
          orbChain(['pink', 'yellow'], 5), gap(6),
          speed(1.3), gap(6), tiny(3, 2), gap(4), spikes(2, 2), gap(5), spikes(3, 2), gap(6),
          speed(1.0), gap(6),
          pat(12, [coin(5, 2)]),
          shipGates(38, [[7, 3, 3], [15, 1, 3], [23, 4, 3], [31, 2, 3]], [sawM(19, 4, 1.1, 0, 2.4, 11, 0.25)]),
          gap(8),
          padFlip(26, [spk(10, 0, { down: true }), spk(11, 0, { down: true }), saw(16, 5.6, 0.9)]),
          gap(8), stair(2), gap(5), spikes(2), gap(6),
          gap(18)
        ]
      };
    }

    /* Blades, and what a blade can be made to do. They sit in pits, they run
       along rails across the floor, they sweep a ship corridor from top to
       bottom, and one of them is parked next to a gate. */
    function SAWMILL_LEVEL() {
      return {
        name: 'Sawmill', tier: 3, accent: '#a3e635',
        blurb: 'Blades in the pits, blades on rails, and a ship corridor with two of them sweeping through it.',
        parts: [
          gap(24),
          spikes(2), gap(4), sawRun(2, 7), gap(5),
          pat(16, [saw(6, 0.15, 1), saw(11, 0.15, 1)]), gap(5),
          sawGap(4), gap(6),
          /* the same blade twice, half a sweep apart: down when you reach the
             first, so it is jumped, and up at the second, so it is not */
          sawBar(9, 0.75), gap(4), sawBar(9, 0.25), gap(5),
          spikes(2), gap(4), step(3, true), gap(5),
          pat(12, [coin(5, 2)]),
          sawRun(3, 7), gap(6),
          gates([{ after: 9 }, { after: 9 }, {}], 5, 10), gap(6),
          sawGap(5), gap(6),
          shipGates(40, [[8, 3, 3], [16, 1, 3], [24, 4, 3], [32, 2, 3]],
                    [sawM(12, 4.5, 1.1, 0, 3.2, 11, 0.25), sawM(28, 4.5, 1.1, 0, 3.2, 11, 0.75), coin(20, 4.5)]),
          gap(8), spikes(2), gap(4), sawRun(2, 7), gap(5),
          duct([6, 8, 7, 8, 7, 8, 6]), gap(6),
          /* two blades on one rail each, half a sweep apart: the first is up when
             you reach it and the second is down, so it is run under, then jump */
          pat(20, [sawM(6, 1.5, 1, 0, 1.7, 9, 0.25), sawM(14, 1.5, 1, 0, 1.7, 9, 0.75)]), gap(6),
          bridge([[0], [1], [0], [0]], 3), gap(7),
          section('ball', 34, 5, [spk(7, 0), spk(8, 0), saw(13.5, 4.6, 0.9), spk(19, 0), spk(20, 0),
                                  saw(26.5, 0.4, 0.9), coin(16, 2)]),
          gap(8), pat(12, [coin(5, 2)]),
          sawRun(3, 7), gap(5), spikes(3), gap(5), stair(2), gap(10),
          gap(18)
        ]
      };
    }

    /* The pace changes, and everything else is built around that. Fast makes
       the arc long, which helps over a row of spikes and hurts over anything
       that has to be landed on; slow makes it short, which is the opposite. So
       the fast stretches get spikes and the slow one gets gates and a
       ceiling. */
    function FAULT_LEVEL() {
      return {
        name: 'Fault Line', tier: 4, accent: '#fb7185',
        blurb: 'Three speeds. Long arcs over the spikes, short ones through the gates, and no slack anywhere.',
        parts: [
          gap(22),
          spikes(2, 2), gap(3), spikes(2, 2), gap(4),
          stair(2), gap(3), spikes(2, 2), gap(4),
          step(3, true), gap(4), spikes(3, 2), gap(4),
          speed(1.3), gap(8),
          spikes(2, 2), gap(3), spikes(3, 2), gap(4), spikes(2, 2), gap(5),
          pat(16, [plat(4, 2, 3), coin(5, 4), spk(11, 0)]),
          gap(4), padOver(6), gap(4),
          speed(1.0), gap(6),
          /* slow: the arc gets short, so what is in the way stops being a row
             of spikes and starts being a hole to fit through */
          speed(0.8), gap(6),
          gates([{ after: 8 }, { after: 8 }, { after: 8 }, {}], 5, 9), gap(5),
          duct([6, 8, 7, 8, 7, 8, 6]), gap(6),
          spikes(2, 2), gap(4), spikes(2, 2), gap(5),
          speed(1.0), gap(6),
          ship(40, [{ x: 6, up: true, h: 4 }, { x: 12, up: false, h: 4 },
                    { x: 18, up: true, h: 4 }, { x: 24, up: false, h: 4 },
                    { x: 30, up: true, h: 4 }, { x: 35, up: false, h: 4 }]),
          gap(6),
          spikes(3, 2), gap(4), stair(3), gap(4), spikes(2, 2), gap(5),
          orbGap(8), gap(5),
          pat(12, [coin(5, 2)]),
          spikes(3, 2), gap(4),
          flip(30, [spk(6, 0, { down: true }), spk(7, 0, { down: true }),
                    spk(13, 0, { down: true }), spk(19, 0, { down: true }),
                    spk(20, 0, { down: true }), spk(25, 0, { down: true })]),
          gap(6), spikes(2, 2), gap(3), step(3), gap(4), spikes(3, 2), gap(5),
          /* the staircase goes BEFORE the speed-up, not after. A tread is only
             three cells wide, and at 1.3x the arc overshoots it — the search
             stalled here for exactly that reason. Fast sections get spikes,
             where a longer jump helps rather than hurts. */
          stair(3), gap(5),
          speed(1.3), gap(8),
          spikes(2, 2), gap(4), spikes(3, 2), gap(4), padOver(4), gap(6),
          speed(1.0), gap(6),
          plateau(2, 10, [spk(4, 0)]), gap(7),
          pat(12, [coin(5, 2)]),
          spikes(3, 2), gap(4), spikes(2, 2), gap(5), stair(2), gap(8),
          gap(18)
        ]
      };
    }

    /* Almost no floor. The level is stones, ledges and orbs strung over a
       drop, and the mistake everywhere in it is the same one: landing short. */
    function SKYLINE_LEVEL() {
      return {
        name: 'Skyline', tier: 4, accent: '#c084fc',
        blurb: 'The ground is mostly missing. Stones, ledges and orbs strung out over the drop.',
        parts: [
          gap(22),
          spikes(2), gap(4), stair(2), gap(5),
          bridge([[0], [1], [1], [0]], 3), gap(6),
          orbGap(7), gap(5),
          bridge([[0], [1], [2], [2, 3, 1], [1]], 3), gap(6),
          plateau(2, 10, [spk(4, 0)]), gap(7),
          orbChain(['yellow', 'yellow'], 5), gap(5),
          bridge([[0], [0], [1], [0], [1]], 4), gap(6),
          pat(12, [coin(5, 2)]),
          section('ufo', 40, 9, [].concat(
            pillar(8, 0, 4), pillar(15, 5, 9), pillar(22, 0, 3), pillar(22, 7, 9),
            pillar(29, 0, 5), pillar(35, 4, 9), [coin(19, 5)]
          )),
          gap(8),
          bridge([[0], [1], [1], [2], [1], [0]], 3), gap(6),
          orbChain(['yellow', 'pink', 'yellow'], 5), gap(5),
          padFlip(26, [spk(9, 0, { down: true }), spk(15, 0, { down: true }), spk(16, 0, { down: true })]),
          gap(8),
          plateau(2, 12, [spk(4, 0), spk(9, 0)]), gap(7),
          pat(12, [coin(5, 2)]),
          bridge([[0], [1], [0], [1], [0]], 4), gap(6),
          orbGap(8), gap(5),
          stair(3), gap(5), spikes(2), gap(5), stair(2), gap(10),
          gap(18)
        ]
      };
    }

    /* The wave, and the one shape the wave is actually built for: a channel
       whose walls climb and dive at forty-five degrees, which is the wave's
       own slope. A run of those is one long line held and released rather than
       a row of separate gates, and it is the only thing in the game that plays
       like a drawn stroke. */
    function WAVE_LEVEL() {
      return {
        name: 'Wavelength', tier: 4, accent: '#22d3ee',
        blurb: 'Hold to climb, let go to dive, and follow a channel cut at your own angle.',
        parts: [
          gap(22),
          spikes(3, 2), gap(4), stair(2), gap(4), spikes(2, 2), gap(5),
          /* the first channel is three cells wide, which is room to be wrong
             for half a cell and still recover */
          channel('wave', [[1, 4], [-1, 4], [1, 5], [-1, 5], [1, 3], [-1, 3]], 3, 9, [coin(14, 4)]),
          gap(8), tiny(3, 2), gap(3), spikes(3, 2), gap(5),
          orbGap(7), gap(5),
          flip(28, [spk(6, 0, { down: true }), spk(7, 0, { down: true }), spk(14, 0, { down: true }),
                    spk(20, 0, { down: true }), spk(21, 0, { down: true })]),
          gap(7),
          section('ball', 36, 5, [spk(7, 0), spk(8, 0), saw(13.5, 4.6, 0.9), spk(18, 0), spk(19, 0),
                                  spk(24, 4, { down: true }), spk(25, 4, { down: true }), saw(29.5, 0.4, 0.9)]),
          gap(8), speed(1.3), gap(5), spikes(2, 2), gap(4), spikes(3, 2), gap(5),
          speed(1.0), gap(5),
          pat(12, [coin(5, 2)]),
          /* the second channel: two cells wide, and it turns more often */
          channel('wave', [[1, 5], [-1, 3], [1, 3], [-1, 5], [1, 4], [-1, 4], [1, 4], [-1, 2]], 2, 9),
          gap(8),
          section('wave', 34, 9, [].concat(
            pillar(8, 0, 2), pillar(8, 5, 9), pillar(13, 0, 3), pillar(13, 6, 9),
            pillar(18, 0, 4), pillar(18, 7, 9), pillar(23, 0, 3), pillar(23, 6, 9),
            [coin(20, 5)]
          )),
          gap(8), padOver(3), gap(5), spikes(3, 2), gap(6),
          gap(18)
        ]
      };
    }

    /* Every vehicle, every orb, and most of it fast. */
    function OVERCLOCK_LEVEL() {
      return {
        name: 'Overclock', tier: 5, accent: '#ef4444',
        blurb: 'Every vehicle, every orb, and most of it fast. Bring patience.',
        parts: [
          gap(20),
          speed(1.3), gap(4),
          spikes(3, 2), gap(4), spikes(2, 2), gap(3), spikes(3, 2), gap(4),
          orbGap(8), gap(4),
          section('ufo', 40, 8, [].concat(
            pillar(8, 0, 4), pillar(14, 4, 8), pillar(20, 0, 3), pillar(20, 6, 8),
            pillar(27, 0, 5), pillar(33, 3, 8), [saw(17, 0.3, 1), saw(24, 7.6, 1)]
          )),
          gap(6), tiny(4, 2), gap(3),
          orbChain(['yellow', 'pink', 'yellow'], 5), gap(4),
          channel('wave', [[1, 4], [-1, 4], [1, 4], [-1, 4], [1, 3], [-1, 3]], 3, 8, [coin(12, 3)]),
          gap(6), speed(1.0), gap(4),
          padFlip(24, [spk(8, 0, { down: true }), spk(9, 0, { down: true }), spk(14, 0, { down: true })]),
          gap(6),
          section('ball', 34, 5, [spk(6, 0), spk(7, 0), spk(12, 4, { down: true }), spk(13, 4, { down: true }),
                                  saw(18.5, 0.3, 0.9), spk(23, 4, { down: true }), spk(24, 4, { down: true }), spk(28, 0)]),
          gap(6),
          gates([{ after: 8 }, { after: 8 }, {}], 5, 9), gap(6),
          speed(1.3), gap(4),
          shipGates(42, [[7, 3, 3], [15, 1, 3], [23, 4, 3], [31, 2, 3], [38, 3, 3]], [coin(19, 4.5)]),
          gap(6), spikes(3, 2), gap(4), spikes(2, 2), gap(4), padOver(4), gap(5),
          speed(1.0), gap(10),
          gap(18)
        ]
      };
    }

    /* The last one. Everything the game has, in the order that hurts most, and
       the blades are moving. */
    function MELTDOWN_LEVEL() {
      return {
        name: 'Meltdown', tier: 5, accent: '#f97316',
        blurb: 'Everything at once, the blades are moving, and it does not let up until the end.',
        parts: [
          gap(20),
          spikes(2, 2), gap(3), spikes(3, 2), gap(4),
          sawRun(2, 7), gap(5),
          gates([{ after: 8 }, { after: 8 }, {}], 5, 9), gap(5),
          duct([6, 8, 7, 8, 7, 8, 6]), gap(6),
          speed(1.3), gap(5),
          spikes(3, 2), gap(4), spikes(2, 2), gap(4), padOver(4), gap(5),
          speed(1.0), gap(5),
          sawGap(5), gap(4), sawBar(8, 0.75), gap(5),
          pat(12, [coin(5, 2)]),
          shipGates(40, [[7, 3, 3], [15, 1, 3], [23, 4, 3], [31, 2, 3]],
                    [sawM(11, 4.5, 1.1, 0, 3.2, 11, 0.25), sawM(27, 4.5, 1.1, 0, 3.2, 11, 0.75)]),
          gap(8),
          bridge([[0], [1], [1], [2], [1]], 3), gap(6),
          channel('wave', [[1, 4], [-1, 4], [1, 5], [-1, 3], [1, 3], [-1, 4]], 2, 9),
          gap(7),
          orbFlip(28, [spk(11, 0, { down: true }), spk(12, 0, { down: true }),
                       spk(18, 0, { down: true }), spk(23, 0, { down: true })]),
          gap(6),
          section('ball', 36, 5, [spk(6, 0), spk(7, 0), spk(12, 4, { down: true }), spk(13, 4, { down: true }),
                                  saw(18.5, 0.3, 0.9), spk(24, 4, { down: true }), spk(25, 4, { down: true }),
                                  spk(30, 0), coin(21, 2)]),
          gap(7),
          section('ufo', 42, 9, [].concat(
            pillar(8, 0, 4), pillar(15, 5, 9), pillar(22, 0, 3), pillar(22, 7, 9),
            pillar(29, 0, 5), pillar(36, 4, 9),
            [sawM(18.5, 4.5, 1, 0, 3.0, 10, 0.25), coin(26, 5)]
          )),
          gap(8),
          padFlip(28, [spk(9, 0, { down: true }), spk(10, 0, { down: true }), spk(16, 0, { down: true }),
                       spk(22, 0, { down: true })]),
          gap(7),
          plateau(2, 12, [spk(4, 0), spk(9, 0)]), gap(7),
          speed(1.3), gap(5),
          spikes(3, 2), gap(4), spikes(2, 2), gap(4), spikes(3, 2), gap(5),
          speed(1.0), gap(6),
          pat(12, [coin(5, 2)]),
          stair(3), gap(5), spikes(3), gap(5), stair(2), gap(10),
          gap(18)
        ]
      };
    }
    /* ------------------------------------------------------- level parsing */
    /* All of them are parsed up front rather than only the chosen one, because
       the level select runs each as a live preview behind the cards — and the
       online lobby has to be able to hand any of them over instantly.

       Everything a body can touch is also bucketed by column. The simulation
       only ever looks at the handful of columns under the body, which matters
       twice over: the game runs a second copy of it per ghost online, and the
       level checker runs it a few million times. */
    /* Keep the proven obstacle vocabulary but edit the courses as musical
       phrases: shorter run-ins, fewer duplicate spike rows, and a bespoke
       centerpiece in every course. Coordinates remain integral tile cells. */
    const rhythmRun=(count,spacing,wide=false)=>{
      const obs=[];for(let i=0;i<count;i++){const x=4+i*spacing;obs.push(spk(x,0));if(wide&&i%2)obs.push(spk(x+1,0));}
      obs.push(coin(4+Math.floor(count/2)*spacing,2.5));return pat(4+(count-1)*spacing+7,obs);
    };
    const SIGNATURES={
      drift:[ship(28,[{x:10,up:true,h:2},{x:19,up:false,h:2}],[coin(15,4)]),rhythmRun(3,8)],
      ironworks:[gates([{after:8},{after:10},{}],5,9),plateau(2,13,[spk(5,0),coin(9,2)])],
      bounce:[orbChain(['yellow','pink','yellow'],5),section('ball',26,5,[spk(8,0),spk(16,4,{down:true}),coin(12,2)])],
      static:[shipGates(30,[[8,2,4],[18,3,4]],[coin(13,5)]),rhythmRun(4,8,true)],
      deepsix:[flip(26,[spk(8,0,{down:true}),spk(16,0,{down:true}),coin(12,3)]),orbChain(['yellow','yellow'],5)],
      saucer:[section('ufo',28,9,[...pillar(8,0,2),...pillar(18,6,9),coin(13,5)]),sawBar(10,.25)],
      sawmill:[pat(30,[sawM(7,1.5,1,0,1.7,9,.25),sawM(17,1.5,1,0,1.7,9,.75),coin(24,2)]),bridge([[0],[1],[0,3,1]],3)],
      fault:[rhythmRun(4,9,true),shipGates(32,[[8,2,4],[19,3,4]],[coin(14,5)])],
      skyline:[bridge([[0],[1,3,1],[2],[1]],3),orbChain(['yellow','yellow','pink'],5)],
      wave:[channel('wave',[[1,4],[-1,4],[1,4],[-1,4]],4,10,[coin(10,6)]),rhythmRun(3,8,true)],
      overclock:[shipGates(30,[[8,2,4],[18,3,4]],[coin(13,5)]),rhythmRun(4,10,true)],
      meltdown:[section('ball',30,5,[spk(8,0),spk(17,4,{down:true}),spk(24,0),coin(12,2)]),rhythmRun(4,9,true)]
    };
    for(const [key,level] of Object.entries(LEVELS)){
      let repeats=0;
      const parts=level.parts.filter((p,i)=>{
        const simple=p.obs.length>0&&p.obs.every(o=>o.t==='spike'&&!o.down&&!o.small);
        // Repeated filler is replaced by the set pieces, not packed tighter.
        if(simple&&i>5&&++repeats%3===0)return false;return true;
      }).map((p,i,a)=>p.obs.length||p.pit?p:gap(i===0?14:i===a.length-1?10:Math.max(3,p.w-2)));
      const a=Math.floor(parts.length*.36),b=Math.floor(parts.length*.72);
      level.parts=[...parts.slice(0,a),gap(5),SIGNATURES[key][0],gap(7),...parts.slice(a,b),gap(5),SIGNATURES[key][1],gap(7),...parts.slice(b)];
      level.blurb={
        drift:'Learn the pulse, launch into your first ship flight, then bring the melody home.',
        ironworks:'Thread the factory gates, ride the raised belts, and clear the steel skyline.',
        bounce:'Orb ladders, spring pads, and a gravity-ball chorus with a candy-colored groove.',
        static:'Tune into the ship slalom, flip the ceiling, and land the four-jump refrain.',
        deepsix:'Dive into inverted tunnels and rising orb chains on a liquid bassline.',
        saucer:'Hop through antenna towers and weave the moving blades of a space-disco signal.',
        sawmill:'Read the moving blades, jump the stepping stones, then fly through the mill.',
        fault:'Speed changes, syncopated spike runs, and a soaring ship break.',
        skyline:'Leap between rooftops and chain aerial orbs over the city lights.',
        wave:'Carve luminous zigzags through a laser channel, then snap back to the beat.',
        overclock:'A fast industrial gauntlet with a ship interlude and relentless final refrain.',
        meltdown:'Gravity shifts, molten machinery, and a final ball-mode surge to the exit.'
      }[key];
    }

    function parseLevel(key, def) {
      const built = build(def.parts);
      const N = built.len + 4;
      const L = {
        key: key, name: def.name, tier: def.tier, accent: def.accent,
        blurb: def.blurb, len: built.len, spans: built.spans,
        cols: new Array(N),
        spikes: [], orbs: [], pads: [], portals: [], coins: [], saws: [],
        bk: { spikes: new Array(N), orbs: new Array(N), pads: new Array(N),
              portals: new Array(N), coins: new Array(N), saws: new Array(N) }
      };
      const addSolid = (cx, cy) => {
        if (cx < 0 || cx >= N) return;
        (L.cols[cx] || (L.cols[cx] = [])).push(cy);
      };
      const put = (kind, c0, c1, idx) => {
        for (let c = Math.max(0, Math.floor(c0)); c <= Math.min(N - 1, Math.floor(c1)); c++)
          (L.bk[kind][c] || (L.bk[kind][c] = [])).push(idx);
      };
      let gravN = 0;
      /* the floor, minus its pits */
      for (let c = 0; c < L.len; c++) {
        let inPit = false;
        for (const p of built.pits) if (c >= p[0] && c < p[1]) inPit = true;
        if (!inPit) addSolid(c, -1);
      }
      for (const o of built.obs) {
        if (o.t === 'block') addSolid(o.x, o.y);
        else if (o.t === 'plat') { for (let i = 0; i < o.w; i++) addSolid(o.x + i, o.y); }
        else if (o.t === 'spike') { put('spikes', o.x, o.x, L.spikes.length); L.spikes.push({ x: o.x, y: o.y, down: !!o.down, small: !!o.small }); }
        else if (o.t === 'orb') { put('orbs', o.x - 1, o.x + 1, L.orbs.length); L.orbs.push({ x: o.x, y: o.y, kind: o.kind || 'yellow' }); }
        else if (o.t === 'pad') { put('pads', o.x - 1, o.x + 1, L.pads.length); L.pads.push({ x: o.x, y: o.y, kind: o.kind || 'yellow', down: !!o.down }); }
        else if (o.t === 'coin') { put('coins', o.x - 1, o.x + 1, L.coins.length); L.coins.push({ x: o.x, y: o.y }); }
        else if (o.t === 'saw') {
          /* a sliding saw is bucketed across everywhere it can ever be */
          const sp = Math.abs(o.dx || 0);
          put('saws', o.x - sp - o.r - 1, o.x + sp + o.r + 1, L.saws.length);
          L.saws.push({ x: o.x, y: o.y, r: o.r, dx: o.dx || 0, dy: o.dy || 0, per: o.per || 2, ph: o.ph || 0 });
        }
        else if (o.t === 'portal') {
          /* A gravity portal only toggles, but it should not look like it: the
             one that turns you over and the one that puts you back are two
             colours, and which is which falls out of the order they come in. */
          const look = o.kind === 'grav' ? ((gravN++ % 2) ? 'gravDown' : 'gravUp')
                     : o.kind === 'speed' ? (o.mul > 1 ? 'fast' : o.mul < 1 ? 'slow' : 'norm') : o.kind;
          put('portals', o.x - 1, o.x + 1, L.portals.length);
          L.portals.push({ x: o.x, y: o.y, kind: o.kind, mul: o.mul, g: o.g || 0, vy: o.vy, look: look });
        }
      }
      /* Solid cells live per column as a sorted list. A column is short — a
         handful of entries at most — so a linear scan of one beats anything
         that would need building and keeping. */
      for (const c of L.cols) if (c) c.sort((a, b) => a - b);
      return L;
    }

    const ORDER = ['drift', 'ironworks', 'bounce', 'static', 'deepsix', 'saucer',
                   'sawmill', 'fault', 'skyline', 'wave', 'overclock', 'meltdown'];
    const TIERS = [null,
      { name: 'EASY', col: '#4ade80' }, { name: 'NORMAL', col: '#38bdf8' }, { name: 'HARD', col: '#facc15' },
      { name: 'INSANE', col: '#f472b6' }, { name: 'DEMON', col: '#ff4d5e' }];
    const PARSED = {};
    for (const k of ORDER) PARSED[k] = parseLevel(k, LEVELS[k]);

    /* The one being played. Everything below reads through these aliases, so
       switching level is a handful of assignments rather than a remount. */
    let LKEY = ORDER[0], LDEF = PARSED[LKEY];
    let LEN = LDEF.len, cols = LDEF.cols, BK = LDEF.bk;
    let spikeList = LDEF.spikes, orbList = LDEF.orbs, padList = LDEF.pads;
    let portalList = LDEF.portals, coinList = LDEF.coins, sawList = LDEF.saws;
    let PRACTICE = false;

    function useLevel(key) {
      LKEY = key; LDEF = PARSED[key];
      LEN = LDEF.len; cols = LDEF.cols; BK = LDEF.bk;
      spikeList = LDEF.spikes; orbList = LDEF.orbs; padList = LDEF.pads;
      portalList = LDEF.portals; coinList = LDEF.coins; sawList = LDEF.saws;
    }

    /* Per-level bests, kept in the same store the option panel uses. */
    const bestKey = k => 'remix2_best_' + k;
    const coinKey = k => 'remix2_coins_' + k;
    function savedBest(k) { return +(Store.opt('gdash', bestKey(k)) || 0); }
    function savedCoins(k) { return +(Store.opt('gdash', coinKey(k)) || 0); }
    function saveRun(k, pctv, coins) {
      if (pctv > savedBest(k)) Store.opt('gdash', bestKey(k), String(pctv));
      if (coins > savedCoins(k)) Store.opt('gdash', coinKey(k), String(coins));
    }

    /* -------------------------------------------------------- the simulation */
    /* Kept as a pure-ish function of a plain object so it can be replayed and
       searched. Nothing in here touches the renderer, the DOM or the clock. */
    function newSim() {
      return {
        x: 1, y: 0, vy: 0, grav: 1, mode: 'cube', speedMul: 1,
        onGround: true, onRoof: false, held: false, rot: 0, dead: false, won: false,
        coins: 0, coinsGot: {}, orbUsed: {}, portalDone: {}, t: 0, orbReady: -1, padLock: -1
      };
    }
    const sizeOf = p => p.mode === 'wave' ? WAVE_SZ : SZ;

    function solidsIn(cx) { return (cx >= 0 && cx < cols.length && cols[cx]) || null; }

    /* true if the body overlaps any solid cell */
    function overlapping(p, sz) {
      const hw = sz / 2;
      const x0 = Math.floor(p.x - hw + EPSO), x1 = Math.floor(p.x + hw - EPSO);
      for (let c = x0; c <= x1; c++) {
        const col = solidsIn(c); if (!col) continue;
        for (let i = 0; i < col.length; i++) {
          const yc = col[i];
          if (p.y + EPSO < yc + 1 && p.y + sz - EPSO > yc) return true;
        }
      }
      return false;
    }

    /* A spike kills on a box well inside its triangle. The arcade original is
       just as forgiving and for the same reason: the tip of a spike is where
       the player's eye is, not where their body is. A saw kills on a circle a
       little smaller than its teeth. */
    function hazardHit(p, sz) {
      const hw = sz / 2;
      const c0 = Math.floor(p.x - 1), c1 = Math.floor(p.x + 1);
      for (let c = Math.max(0, c0); c <= c1; c++) {
        const ids = BK.spikes[c];
        if (ids) for (let k = 0; k < ids.length; k++) {
          const s = spikeList[ids[k]];
          const bx0 = s.x + 0.34, bx1 = s.x + 0.66;
          let by0, by1;
          if (s.small) { by0 = s.y + (s.down ? 0.66 : 0.02); by1 = s.y + (s.down ? 0.98 : 0.34); }
          else { by0 = s.y + (s.down ? 0.34 : 0.04); by1 = s.y + (s.down ? 0.96 : 0.66); }
          if (p.x + hw > bx0 && p.x - hw < bx1 && p.y + sz > by0 && p.y < by1) return true;
        }
        const sw = BK.saws[c];
        if (sw) for (let k = 0; k < sw.length; k++) {
          const s = sawAt(sawList[sw[k]], p.x);
          const dx = p.x - s.x, dy = p.y + sz / 2 - s.y, rr2 = s.r * 0.78 + sz * 0.32;
          if (dx * dx + dy * dy < rr2 * rr2) return true;
        }
      }
      return false;
    }

    function setMode(p, m) {
      if (p.mode === m) return;
      const before = sizeOf(p);
      p.mode = m;
      /* keep the centre where it was, so a size change is not a teleport */
      p.y += (before - sizeOf(p)) / 2;
      p.rot = 0;
      p.vy = clamp(p.vy, -8, 8);
      p.onGround = false;
    }

    function orbKick(p, kind) {
      if (kind === 'blue') { p.grav = -p.grav; p.vy = -ORB_BLUE_V * p.grav; }
      else p.vy = (kind === 'pink' ? ORB_PINK_V : ORB_V) * p.grav;
    }

    /* One physics step. `hold` is the key state; holding jumps again the
       instant you land, which is how the genre plays and what every level
       here is timed around. The UFO is the one vehicle that wants a fresh
       press each time, so the previous key state rides along in `held`. */
    function stepSim(p, dt, hold) {
      if (p.dead || p.won) return p;
      p.t += dt;
      const vx = SPEED * p.speedMul;
      const press = hold && !p.held;
      p.held = hold;
      p.jumped = 0;
      p.orbHit = -1;

      /* --- vertical --- */
      const prevY = p.y;
      let acted = false;
      if (hold && p.orbReady >= 0 && !p.orbUsed[p.orbReady] && p.mode !== 'wave') {
        const i = p.orbReady;
        p.orbUsed[i] = true; p.orbReady = -1; p.orbHit = i;
        orbKick(p, orbList[i].kind);
        p.onGround = false; p.jumped = 2; acted = true;
      }
      const G = p.grav;
      switch (p.mode) {
        case 'ship':
          /* thrust is always away from the floor you belong to, so a flipped
             ship climbs toward its own ceiling on the same button */
          p.vy += (hold ? (SHIP_THRUST - SHIP_GRAV) : -SHIP_GRAV) * G * dt;
          p.vy = clamp(p.vy, -SHIP_CAP, SHIP_CAP);
          break;
        case 'wave':
          p.vy = (hold ? 1 : -1) * vx * G;
          break;
        case 'ufo':
          if (press && !acted) { p.vy = UFO_V * G; p.onGround = false; p.jumped = 1; }
          p.vy -= UFO_GRAV * dt * G;
          p.vy = G > 0 ? Math.max(p.vy, -UFO_CAP) : Math.min(p.vy, UFO_CAP);
          break;
        case 'ball':
          if (hold && p.onGround && !acted) {
            p.grav = -G; p.vy = -BALL_KICK * p.grav; p.onGround = false; p.jumped = 3;
          }
          p.vy -= BALL_GRAV * dt * p.grav;
          p.vy = p.grav > 0 ? Math.max(p.vy, -FALL_CAP) : Math.min(p.vy, FALL_CAP);
          break;
        default:
          if (hold && p.onGround && !acted) { p.vy = JUMP_V * G; p.onGround = false; p.jumped = 1; }
          p.vy -= GRAV * dt * G;
          p.vy = G > 0 ? Math.max(p.vy, -FALL_CAP) : Math.min(p.vy, FALL_CAP);
      }
      p.y += p.vy * dt;

      /* Landing, resolved against the cell we were beside a moment ago.
         Every vehicle but the cube can also slide along a ceiling: a ship that
         brushes the roof stops climbing, the way it does in the arcade, while
         a cube that jumps into the underside of a block is a mistake. */
      const sz = sizeOf(p), hw = sz / 2;
      const bonk = p.mode !== 'cube';
      p.onGround = false; p.onRoof = false;
      {
        const x0 = Math.floor(p.x - hw + EPSO), x1 = Math.floor(p.x + hw - EPSO);
        for (let c = x0; c <= x1; c++) {
          const col = solidsIn(c); if (!col) continue;
          for (let i = 0; i < col.length; i++) {
            const yc = col[i];
            if (p.y + sz <= yc || p.y >= yc + 1) continue;       // no overlap
            const fromAbove = prevY >= yc + 1 - EPSO, fromBelow = prevY + sz <= yc + EPSO;
            if (p.grav > 0) {
              if (p.vy <= 0 && fromAbove) { p.y = yc + 1; p.vy = 0; p.onGround = true; }
              else if (bonk && p.vy >= 0 && fromBelow) { p.y = yc - sz; p.vy = 0; p.onRoof = true; }
            } else {
              if (p.vy >= 0 && fromBelow) { p.y = yc - sz; p.vy = 0; p.onGround = true; }
              else if (bonk && p.vy <= 0 && fromAbove) { p.y = yc + 1; p.vy = 0; p.onRoof = true; }
            }
          }
        }
      }

      /* --- horizontal --- */
      p.x += vx * dt;

      /* running into anything that is not the floor under your feet */
      if (overlapping(p, sz)) { p.dead = true; return p; }
      if (hazardHit(p, sz)) { p.dead = true; return p; }
      /* off the bottom, or off the top when flipped */
      if (p.y < -3 || p.y > ROWS + 3) { p.dead = true; return p; }

      /* --- rotation, which is cosmetic but has to be right ---
         On landing the cube settles to the nearest right angle over about a
         fifth of a second rather than snapping there on the frame it touches
         down. The snap can be up to forty-five degrees, and taken in one frame
         it is a visible flick every time the cube lands. */
      if (p.mode === 'cube') {
        if (p.onGround) {
          const tgt = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2);
          p.rot += (tgt - p.rot) * Math.min(1, dt * 26);
        } else p.rot -= p.grav * dt * (Math.PI / 0.5);      // half a turn per jump
      } else if (p.mode === 'ball') {
        p.rot -= p.grav * dt * 10;
      } else if (p.mode === 'wave') {
        const tgt = (p.onGround || p.onRoof) ? 0 : Math.atan2(p.vy, vx);
        p.rot += (tgt - p.rot) * Math.min(1, dt * 40);
      } else {
        const cap = p.mode === 'ufo' ? UFO_CAP : SHIP_CAP, lean = p.mode === 'ufo' ? 0.22 : 0.5;
        const tgt = clamp(p.vy / cap, -1, 1) * lean * p.grav;
        p.rot += (tgt - p.rot) * Math.min(1, dt * 14);
      }

      /* --- things you touch --- */
      const cA = Math.max(0, Math.floor(p.x - 1)), cB = Math.floor(p.x + 1);
      const mid = p.y + sz / 2;
      p.orbReady = -1;
      if (p.mode !== 'wave') {
        let padNow = -1;
        for (let c = cA; c <= cB; c++) {
          const oi = BK.orbs[c];
          if (oi) for (let k = 0; k < oi.length; k++) {
            const i = oi[k], o = orbList[i];
            if (p.orbUsed[i]) continue;
            if (Math.abs(o.x + 0.5 - p.x) < 1.0 && Math.abs(o.y + 0.5 - mid) < 1.0) p.orbReady = i;
          }
          const pi = BK.pads[c];
          if (pi) for (let k = 0; k < pi.length; k++) {
            const i = pi[k], d = padList[i];
            if (Math.abs(d.x + 0.5 - p.x) >= 0.9) continue;
            const touch = d.down ? (p.y + sz > d.y + 0.45 && p.y < d.y + 1) : (p.y < d.y + 0.55 && p.y + sz > d.y);
            /* a pad sits in three column buckets, so the same one can come up
               more than once in a step — and a blue pad that fires twice has
               turned you over and straight back */
            if (!touch || padNow === i) continue;
            padNow = i;
            if (d.kind === 'blue') {
              /* a blue pad turns you over once, not once per step you are on it */
              if (p.padLock !== i) { p.grav = -p.grav; p.vy = -PAD_BLUE_V * p.grav; p.onGround = false; p.hitPad = i; }
            } else {
              p.vy = (d.kind === 'pink' ? PAD_PINK_V : PAD_V) * p.grav; p.onGround = false; p.hitPad = i;
            }
          }
        }
        p.padLock = padNow;
      }
      for (let c = cA; c <= cB; c++) {
        const qi = BK.portals[c];
        if (qi) for (let k = 0; k < qi.length; k++) {
          const i = qi[k], q = portalList[i];
          if (p.portalDone[i] || Math.abs(q.x + 0.5 - p.x) > 0.7) continue;
          p.portalDone[i] = true;
          if (q.kind === 'grav') { p.grav = -p.grav; p.vy = 0; }
          else if (q.kind === 'speed') p.speedMul = q.mul;
          else if (MODES[q.kind]) setMode(p, q.kind);
          if (q.g && p.grav !== q.g) { p.grav = q.g; p.vy = 0; }
          p.tookPortal = i;
        }
        const ci = BK.coins[c];
        if (ci) for (let k = 0; k < ci.length; k++) {
          const i = ci[k], cn = coinList[i];
          if (p.coinsGot[i]) continue;
          if (Math.abs(cn.x + 0.5 - p.x) < 0.85 && Math.abs(cn.y + 0.5 - mid) < 0.9) {
            p.coinsGot[i] = true; p.coins++; p.gotCoin = i;
          }
        }
      }

      if (p.x >= LEN - 2) p.won = true;
      return p;
    }

    /* ------------------------------------------------------------- state */
    let P = newSim();
    let attempts = 1, bestPct = 0, deadT = 0;
    let checkpoint = null, cpFlash = 0;
    let ended = false, endT = 0;
    let camX = 0;
    let lastPad = -1, lastPortal = -1;
    let acc = 0;
    let runFrom = 1;                 // where this attempt started, for the attempt banner

    /* When things last happened, in sim seconds. A pad squashes when it fires,
       an orb kicks outward when it is hit, a coin lifts away when it is taken —
       and all three are drawn from these rather than from a particle, because
       a pad that visibly reacts says more than a spray of dots around it. */
    const padHitAt = {}, orbHitAt = {}, coinGotAt = {};

    /* The exhaust behind a ship and the line behind a wave: a short list of
       where the tail has been, drawn as one flat band that tapers to nothing. */
    const trail = [];
    let trailClock = 0;

    /* The only loose effects: an expanding ring for a pad, an orb, a portal or
       a coin, a few shards when an icon breaks, and three flecks of dust on a
       hard landing. */
    const fxs = [];
    const FX_MAX = 64;

    /* The state at the start of the substep currently in progress. The sim
       runs at a fixed 240Hz and the screen does not, so a frame almost never
       lands on a substep boundary — drawing the raw state means the icon's
       position quantises to whatever the last completed substep left, which at
       ten cells a second is a couple of pixels of jitter on every single
       frame. So the previous substep is kept and the frame draws between the
       two. */
    const prev = { x: 0, y: 0, rot: 0, ok: false };
    function snapPrev() { prev.x = P.x; prev.y = P.y; prev.rot = P.rot; prev.ok = true; }

    /* what to draw this frame: the sim, eased onto the exact display moment */
    const view = { x: 0, y: 0, rot: 0 };
    function lerpView() {
      const a = prev.ok ? clamp(acc / FIXED, 0, 1) : 1;
      view.x = prev.ok ? prev.x + (P.x - prev.x) * a : P.x;
      view.y = prev.ok ? prev.y + (P.y - prev.y) * a : P.y;
      /* rotation eases to its resting angle rather than jumping to it, so the
         interpolation never has to cross a snap */
      view.rot = prev.ok ? prev.rot + (P.rot - prev.rot) * a : P.rot;
    }

    /* ------------------------------------------------------------- effects */
    function fxPush(e) {
      if (fxs.length >= FX_MAX) fxs.shift();
      e.t = e.t || 0;
      fxs.push(e);
    }
    /* one ring that grows and thins; `delay` staggers a second one behind it */
    function burst(x, y, col, r0, r1, th, life, delay) {
      fxPush({ k: 'ring', x: x, y: y, col: col, r0: r0, r1: r1, th: th, life: life, t: -(delay || 0) });
    }
    /* An icon coming apart: its own colours in eight hard-edged pieces and two
       rings. That is the whole explosion, and it reads better than a cloud. */
    function shatter(x, y, slot) {
      const S = SLOTS[slot || 0];
      const cols = [S.pri3, S.sec3, S.priLo3, C3.ink];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + rand(-0.3, 0.3), s = rand(4.5, 9.5);
        fxPush({ k: 'bit', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 2.5, g: 26,
                 rot: rand(0, TAU), vr: rand(-12, 12), s: rand(0.08, 0.15), col: cols[i % 4],
                 life: rand(0.45, 0.62) });
      }
      burst(x, y, S.pri3, 0.25, 2.1, 0.26, 0.42, 0);
      burst(x, y, C3.white, 0.15, 1.35, 0.12, 0.34, 0.05);
    }
    function dust(x, y, dir) {
      for (let i = 0; i < 3; i++) {
        fxPush({ k: 'bit', x: x + rand(-0.3, 0.3), y: y, vx: rand(-2.6, 0.6), vy: rand(0.6, 2.2) * dir,
                 g: 9 * dir, rot: 0, vr: 0, s: rand(0.045, 0.075), col: C3.white, life: rand(0.22, 0.32) });
      }
    }
    function stepFx(dt) {
      for (let i = fxs.length - 1; i >= 0; i--) {
        const e = fxs[i];
        e.t += dt;
        if (e.t >= e.life) { fxs.splice(i, 1); continue; }
        if (e.k !== 'bit' || e.t < 0) continue;
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.vy -= e.g * dt;
        e.vx *= 1 - 1.4 * dt;
        e.rot += e.vr * dt;
      }
    }

    function reset(toCheckpoint) {
      const cp = toCheckpoint && checkpoint;
      P = newSim();
      if (cp) {
        P.x = cp.x; P.y = cp.y; P.vy = 0; P.grav = cp.grav; P.t = cp.t || 0;
        P.mode = cp.mode; P.speedMul = cp.speedMul;
        P.coins = cp.coins; P.coinsGot = Object.assign({}, cp.coinsGot);
        P.portalDone = Object.assign({}, cp.portalDone);
        P.orbUsed = Object.assign({}, cp.orbUsed);
      }
      runFrom = P.x;
      fxs.length = 0; trail.length = 0; trailClock = 0;
      for (const m of [padHitAt, orbHitAt, coinGotAt]) for (const k in m) delete m[k];
      deadT = 0; acc = 0;
      lastPad = -1; lastPortal = -1;
      camX = Math.max(0, P.x - 7);
      /* nothing to interpolate from across a teleport */
      prev.ok = false; lerpView();
    }

    /* The simulation sets `dead` itself, so this cannot guard on that — an
       earlier version did, returned immediately every time, and quietly ate
       the sound, the shake, the confetti and the attempt counter. It guards on
       its own flag instead. */
    function die() {
      if (P.deathDone) return;
      P.deathDone = true;
      P.dead = true;
      bestPct = Math.max(bestPct, pct());
      saveRun(LKEY, bestPct, P.coins);
      Sound.explode();
      api.shake(7);
      shatter(P.x, P.y + sizeOf(P) / 2, MY_SLOT);
      if (ONLINE) {
        /* one life: this is the end of your race, and everyone hears so now */
        RACE.finish(pct());
        postKeyframe(true);
        outT = 0;
      } else attempts++;
    }

    function pct() { return clamp(Math.round((P.x / (LEN - 2)) * 100), 0, 100); }

    /* ------------------------------------------------------------ the HUD */
    function pushHud() {
      if (phase === 'select' || phase === 'lobby') {
        const L = PARSED[ORDER[pick]];
        const h = { Level: L.name, Best: savedBest(L.key) + '%', Coins: savedCoins(L.key) + '/' + L.coins.length };
        if (ONLINE) h.Players = ROSTER.length; else h.Mode = PRACTICE ? 'Practice' : 'Normal';
        api.hud(h);
        return;
      }
      if (ONLINE) {
        let alive = 0;
        for (const p of ROSTER) { const b = RACE.board[p.id]; if (b && !b.done) alive++; }
        api.hud({ Level: LDEF.name, Progress: pct() + '%', Racing: alive + '/' + ROSTER.length });
        return;
      }
      const h = { Level: LDEF.name, Progress: pct() + '%', Attempts: attempts };
      if (coinList.length) h.Coins = P.coins + '/' + coinList.length;
      if (PRACTICE) h.Mode = 'Practice';
      api.hud(h);
    }

    /* ==================================================================== */
    /*  ONLINE                                                              */
    /* ==================================================================== */
    /* A race uses the hub's race channel: a score and an alive flag for the
       standings, a `finish` when you are out, and a free-form post for live
       state. Nobody is authoritative over anybody else's run — each player's
       own machine decides whether they hit the spike — and the host's only
       extra job is choosing the level and saying go. */
    const RACE = getRace('gdash');
    const ONLINE = !!RACE;
    const ROSTER = ONLINE ? (RACE.cfg.players || []).slice(0, 4) : [];
    const HOST_ID = ONLINE ? (RACE.cfg.host || (ROSTER[0] && ROSTER[0].id)) : null;
    const ME_ID = ONLINE ? RACE.me : null;
    const IS_HOST = !ONLINE || ME_ID === HOST_ID;
    const slotOf = id => { const i = ROSTER.findIndex(p => p.id === id); return i < 0 ? 0 : i % SLOTS.length; };
    /* online your colours are your seat's; on your own you pick them on the
       select screen */
    let MY_SLOT = ONLINE ? slotOf(ME_ID) : clamp(parseInt(Store.opt('gdash', 'icon') || '0', 10) || 0, 0, SLOTS.length - 1);
    const nameOf = id => { const p = ROSTER.find(q => q.id === id); return p ? p.name : 'Player'; };
    const COUNT_MS = 3400;

    let countEnd = 0, countBeat = -1;     // when GO fires, and the last number that beeped
    let raceLevel = null, seenGo = 0;
    let outT = 0, resultsT = -1;          // time since you went out; the delay before results
    let specId = null, specSwitchT = 0;
    let lastPostAt = 0, lastPostHold = false;
    let lobbyPosted = '';
    const ghosts = {};

    /* A keyframe is everything a copy of the simulation needs to carry on from
       where this one is: position and velocity, vehicle, gravity, speed, the
       key state, and which portals and orbs are already spent. Portals are
       spent strictly in order along the level, so one number covers them. */
    function keyframe() {
      let pd = 0;
      for (const k in P.portalDone) pd = Math.max(pd, (+k) + 1);
      const ou = [];
      for (const k in P.orbUsed) ou.push(+k);
      const r3 = v => Math.round(v * 1000) / 1000;
      return {
        ph: 'run', lv: LKEY, x: r3(P.x), y: r3(P.y), vy: r3(P.vy), r: Math.round(P.rot * 100) / 100,
        m: MODE_ID.indexOf(P.mode), g: P.grav, s: P.speedMul, h: P.held ? 1 : 0,
        og: P.onGround ? 1 : 0, pl: P.padLock, pd: pd, ou: ou, c: P.coins,
        d: P.dead ? 1 : 0, w: P.won ? 1 : 0
      };
    }
    /* Sent eight times a second, and sooner whenever the button changes — the
       press is the one thing a ghost cannot predict, so it is the thing worth
       paying a message for. Realtime is billed per message per recipient, so
       nothing else here is sent on a timer faster than that. */
    function postKeyframe(force) {
      if (!ONLINE) return;
      const t = performance.now();
      const holdChanged = P.held !== lastPostHold;
      if (!force && !(holdChanged && t - lastPostAt > 60) && t - lastPostAt < 120) return;
      lastPostAt = t; lastPostHold = P.held;
      RACE.post(keyframe(), true);
    }

    function simFrom(k) {
      const s = newSim();
      s.x = k.x; s.y = k.y; s.vy = k.vy || 0; s.rot = k.r || 0;
      s.mode = MODE_ID[k.m] || 'cube';
      s.grav = k.g < 0 ? -1 : 1; s.speedMul = k.s || 1;
      s.held = !!k.h; s.onGround = !!k.og;
      s.padLock = k.pl === undefined ? -1 : k.pl;
      for (let i = 0; i < (k.pd || 0); i++) s.portalDone[i] = true;
      if (k.ou) for (const i of k.ou) s.orbUsed[i] = true;
      return s;
    }

    /* A ghost is the last keyframe from a player, run forward through the same
       physics with their key held the way it was. Between packets it is not
       an estimate, it is the simulation — it only drifts if they pressed or
       let go since, and the next packet (sent the moment they did) corrects
       that, with the difference eased out over a few frames rather than
       snapped. */
    function ghostOf(id) {
      const pkt = RACE && RACE.peers[id];
      if (!pkt || pkt.ph !== 'run' || pkt.lv !== LKEY) return null;
      let g = ghosts[id];
      if (!g) g = ghosts[id] = { pkt: null, sim: null, steps: 0, dx: 0, dy: 0, x: 0, y: 0, rot: 0, shown: false, broke: false };
      if (g.pkt !== pkt) {
        const hadX = g.x, hadY = g.y, had = g.shown;
        g.pkt = pkt;
        g.sim = simFrom(pkt);
        g.steps = 0;
        advanceGhost(g);
        if (had && Math.abs(hadX - g.sim.x) < 2.5 && Math.abs(hadY - g.sim.y) < 2.5) {
          g.dx = hadX - g.sim.x; g.dy = hadY - g.sim.y;
        } else { g.dx = 0; g.dy = 0; }
      } else advanceGhost(g);
      g.x = g.sim.x + g.dx; g.y = g.sim.y + g.dy; g.rot = g.sim.rot;
      g.shown = true;
      return g;
    }
    function advanceGhost(g) {
      const pkt = g.pkt;
      if (pkt.d || pkt.w) return;
      /* never run a ghost more than half a second past its packet: if the
         packets have stopped, a player standing still is closer to the truth
         than one sprinting off into the level on their own */
      const want = Math.min(120, Math.floor(Math.max(0, Date.now() - pkt._t) / 1000 / FIXED));
      /* A predicted death just stops the ghost where it is; only the player's
         own packet says they actually died. */
      while (g.steps < want && !g.sim.dead && !g.sim.won) { stepSim(g.sim, FIXED, !!pkt.h); g.steps++; }
    }
    function easeGhosts(dt) {
      const k = Math.exp(-dt * 12);
      for (const id in ghosts) { ghosts[id].dx *= k; ghosts[id].dy *= k; }
    }

    /* who is still running, in seat order */
    function runners() {
      const out = [];
      if (!ONLINE) return out;
      for (const p of ROSTER) {
        if (p.id === ME_ID) continue;
        const b = RACE.board[p.id];
        if (b && b.done) continue;
        const pk = RACE.peers[p.id];
        if (pk && (pk.d || pk.w)) continue;
        out.push(p.id);
      }
      return out;
    }
    function livePct(id) {
      if (id === ME_ID) return phase === 'run' || phase === 'out' ? pct() : 0;
      const g = ghosts[id];
      const b = RACE.board[id];
      const fromGhost = g && g.pkt && g.pkt.lv === LKEY ? clamp(Math.round((g.x / (LEN - 2)) * 100), 0, 100) : 0;
      return Math.max(fromGhost, b ? b.score : 0);
    }

    /* ==================================================================== */
    /*  RENDERER                                                            */
    /* ==================================================================== */
    /* One instanced quad and five fills: rectangle, circle, triangle, ring,
       and a sprite cut out of an atlas. Anything with a real silhouette — the
       cube, the ship, spikes, pads, orbs, portals, coins — is drawn once with
       canvas paths into that atlas and stamped from it. Anything that is only
       a block of colour (sky, floor, the blocks themselves) stays a plain quad,
       which is sharp at every size without being baked at all.

       The atlas is baked at the pixel density it is actually shown at and
       baked again if that changes. Art drawn at 200px and shrunk to 60 on
       screen is soft however good the filtering is; art baked at 60 has the
       same edge a path does. */
    const MAXI = 4000;
    const STRIDE = 16;               // rect(4) misc(4) col(4) uv(4)
    const idata = new Float32Array(MAXI * STRIDE);
    let icount = 0;

    const K_RECT = 0, K_CIRC = 1, K_TRI = 2, K_RING = 3, K_SPR = 4;

    function quad(cx, cy, hw, hh, col, rot, shape, alpha, extra) {
      if (icount >= MAXI) return;
      const o = icount * STRIDE;
      idata[o] = cx; idata[o + 1] = cy; idata[o + 2] = hw; idata[o + 3] = hh;
      idata[o + 4] = rot || 0; idata[o + 5] = shape || 0;
      idata[o + 6] = alpha === undefined ? 1 : alpha; idata[o + 7] = extra || 0;
      idata[o + 8] = col[0]; idata[o + 9] = col[1]; idata[o + 10] = col[2]; idata[o + 11] = 1;
      idata[o + 12] = 0; idata[o + 13] = 0; idata[o + 14] = 0; idata[o + 15] = 0;
      icount++;
    }
    /* a ring `th` cells thick */
    function ring(cx, cy, r, th, col, alpha) {
      if (r <= 0.01) return;
      quad(cx, cy, r, r, col, 0, K_RING, alpha, clamp(th / r, 0.02, 1));
    }
    /* A sprite by name, centred, sized in cells. A negative half-height mirrors
       it top to bottom, which is how everything turns over for a gravity flip. */
    function spr(name, cx, cy, hw, hh, rot, alpha) {
      const s = SPR[name];
      if (!s || icount >= MAXI) return;
      const o = icount * STRIDE;
      quad(cx, cy, hw === undefined ? s.w / 2 : hw, hh === undefined ? s.h / 2 : hh,
           C3.white, rot, K_SPR, alpha);
      idata[o + 12] = s.u0; idata[o + 13] = s.v0; idata[o + 14] = s.u1; idata[o + 15] = s.v1;
    }
    /* four thin quads round a box — an outline that stays exactly `w` wide */
    function frame(cx, cy, hw, hh, w, col, alpha) {
      quad(cx, cy + hh - w / 2, hw, w / 2, col, 0, K_RECT, alpha);
      quad(cx, cy - hh + w / 2, hw, w / 2, col, 0, K_RECT, alpha);
      quad(cx - hw + w / 2, cy, w / 2, hh - w, col, 0, K_RECT, alpha);
      quad(cx + hw - w / 2, cy, w / 2, hh - w, col, 0, K_RECT, alpha);
    }
    /* a point `ox,oy` out from a centre, turned with it */
    const _t = { x: 0, y: 0 };
    function turn(cx, cy, ox, oy, rot) {
      const c = Math.cos(rot), s = Math.sin(rot);
      _t.x = cx + ox * c - oy * s; _t.y = cy + ox * s + oy * c;
      return _t;
    }
    /* stable noise for placing scenery, so it does not reshuffle every frame */
    function hash2(a, b) {
      let h = (a * 374761393 + b * 668265263) | 0;
      h = (h ^ (h >>> 13)) * 1274126177 | 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    /* ------------------------------------------------------------ the art */
    /* Every drawing below works in CELLS with the origin at the sprite's top
       left and y running down, the way canvas does. Line widths are cells too,
       so an outline is the same weight on every sprite whatever size the atlas
       was baked at. */
    function rrect(g, x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    function poly(g, pts) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
    }
    function disc(g, x, y, r, col) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); }
    function inked(g, fill, lw) {
      g.fillStyle = fill; g.fill();
      g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'miter'; g.miterLimit = 3; g.stroke();
    }
    /* the slanted eyes every icon shares, centred on (cx, cy) at scale k */
    function eyes(g, cx, cy, k, S) {
      g.save(); g.translate(cx, cy); g.scale(k, k); g.translate(-0.5, -0.43);
      poly(g, [[0.25, 0.3], [0.45, 0.37], [0.45, 0.55], [0.25, 0.55]]); g.fillStyle = INK; g.fill();
      poly(g, [[0.75, 0.3], [0.55, 0.37], [0.55, 0.55], [0.75, 0.55]]); g.fill();
      poly(g, [[0.29, 0.37], [0.41, 0.41], [0.41, 0.51], [0.29, 0.51]]); g.fillStyle = S.sec; g.fill();
      poly(g, [[0.71, 0.37], [0.59, 0.41], [0.59, 0.51], [0.71, 0.51]]); g.fill();
      g.restore();
    }

    /* THE CUBE. A face, not a set of nested squares — nested squares are what
       a placeholder looks like, and a face with a bit of attitude is a
       character you are rooting for. Beveled metal, a glass visor, and corner
       fasteners give the small silhouette depth without changing its hitbox. */
    function artCube(g,w,S){
      g.save();g.scale(w,w);
      poly(g,[[.12,.02],[.88,.02],[.98,.12],[.98,.88],[.88,.98],[.12,.98],[.02,.88],[.02,.12]]);inked(g,material(g,0,0,1,1,S),.055);
      poly(g,[[.12,.08],[.88,.08],[.8,.18],[.2,.18],[.1,.82],[.08,.12]]);g.fillStyle=S.priHi;g.fill();
      poly(g,[[.9,.18],[.94,.14],[.94,.86],[.86,.94],[.16,.94],[.24,.84],[.82,.84]]);g.fillStyle=S.priLo;g.fill();
      rrect(g,.19,.21,.62,.51,.065);g.fillStyle='#142639';g.fill();g.lineWidth=.035;g.strokeStyle=INK;g.stroke();
      const visor=g.createLinearGradient(0,.25,0,.65);visor.addColorStop(0,S.secHi);visor.addColorStop(.45,S.sec);visor.addColorStop(1,S.secLo);
      poly(g,[[.25,.31],[.44,.38],[.44,.55],[.25,.55]]);g.fillStyle=visor;g.fill();poly(g,[[.75,.31],[.56,.38],[.56,.55],[.75,.55]]);g.fill();
      g.fillStyle='rgba(255,255,255,.7)';g.fillRect(.27,.34,.045,.11);g.fillRect(.58,.4,.045,.10);
      for(let i=0;i<3;i++){rrect(g,.33+i*.13,.76,.08,.07,.02);g.fillStyle=i===1?S.secHi:INK;g.fill();}
      for(const [x,y]of [[.12,.12],[.88,.12],[.12,.88],[.88,.88]]){disc(g,x,y,.035,INK);disc(g,x-.008,y-.008,.013,S.priHi);}
      g.restore();
    }

    /* THE SHIP, nose to the right: a chunky rocket with a tail fin, an engine
       block and a stripe in the cube's colour. The cube rides in it — drawn
       separately, sunk into the top of the hull — which is the genre's tell
       that this is still you, just in something faster. */
    const SHIP_W = 1.72, SHIP_H = 1.0;
    function artShip(g,S){
      poly(g,[[.17,.51],[.04,.15],[.27,.15],[.67,.47],[1.08,.43],[1.65,.69],[1.12,.94],[.25,.96],[.06,.80]]);inked(g,material(g,0,.15,1.7,.8,S,true),.065);
      poly(g,[[.51,.5],[1.06,.49],[1.49,.68],[1.06,.64],[.3,.64]]);g.fillStyle=S.secHi;g.fill();
      poly(g,[[.42,.74],[1.21,.76],[1.54,.69],[1.14,.89],[.3,.89]]);g.fillStyle=S.secLo;g.fill();
      rrect(g,.05,.54,.24,.3,.04);g.fillStyle=INK;g.fill();rrect(g,.08,.59,.12,.20,.025);g.fillStyle=S.pri;g.fill();
      poly(g,[[.37,.66],[1.28,.66],[1.45,.70],[1.27,.75],[.37,.75]]);inked(g,S.pri,.025);
      for(let i=0;i<3;i++){rrect(g,.40+i*.16,.8,.09,.07,.02);g.fillStyle=INK;g.fill();}
      disc(g,1.28,.61,.07,INK);disc(g,1.28,.61,.039,S.secHi);
      poly(g,[[.6,.81],[.42,.99],[.94,.91]]);inked(g,S.pri,.035);
    }

    /* THE BALL: a wheel in the player's colours with studs round a ring, so
       the roll is something you can actually see turn. */
    function artBall(g,w,S){
      g.save();g.scale(w,w);const points=[];for(let i=0;i<32;i++){const a=i*TAU/32,r=i%4<2?.48:.43;points.push([.5+Math.cos(a)*r,.5+Math.sin(a)*r]);}poly(g,points);inked(g,material(g,0,0,1,1,S),.035);
      disc(g,.5,.5,.36,INK);disc(g,.5,.5,.30,material(g,.2,.2,.6,.6,S,true));disc(g,.5,.5,.22,'#142639');
      for(let i=0;i<6;i++){const a=i*TAU/6;disc(g,.5+Math.cos(a)*.36,.5+Math.sin(a)*.36,.037,S.priHi);}
      eyes(g,.5,.49,.58,S);poly(g,[[.44,.68],[.5,.73],[.56,.68]]);g.fillStyle=S.priHi;g.fill();g.restore();
    }

    /* THE UFO: a saucer with a glass dome, the cube sitting inside it. The
       dome's glass and the saucer are two sprites so the cube can go between
       them. */
    const UFO_W = 1.4, UFO_H = 1.0;
    function artUfoBack(g,S){
      g.beginPath();g.ellipse(.7,.58,.37,.44,0,Math.PI,TAU);g.closePath();const a=g.createLinearGradient(.3,.12,1.1,.7);a.addColorStop(0,'#e6fcff');a.addColorStop(.25,S.secHi);a.addColorStop(1,S.secLo);g.fillStyle=a;g.fill();
    }
    function artUfo(g,S){
      g.beginPath();g.ellipse(.7,.58,.37,.44,0,Math.PI,TAU);g.lineWidth=.065;g.strokeStyle=INK;g.stroke();
      g.beginPath();g.ellipse(.7,.67,.64,.22,0,0,TAU);inked(g,material(g,.08,.45,1.2,.45,S),.065);
      poly(g,[[.16,.68],[.40,.84],[1.0,.84],[1.24,.68],[.97,.74],[.43,.74]]);g.fillStyle=S.priLo;g.fill();
      for(const x of [.32,.57,.82,1.07]){disc(g,x,.7,.059,INK);disc(g,x,.7,.033,S.secHi);}
      g.beginPath();g.ellipse(.51,.33,.053,.12,.5,0,TAU);g.fillStyle='rgba(255,255,255,.82)';g.fill();
      poly(g,[[.48,.88],[.92,.88],[.82,.98],[.58,.98]]);inked(g,S.secLo,.04);g.fillStyle=S.secHi;g.fillRect(.61,.90,.18,.025);
    }

    /* THE WAVE: a dart, nose first. It rides a diagonal, so it is drawn along
       its own heading. */
    function artWave(g,S){
      poly(g,[[.03,.05],[.96,.4],[.03,.75],[.25,.4]]);inked(g,material(g,0,0,1,.8,S),.06);
      poly(g,[[.12,.13],[.88,.4],[.35,.34]]);g.fillStyle=S.priHi;g.fill();
      poly(g,[[.12,.67],[.88,.4],[.35,.46]]);g.fillStyle=S.priLo;g.fill();
      poly(g,[[.32,.4],[.5,.27],[.78,.4],[.5,.53]]);inked(g,material(g,.3,.25,.5,.3,S,true),.035);disc(g,.52,.4,.039,S.secHi);
    }

    /* A spike: black, white edge, and a second smaller outline inside it, which
       is what turns a flat triangle into something with a face to it. */
    function artSpike(g){
      poly(g,[[.5,.1],[.955,.962],[.045,.962]]);const grad=g.createLinearGradient(.15,.2,.85,1);grad.addColorStop(0,'#71829c');grad.addColorStop(.45,'#202c45');grad.addColorStop(1,INK);g.fillStyle=grad;g.fill();g.lineWidth=.065;g.strokeStyle='#eaf7ff';g.lineJoin='miter';g.stroke();
      poly(g,[[.5,.22],[.5,.87],[.16,.91]]);g.fillStyle='#485a75';g.fill();poly(g,[[.5,.52],[.7,.9],[.3,.9]]);g.lineWidth=.035;g.strokeStyle='#8ca6c8';g.stroke();
      g.fillStyle='#c6e8ff';g.fillRect(.18,.90,.63,.032);
    }
    function artSpikeSmall(g) {
      poly(g, [[0.5, 0.08], [0.94, 0.46], [0.06, 0.46]]);
      g.fillStyle = INK; g.fill();
      g.lineWidth = 0.07; g.strokeStyle = '#ffffff'; g.lineJoin = 'miter'; g.miterLimit = 8; g.stroke();
    }
    /* A saw: a toothed disc that never stops turning. The teeth lean one way
       so the spin has a direction you can read. */
    function artSaw(g) {
      const n = 14, pts = [];
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 0.62) / n) * TAU;
        pts.push([0.5 + Math.cos(a0) * 0.36, 0.5 + Math.sin(a0) * 0.36]);
        pts.push([0.5 + Math.cos(a1) * 0.47, 0.5 + Math.sin(a1) * 0.47]);
      }
      poly(g, pts);
      g.fillStyle = '#e6ebf3'; g.fill();
      g.lineWidth = 0.045; g.strokeStyle = INK; g.lineJoin = 'miter'; g.miterLimit = 6; g.stroke();
      disc(g, 0.5, 0.5, 0.3, '#9aa3b6');
      g.beginPath(); g.arc(0.5, 0.5, 0.3, 0, TAU); g.lineWidth = 0.04; g.strokeStyle = INK; g.stroke();
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3;
        g.save(); g.translate(0.5, 0.5); g.rotate(a);
        rrect(g, 0.1, -0.035, 0.14, 0.07, 0.03); g.fillStyle = INK; g.fill();
        g.restore();
      }
      disc(g, 0.5, 0.5, 0.09, INK);
      disc(g, 0.5, 0.5, 0.045, '#e6ebf3');
    }

    /* THE JUMP PAD. A dome on a bolted plate — a thing that visibly does
       something. Its arrows are separate sprites so they can climb off it. */
    const PAD_W = 1.0, PAD_H = 0.5;
    function artPad(g, C) {
      const lw = 0.065;
      rrect(g, 0.02, 0.33, 0.96, 0.16, 0.05); g.fillStyle = INK; g.fill();
      rrect(g, 0.075, 0.37, 0.85, 0.08, 0.025); g.fillStyle = '#6b6290'; g.fill();
      g.fillStyle = '#4a4368'; g.fillRect(0.075, 0.41, 0.85, 0.04);
      g.fillStyle = INK; g.fillRect(0.13, 0.39, 0.05, 0.035); g.fillRect(0.82, 0.39, 0.05, 0.035);
      g.beginPath(); g.ellipse(0.5, 0.36, 0.43, 0.32, 0, Math.PI, TAU); g.closePath();
      g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(0.5, 0.36, 0.43 - lw, 0.32 - lw, 0, Math.PI, TAU); g.closePath();
      g.save(); g.clip();
      g.fillStyle = C.base; g.fillRect(0, 0, 1, 1);
      g.fillStyle = C.lo; g.fillRect(0, 0.27, 1, 0.2);
      g.fillStyle = C.hi;
      g.beginPath(); g.ellipse(0.38, 0.15, 0.15, 0.055, -0.3, 0, TAU); g.fill();
      g.restore();
    }
    function artChevron(g, C) {
      const path = () => { g.beginPath(); g.moveTo(0.08, 0.36); g.lineTo(0.3, 0.14); g.lineTo(0.52, 0.36); };
      g.lineJoin = 'miter';
      path(); g.lineWidth = 0.17; g.lineCap = 'square'; g.strokeStyle = INK; g.stroke();
      path(); g.lineWidth = 0.08; g.lineCap = 'butt'; g.strokeStyle = C.base; g.stroke();
    }

    /* THE ORB: a thick ring round a pale core, and a broken outer ring that
       turns slowly so an orb is never mistaken for a coin at a glance. A blue
       one says what it does in its core. */
    function artOrb(g, C, kind) {
      disc(g, 0.5, 0.5, 0.47, INK);
      disc(g, 0.5, 0.5, 0.405, C.base);
      g.save();
      g.beginPath(); g.arc(0.5, 0.5, 0.405, 0, TAU); g.clip();
      g.fillStyle = C.lo; g.fillRect(0, 0.64, 1, 1);
      g.restore();
      disc(g, 0.5, 0.5, 0.25, INK);
      disc(g, 0.5, 0.5, 0.19, '#fffbf2');
      if (kind === 'blue') {
        poly(g, [[0.5, 0.33], [0.6, 0.45], [0.4, 0.45]]); g.fillStyle = INK; g.fill();
        poly(g, [[0.5, 0.67], [0.6, 0.55], [0.4, 0.55]]); g.fill();
      } else if (kind === 'pink') {
        disc(g, 0.5, 0.5, 0.075, C.lo);
      }
      g.fillStyle = C.hi;
      g.beginPath(); g.ellipse(0.35, 0.25, 0.09, 0.045, -0.7, 0, TAU); g.fill();
    }
    function artOrbDash(g, C) {
      const RAD = 0.64;
      for (let i = 0; i < 4; i++) {
        const a0 = i * TAU / 4 + 0.32, a1 = a0 + TAU / 4 - 0.64;
        g.beginPath(); g.arc(0.75, 0.75, RAD, a0, a1);
        g.lineCap = 'butt';
        g.lineWidth = 0.12; g.strokeStyle = INK; g.stroke();
        g.beginPath(); g.arc(0.75, 0.75, RAD, a0 + 0.04, a1 - 0.04);
        g.lineWidth = 0.05; g.strokeStyle = C.base; g.stroke();
      }
    }

    /* a secret coin: gold, a pressed rim, a star */
    function artCoin(g) {
      disc(g, 0.5, 0.5, 0.46, INK);
      disc(g, 0.5, 0.5, 0.395, COINC.base);
      g.save();
      g.beginPath(); g.arc(0.5, 0.5, 0.395, 0, TAU); g.clip();
      g.fillStyle = COINC.lo; g.fillRect(0, 0.66, 1, 1);
      g.restore();
      g.beginPath(); g.arc(0.5, 0.5, 0.3, 0, TAU);
      g.lineWidth = 0.04; g.strokeStyle = COINC.lo; g.stroke();
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.095 : 0.215;
        pts.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
      }
      poly(g, pts); inked(g, COINC.hi, 0.04);
    }

    /* PORTALS. A tall oval frame with a band of the portal's colour, a paler
       inner lip, and three fins on the back edge pointing where you came from.
       The symbol inside says what it does, because colour alone asks a new
       player to learn a legend before they can read the level. */
    const PORTAL_W = 1.7, PORTAL_H = 3.8;
    function artPortal(g, C, glyph) {
      const cx = 0.92, cy = 1.9, lw = 0.07;
      for (const fy of [-1.05, 0, 1.05]) {
        poly(g, [[cx - 0.3, cy + fy - 0.3], [cx - 0.84, cy + fy], [cx - 0.3, cy + fy + 0.3]]);
        inked(g, C.lo, lw);
      }
      g.beginPath(); g.ellipse(cx, cy, 0.56, 1.82, 0, 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(cx, cy, 0.49, 1.75, 0, 0, TAU); g.fillStyle = C.base; g.fill();
      g.save();
      g.beginPath(); g.ellipse(cx, cy, 0.49, 1.75, 0, 0, TAU); g.clip();
      g.fillStyle = C.lo; g.fillRect(cx, 0, 1, 4);
      g.restore();
      g.beginPath(); g.ellipse(cx, cy, 0.38, 1.6, 0, 0, TAU);
      g.lineWidth = 0.05; g.strokeStyle = C.hi; g.stroke();
      g.beginPath(); g.ellipse(cx, cy, 0.31, 1.49, 0, 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(cx, cy, 0.31, 1.49, 0, 0, TAU);
      g.fillStyle = C.base; g.globalAlpha = 0.2; g.fill(); g.globalAlpha = 1;
      g.save(); g.translate(cx, cy); glyph(g, C); g.restore();
    }
    const GLYPH = {
      ship(g, C) {
        poly(g, [[-0.2, -0.1], [0.22, 0.0], [-0.2, 0.1], [-0.12, 0.0]]);
        g.fillStyle = C.hi; g.fill();
      },
      cube(g, C) {
        g.fillStyle = C.hi; g.fillRect(-0.13, -0.13, 0.26, 0.26);
        g.fillStyle = INK; g.fillRect(-0.06, -0.06, 0.12, 0.12);
      },
      ball(g, C) {
        disc(g, 0, 0, 0.15, C.hi);
        disc(g, 0, 0, 0.07, INK);
      },
      ufo(g, C) {
        g.fillStyle = C.hi;
        g.beginPath(); g.ellipse(0, 0.03, 0.2, 0.07, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(0, 0.0, 0.09, 0.1, 0, Math.PI, TAU); g.fill();
      },
      wave(g, C) {
        g.beginPath(); g.moveTo(-0.17, 0.25); g.lineTo(0.13, -0.05); g.lineTo(-0.13, -0.05); g.lineTo(0.17, -0.35);
        g.lineWidth = 0.07; g.strokeStyle = C.hi; g.lineJoin = 'miter'; g.stroke();
        g.beginPath(); g.moveTo(-0.17, 0.45); g.lineTo(0.17, 0.11);
        g.stroke();
      },
      grav(g, C) {
        g.fillStyle = C.hi;
        poly(g, [[0, -0.42], [0.15, -0.2], [0.055, -0.2], [0.055, 0.2], [0.15, 0.2], [0, 0.42], [-0.15, 0.2], [-0.055, 0.2], [-0.055, -0.2], [-0.15, -0.2]]);
        g.fill();
      }
    };
    /* speed changers are a sign, not a door: chevrons, one per notch, and a
       slow one points backwards */
    const SPEED_W = 1.5, SPEED_H = 2.3;
    function artSpeed(g, C, n, back) {
      if (back) { g.translate(SPEED_W, 0); g.scale(-1, 1); }
      for (let i = n - 1; i >= 0; i--) {
        const x0 = 0.08 + i * 0.44;
        const shape = [[x0, 0.1], [x0 + 0.34, 0.1], [x0 + 0.88, 1.15], [x0 + 0.34, 2.2], [x0, 2.2], [x0 + 0.54, 1.15]];
        poly(g, shape);
        g.fillStyle = C.base; g.fill();
        g.save(); g.clip();
        g.fillStyle = C.lo; g.fillRect(0, 1.15, 2, 2);
        g.restore();
        poly(g, shape);
        g.lineWidth = 0.07; g.strokeStyle = INK; g.lineJoin = 'miter'; g.miterLimit = 5; g.stroke();
      }
    }
    /* the practice checkpoint: a green diamond, as the genre has it */
    function artCheckpoint(g) {
      poly(g, [[0.35, 0.03], [0.67, 0.35], [0.35, 0.67], [0.03, 0.35]]);
      inked(g, '#4ade80', 0.06);
      poly(g, [[0.35, 0.18], [0.52, 0.35], [0.35, 0.52], [0.18, 0.35]]);
      g.fillStyle = '#bbf7d0'; g.fill();
    }

    /* name, width and height in cells, and how to draw it */
    function material(g,x,y,w,h,S,secondary=false){
      const grad=g.createLinearGradient(x,y,x+w,y+h);
      grad.addColorStop(0,secondary?S.secHi:S.priHi);grad.addColorStop(.38,secondary?S.sec:S.pri);grad.addColorStop(1,secondary?S.secLo:S.priLo);return grad;
    }

    function drawStageScenery(cx,v,th,sv,t){
      const tr=TRACKS[LKEY],beat=(sv.t||t)*tr.bpm/60,pulse=Math.pow(1-(beat%1),3),accent=hex3(LDEF.accent),iKey=Object.keys(TRACKS).indexOf(LKEY);
      // Layered dusk gradients are built from quads; gameplay edges stay crisp.
      for(let y=0;y<16;y++){const k=y/15;quad(cx+v.vw/2,VIEW_Y+(y+.5)*v.vh/16,v.vw/2+.2,v.vh/32+.01,mix3(th.bg,C3.ink,.50+k*.28),0,K_RECT,1);}
      const moonX=cx+v.vw*.80-Math.sin(cx*.008)*1.5;
      quad(moonX,7.3,1.5,1.5,mix3(accent,th.bg,.2),0,K_CIRC,.055);ring(moonX,7.3,1.42,.025,accent,.19);ring(moonX,7.3,1.63,.014,accent,.11);
      const par=.22,shift=cx*(1-par),from=Math.floor(cx*par/2.4)-1,to=Math.ceil((cx*par+v.vw)/2.4)+1;
      for(let i=from;i<=to;i++){
        const x=i*2.4+shift,h=2+hash2(i,iKey)*4.4,c=mix3(th.bg,C3.ink,.67);
        if(['ironworks','sawmill','overclock','meltdown'].includes(LKEY)){
          quad(x,h/2,.83,h/2,c,0,K_RECT,1);quad(x+.3,h+.6,.16,.6,c,0,K_RECT,1);frame(x,h/2,.83,h/2,.028,accent,.10);
          for(let y=.8;y<h-.2;y+=1.1){quad(x,y,.58,.018,accent,0,K_RECT,.13);quad(x,y,.7,.012,accent,0,K_RECT,.12);}
          ring(x,h+.7,.52+hash2(i,2)*.32,.06,accent,.12);quad(x,h+.7,.035,.45,accent,t*.2,K_RECT,.12);
        }else if(['deepsix','wave','bounce','saucer'].includes(LKEY)){
          ring(x,h,.5+hash2(i,4),.022,accent,.12);ring(x+.25,h,.32,.026,accent,.09);
          for(let j=0;j<3;j++)quad(x+.3*j,.7+j*1.7+Math.sin(t*.5+i)*.2,.022,.022,accent,0,K_CIRC,.36);
        }else{
          quad(x,h/2,.95,h/2,c,0,K_RECT,1);quad(x+.4,h+.25,.03,.25,accent,0,K_RECT,.22);
          for(let r=0;r<Math.floor(h);r++)for(let col=0;col<3;col++)if(hash2(i*7+col,r)>.38)quad(x-.55+col*.5,.4+r,.09,.15,accent,0,K_RECT,.1+pulse*.08);
        }
      }
      // Distant ribbons and a beat rail give the music a visible pulse without
      // full-screen flashes or changing the collision silhouettes.
      for(let i=0;i<3;i++){
        const y=6.4+i*.75;quad(cx+v.vw/2,y,v.vw,.009,accent,Math.sin(cx*.002+i)*.06,K_RECT,.085);
      }
      for(let i=Math.floor(cx/2);i<(cx+v.vw)/2+1;i++)quad(i*2,-.40,.19,.035,accent,0,K_RECT,.22+pulse*.34);
    }

    const SPRITES = [
      ['spike', 1, 1, artSpike],
      ['spikeS', 1, 0.5, artSpikeSmall],
      ['saw', 1, 1, artSaw],
      ['coin', 1, 1, artCoin],
      ['cp', 0.7, 0.7, artCheckpoint],
      ['portal_ship', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.ship, GLYPH.ship)],
      ['portal_cube', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.cube, GLYPH.cube)],
      ['portal_ball', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.ball, GLYPH.ball)],
      ['portal_ufo', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.ufo, GLYPH.ufo)],
      ['portal_wave', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.wave, GLYPH.wave)],
      ['portal_gravUp', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.gravUp, GLYPH.grav)],
      ['portal_gravDown', PORTAL_W, PORTAL_H, g => artPortal(g, PORTALC.gravDown, GLYPH.grav)],
      ['portal_fast', SPEED_W, SPEED_H, g => artSpeed(g, PORTALC.fast, 2)],
      ['portal_norm', SPEED_W, SPEED_H, g => artSpeed(g, PORTALC.norm, 1)],
      ['portal_slow', SPEED_W, SPEED_H, g => artSpeed(g, PORTALC.slow, 1, true)]
    ];
    for (const k in PADCOL) {
      SPRITES.push(['pad_' + k, PAD_W, PAD_H, g => artPad(g, PADCOL[k])]);
      SPRITES.push(['chev_' + k, 0.6, 0.5, g => artChevron(g, PADCOL[k])]);
      SPRITES.push(['orb_' + k, 1, 1, g => artOrb(g, PADCOL[k], k)]);
      SPRITES.push(['orbDash_' + k, 1.5, 1.5, g => artOrbDash(g, PADCOL[k])]);
    }
    SLOTS.forEach((S, i) => {
      SPRITES.push(['cube' + i, SZ, SZ, g => artCube(g, SZ, S)]);
      SPRITES.push(['mini' + i, 0.56, 0.56, g => artCube(g, 0.56, S)]);
      SPRITES.push(['ship' + i, SHIP_W, SHIP_H, g => artShip(g, S)]);
      SPRITES.push(['ball' + i, SZ, SZ, g => artBall(g, SZ, S)]);
      SPRITES.push(['ufoBack' + i, UFO_W, UFO_H, g => artUfoBack(g, S)]);
      SPRITES.push(['ufo' + i, UFO_W, UFO_H, g => artUfo(g, S)]);
      SPRITES.push(['wave' + i, 1, 0.8, g => artWave(g, S)]);
    });
    const SPR = {};
    let atlas = null, atlasPPC = 0, atlasVer = 0;

    /* Shelf-packed, tallest first, with a gutter wide enough that the smaller
       mip levels of one sprite never pick up the edge of the next. */
    function bakeAtlas(ppc) {
      const GUT = 10, AW = ppc > 120 ? 2048 : 1024;
      const order = SPRITES.slice().sort((a, b) => b[2] - a[2]);
      const places = new Map();
      let x = GUT, y = GUT, rowH = 0;
      for (const s of order) {
        const pw = Math.ceil(s[1] * ppc), ph = Math.ceil(s[2] * ppc);
        if (x + pw + GUT > AW) { x = GUT; y += rowH + GUT; rowH = 0; }
        places.set(s, [x, y, pw, ph]);
        x += pw + GUT; rowH = Math.max(rowH, ph);
      }
      const AH = y + rowH + GUT;
      const cv = document.createElement('canvas');
      cv.width = AW; cv.height = AH;
      const g = cv.getContext('2d');
      for (const s of order) {
        const pl = places.get(s);
        g.save();
        g.translate(pl[0], pl[1]);
        g.scale(pl[2] / s[1], pl[3] / s[2]);
        s[3](g);
        g.restore();
        SPR[s[0]] = { u0: pl[0] / AW, v0: pl[1] / AH, u1: (pl[0] + pl[2]) / AW, v1: (pl[1] + pl[3]) / AH,
                      w: s[1], h: s[2] };
      }
      atlas = cv; atlasPPC = ppc; atlasVer++;
    }
    /* The density a cell is shown at, rounded to a step so a resize does not
       rebake on every pixel of drag. Capped where the atlas would outgrow what
       a modest GPU is guaranteed to take. */
    function wantPPC(S) {
      const need = (H * S) / VIEW_H;
      return clamp(Math.ceil(need / 20) * 20, 40, 200);
    }

    const VS = [
      '#version 300 es',
      'layout(location=0) in vec2 aCorner;',
      'layout(location=1) in vec4 iRect;',
      'layout(location=2) in vec4 iMisc;',
      'layout(location=3) in vec4 iCol;',
      'layout(location=4) in vec4 iUV;',
      'uniform vec4 uCam;',
      'out vec2 vUV; out vec2 vTex; out vec4 vCol; flat out float vShape; flat out float vExtra;',
      'void main(){',
      '  vUV = aCorner;',
      /* the atlas runs top-down and the world runs bottom-up */
      '  vTex = vec2(mix(iUV.x, iUV.z, aCorner.x), mix(iUV.w, iUV.y, aCorner.y));',
      '  vCol = vec4(iCol.rgb, iMisc.z);',
      '  vShape = iMisc.y; vExtra = iMisc.w;',
      '  vec2 p = (aCorner - 0.5) * 2.0 * iRect.zw;',
      '  float c = cos(iMisc.x), s = sin(iMisc.x);',
      '  vec2 r = vec2(p.x*c - p.y*s, p.x*s + p.y*c);',
      '  vec2 w = iRect.xy + r;',
      '  gl_Position = vec4(w.x*uCam.x + uCam.z, w.y*uCam.y + uCam.w, 0.0, 1.0);',
      '}'
    ].join('\n');

    const FS = [
      '#version 300 es',
      'precision highp float;',
      'in vec2 vUV; in vec2 vTex; in vec4 vCol; flat in float vShape; flat in float vExtra;',
      'uniform sampler2D uTex;',
      'out vec4 o;',
      'void main(){',
      '  if (vShape > 3.5) {',
      '    vec4 t = texture(uTex, vTex) * vCol.a;',
      '    if (t.a <= 0.003) discard;',
      '    o = vec4(t.rgb * vCol.rgb, t.a);',
      '    return;',
      '  }',
      '  float a = 1.0;',
      '  if (vShape > 2.5) {',
      '    float r = length(vUV - vec2(0.5)) * 2.0;',
      '    float d = abs(r - (1.0 - vExtra * 0.5)) - vExtra * 0.5;',
      '    a = 1.0 - smoothstep(-fwidth(d), fwidth(d), d);',
      '  } else if (vShape > 1.5) {',
      /* a triangle with its apex at the TOP of the quad: the half-width
         allowed grows as you go down, which is (1.0 - v), not v */
      '    float d = abs(vUV.x - 0.5) * 2.0 - (1.0 - vUV.y);',
      '    a = 1.0 - smoothstep(-fwidth(d), fwidth(d), d);',
      '  } else if (vShape > 0.5) {',
      '    float d = length(vUV - vec2(0.5)) - 0.5;',
      '    a = 1.0 - smoothstep(-fwidth(d), fwidth(d), d);',
      '  }',
      '  a *= vCol.a;',
      '  if (a <= 0.003) discard;',
      '  o = vec4(vCol.rgb * a, a);',      // premultiplied, so edges do not halo
      '}'
    ].join('\n');

    /* the GL backend, or null if this machine has no WebGL2 */
    function makeGL() {
      const cv = document.createElement('canvas');
      let gl = null;
      try { gl = cv.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true }); } catch (e) {}
      if (!gl) return null;

      function sh(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn('gdash shader', gl.getShaderInfoLog(s));
          gl.deleteShader(s); return null;
        }
        return s;
      }
      const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return null;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('gdash link', gl.getProgramInfoLog(prog));
        return null;
      }
      gl.deleteShader(vs); gl.deleteShader(fs);
      const uCam = gl.getUniformLocation(prog, 'uCam');
      const uTex = gl.getUniformLocation(prog, 'uTex');

      /* six corners, drawn as two triangles — no index buffer, so there is no
         index-type mismatch to get wrong */
      const corner = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
      const vao = gl.createVertexArray();
      const cbuf = gl.createBuffer(), ibuf = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
      gl.bufferData(gl.ARRAY_BUFFER, corner, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
      gl.bufferData(gl.ARRAY_BUFFER, MAXI * STRIDE * 4, gl.DYNAMIC_DRAW);
      const S4 = STRIDE * 4;
      for (let i = 0; i < 4; i++) {
        gl.enableVertexAttribArray(1 + i);
        gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, S4, i * 16);
        gl.vertexAttribDivisor(1 + i, 1);
      }
      gl.bindVertexArray(null);

      const tex = gl.createTexture();
      let texVer = -1;

      return {
        canvas: cv,
        resize(pw, ph) {
          if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
        },
        draw(n, camx, camy, vw, vh) {
          gl.viewport(0, 0, cv.width, cv.height);
          gl.disable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          if (!n) return;
          if (atlas && texVer !== atlasVer) {
            /* premultiplied on the way in, so the mips average colour and
               coverage together and an outline never grows a pale fringe */
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 3);
            texVer = atlasVer;
          }
          gl.useProgram(prog);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform1i(uTex, 0);
          /* camx/camy are the BOTTOM-LEFT of the view, not its centre, so the
             offset carries the extra -1 that puts that corner at clip -1,-1 */
          gl.uniform4f(uCam, 2 / vw, 2 / vh, -camx * 2 / vw - 1, -camy * 2 / vh - 1);
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, idata, 0, n * STRIDE);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
          gl.bindVertexArray(null);
        },
        dispose() {
          try {
            gl.deleteBuffer(cbuf); gl.deleteBuffer(ibuf); gl.deleteTexture(tex);
            gl.deleteVertexArray(vao); gl.deleteProgram(prog);
            const lo = gl.getExtension('WEBGL_lose_context');
            if (lo) lo.loseContext();
          } catch (e) {}
        }
      };
    }

    /* the same draw list, painted with canvas 2D */
    function makeC2D() {
      const cv = document.createElement('canvas');
      const g = cv.getContext('2d');
      return {
        canvas: cv,
        resize(pw, ph) { if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } },
        draw(n, camx, camy, vw, vh) {
          const sx = cv.width / vw, sy = cv.height / vh;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, cv.width, cv.height);
          g.setTransform(sx, 0, 0, -sy, -camx * sx, cv.height + camy * sy);
          for (let i = 0; i < n; i++) {
            const o = i * STRIDE;
            const cx = idata[o], cy = idata[o + 1], hw = idata[o + 2], hh = idata[o + 3];
            const rot = idata[o + 4], shape = idata[o + 5], al = idata[o + 6];
            g.globalAlpha = al;
            g.save();
            g.translate(cx, cy); if (rot) g.rotate(rot);
            if (shape > 3.5) {
              if (atlas) {
                const AW = atlas.width, AH = atlas.height;
                g.scale(hw < 0 ? -1 : 1, hh < 0 ? 1 : -1);
                const aw = Math.abs(hw), ah = Math.abs(hh);
                g.drawImage(atlas, idata[o + 12] * AW, idata[o + 13] * AH,
                            (idata[o + 14] - idata[o + 12]) * AW, (idata[o + 15] - idata[o + 13]) * AH,
                            -aw, -ah, aw * 2, ah * 2);
              }
              g.restore();
              continue;
            }
            const fill = 'rgb(' + (idata[o + 8] * 255 | 0) + ',' + (idata[o + 9] * 255 | 0) + ',' + (idata[o + 10] * 255 | 0) + ')';
            g.beginPath();
            if (shape > 2.5) {
              const th = idata[o + 7] * hw;
              g.arc(0, 0, Math.max(0.001, hw - th / 2), 0, TAU);
              g.lineWidth = th; g.strokeStyle = fill; g.stroke();
            } else {
              if (shape > 1.5) { g.moveTo(0, hh); g.lineTo(hw, -hh); g.lineTo(-hw, -hh); g.closePath(); }
              else if (shape > 0.5) { g.ellipse(0, 0, Math.abs(hw), Math.abs(hh), 0, 0, TAU); }
              else { g.rect(-hw, -hh, hw * 2, hh * 2); }
              g.fillStyle = fill; g.fill();
            }
            g.restore();
          }
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalAlpha = 1;
        },
        dispose() {}
      };
    }

    let R = makeGL();
    const usingGL = !!R;
    if (!R) R = makeC2D();


    /* ------------------------------------------------------- the draw list */
    /* The view is shorter than the world is tall. Thirteen cells of height put
       every obstacle in the bottom third of the screen with a great deal of
       empty sky over it; eleven and a bit still clears the tallest corridor's
       roof and makes everything you actually look at bigger. */
    const VIEW_H = 11.2, VIEW_Y = -1.3;
    function viewSize() {
      return { vw: VIEW_H * (W / H), vh: VIEW_H };
    }

    function solidAt(c, y) {
      const col = solidsIn(c);
      return !!col && col.indexOf(y) >= 0;
    }

    /* Any player's icon, in their seat's colours, in whatever they are riding.
       `flip` is -1 upside down; `alpha` is under one for somebody else's
       ghost, so your own icon is always the solid one. */
    function drawIcon(slot, mode, px, py, rot, flip, alpha) {
      if (mode === 'ship') {
        /* the hull sits a little behind the hitbox, so the nose is roughly
           where death actually is, and the cube is sunk into its top */
        const m = turn(px, py, -0.21, 0.27 * flip, rot);
        spr('mini' + slot, m.x, m.y, 0.28, 0.28 * flip, rot, alpha);
        const b = turn(px, py, -0.25, 0.03 * flip, rot);
        spr('ship' + slot, b.x, b.y, SHIP_W / 2, (SHIP_H / 2) * flip, rot, alpha);
      } else if (mode === 'ufo') {
        const U = 1.12;
        const b = turn(px, py, 0, 0.1 * flip, rot);
        spr('ufoBack' + slot, b.x, b.y, U * UFO_W / 2, U * (UFO_H / 2) * flip, rot, alpha);
        const m = turn(px, py, 0, 0.26 * flip, rot);
        spr('mini' + slot, m.x, m.y, 0.22, 0.22 * flip, rot, alpha);
        spr('ufo' + slot, b.x, b.y, U * UFO_W / 2, U * (UFO_H / 2) * flip, rot, alpha);
      } else if (mode === 'ball') {
        spr('ball' + slot, px, py, HW, HW * flip, rot, alpha);
      } else if (mode === 'wave') {
        spr('wave' + slot, px, py, 0.46, 0.37 * flip, rot, alpha);
      } else {
        spr('cube' + slot, px, py, HW, HW * flip, rot, alpha);
      }
    }

    /* `cx` is passed rather than read from camX: the level select views a
       level from a scrolling preview camera, and a spectator views it from
       somebody else's. `sv` is whose orbs and coins are spent — yours, or the
       ghost you are watching. `me` says whether to draw your own icon. */
    function buildScene(t, cx, sv, me) {
      icount = 0;
      sv = sv || P;
      const v = viewSize();
      const th = themeAt(LKEY, cx + v.vw * 0.35);
      const LINE = C3.white;

      /* ---- sky ---- */
      quad(cx + v.vw / 2, VIEW_Y + v.vh / 2, v.vw / 2 + 0.2, v.vh / 2 + 0.2, th.bg, 0, K_RECT, 1);

      /* Squares far behind, drifting at under a fifth of the pace. They are what
         tells you how fast you are going, and they sit a shade or two off the
         sky so they never compete with a spike for your eye. */
      {
        const par = 0.18, pitch = 5.6;
        const shift = cx * (1 - par);
        const i0 = Math.floor((cx * par) / pitch) - 2, i1 = Math.ceil((cx * par + v.vw) / pitch) + 1;
        const darker = mix3(th.bg, C3.ink, 0.12), edge = mix3(th.bg, C3.white, 0.08);
        for (let i = i0; i <= i1; i++) {
          for (let r = 0; r < 3; r++) {
            const hsh = hash2(i, r);
            if (hsh < 0.25) continue;
            const half = hsh > 0.6 ? 2.3 : 1.55;
            const wx = i * pitch + (r % 2) * pitch * 0.5 + shift + (hash2(r + 7, i) - 0.5) * 1.4;
            const wy = 1.4 + r * 4.4 + (hsh - 0.5) * 0.9;
            quad(wx, wy, half, half, darker, 0, K_RECT, 1);
            frame(wx, wy, half, half, 0.06, edge, 1);
            if (hsh > 0.84) frame(wx, wy, half * 0.5, half * 0.5, 0.06, edge, 1);
          }
        }
      }

      drawStageScenery(cx, v, th, sv, t);

      /* ---- the floor ---- */
      const c0 = Math.floor(cx) - 2, c1 = Math.ceil(cx + v.vw) + 2;
      const grDeep = mix3(th.gr, C3.ink, 0.22), grHi = mix3(th.gr, C3.white, 0.1);
      let runStart = null;
      for (let c = c0; c <= c1 + 1; c++) {
        const on = c <= c1 && solidAt(c, -1);
        if (on && runStart === null) runStart = c;
        if (!on && runStart !== null) {
          const a = runStart, b = c;             // floor over [a, b)
          const mid = (a + b) / 2, hw = (b - a) / 2;
          quad(mid, (VIEW_Y - 0.4) / 2, hw, (0.4 - VIEW_Y) / 2, th.gr, 0, K_RECT, 1);
          quad(mid, -1.225, hw, 0.475, grDeep, 0, K_RECT, 1);
          quad(mid, -0.13, hw, 0.05, grHi, 0, K_RECT, 1);
          /* the top edge */
          quad(mid, -0.04, hw, 0.04, LINE, 0, K_RECT, 1);
          /* the cliff face at either end of a pit */
          if (a > c0) quad(a + 0.035, (VIEW_Y - 0.4) / 2, 0.035, (0.4 - VIEW_Y) / 2, LINE, 0, K_RECT, 1);
          if (b <= c1) quad(b - 0.035, (VIEW_Y - 0.4) / 2, 0.035, (0.4 - VIEW_Y) / 2, LINE, 0, K_RECT, 1);
          runStart = null;
        }
      }
      /* tile seams, every three cells, riding with the world */
      for (let c = Math.floor(c0 / 3) * 3; c <= c1; c += 3) {
        if (solidAt(c, -1) && solidAt(c - 1, -1)) quad(c, (VIEW_Y - 0.08) / 2, 0.03, (-0.08 - VIEW_Y) / 2, th.grLine, 0, K_RECT, 1);
      }

      /* ---- blocks ----
         Filled first, all of them, then outlined only on the sides that face
         open air. That is what makes a wall of blocks read as one shape rather
         than as a grid of separate boxes. */
      const innerLine = mix3(th.block, C3.white, 0.14);
      for (let c = c0; c <= c1; c++) {
        const col = solidsIn(c); if (!col) continue;
        for (const yc of col) {
          if (yc === -1) continue;
          quad(c + 0.5, yc + 0.5, 0.5, 0.5, th.block, 0, K_RECT, 1);
          frame(c + 0.5, yc + 0.5, 0.3, 0.3, 0.03, innerLine, 1);
          quad(c + .5, yc + .87, .37, .045, mix3(th.block, C3.white, .20), 0, K_RECT, 1);
          quad(c + .14, yc + .52, .04, .31, mix3(th.block, C3.white, .08), 0, K_RECT, 1);
          if ((c + yc) % 3 === 0) quad(c + .5, yc + .5, .065, .065, hex3(LDEF.accent), Math.PI/4, K_RECT, .55);
        }
      }
      const E = 0.075, e2 = E / 2;
      for (let c = c0; c <= c1; c++) {
        const col = solidsIn(c); if (!col) continue;
        for (const yc of col) {
          if (yc === -1) continue;
          const up = solidAt(c, yc + 1), dn = solidAt(c, yc - 1);
          const lf = solidAt(c - 1, yc), rt = solidAt(c + 1, yc);
          if (!up) quad(c + 0.5, yc + 1 - e2, 0.5, e2, LINE, 0, K_RECT, 1);
          if (!dn) quad(c + 0.5, yc + e2, 0.5, e2, LINE, 0, K_RECT, 1);
          if (!lf) quad(c + e2, yc + 0.5, e2, 0.5, LINE, 0, K_RECT, 1);
          if (!rt) quad(c + 1 - e2, yc + 0.5, e2, 0.5, LINE, 0, K_RECT, 1);
          /* an inside corner still needs its notch filled */
          if (up && lf && !solidAt(c - 1, yc + 1)) quad(c + e2, yc + 1 - e2, e2, e2, LINE, 0, K_RECT, 1);
          if (up && rt && !solidAt(c + 1, yc + 1)) quad(c + 1 - e2, yc + 1 - e2, e2, e2, LINE, 0, K_RECT, 1);
          if (dn && lf && !solidAt(c - 1, yc - 1)) quad(c + e2, yc + e2, e2, e2, LINE, 0, K_RECT, 1);
          if (dn && rt && !solidAt(c + 1, yc - 1)) quad(c + 1 - e2, yc + e2, e2, e2, LINE, 0, K_RECT, 1);
        }
      }

      /* ---- portals, behind everything that moves ----
         A door stands where you meet it: on the floor unless the level says
         otherwise. The oval is centred on the column; the fins hang behind. */
      for (let i = 0; i < portalList.length; i++) {
        const q = portalList[i];
        if (q.x < c0 - 2 || q.x > c1 + 2) continue;
        const name = 'portal_' + q.look, s = SPR[name];
        if (!s) continue;
        const tall = s.h > 3;
        const py = q.vy !== undefined ? q.vy : tall ? PORTAL_H / 2 + 0.05 : SPEED_H / 2 + 0.05;
        const pc = C3['portal_' + q.look] || C3.white;
        ring(q.x+.43,py,tall?1.45:.72,.025,pc,.22);
        for(let j=0;j<3;j++){const a=t*1.1+j*TAU/3;quad(q.x+.43+Math.cos(a)*.62,py+Math.sin(a)*(tall?1.4:.6),.045,.045,pc,a,K_RECT,.8);}
        spr(name, q.x + 0.5 - (tall ? 0.07 : 0), py);
      }

      /* ---- spikes ---- `y` is the cell the spike stands in whichever way
         up it is, so a hanging one is the same sprite turned over */
      for (const s of spikeList) {
        if (s.x < c0 - 1 || s.x > c1 + 1) continue;
        if (s.small) spr('spikeS', s.x + 0.5, s.y + (s.down ? 0.75 : 0.25), 0.5, 0.25, s.down ? Math.PI : 0);
        else spr('spike', s.x + 0.5, s.y + 0.5, 0.5, 0.5, s.down ? Math.PI : 0);
      }
      /* ---- saws, always turning, and some of them travelling ----
         A sliding saw is drawn from the simulation's clock rather than the
         wall's, because that is the clock its hitbox is on. On the select
         screen there is no run to read a clock from, so the preview's scroll
         stands in for one. */
      for (const s of sawList) {
        const sp = Math.abs(s.dx || 0);
        if (s.x + sp + s.r < c0 - 1 || s.x - sp - s.r > c1 + 1) continue;
        const q = sawAt(s, sv.x);
        /* the rail a travelling saw runs along, so its beat is readable
           before it arrives rather than only after it has hit you */
        if (s.dx || s.dy) {
          const ax = Math.abs(s.dx), ay = Math.abs(s.dy);
          quad(s.x, s.y, ax + 0.06, ay + 0.06, mix3(th.bg, C3.ink, 0.45), 0, K_RECT, 1);
        }
        spr('saw', q.x, q.y, s.r, s.r, -t * 7 - s.x);
      }

      /* ---- pads: a dome that squashes when it fires, and arrows that
         climb off it on a loop so it announces itself from a distance ---- */
      for (let i = 0; i < padList.length; i++) {
        const d = padList[i];
        if (d.x < c0 - 1 || d.x > c1 + 1) continue;
        const since = padHitAt[i] === undefined || sv !== P ? 9 : P.t - padHitAt[i];
        const k = since < 0.28 ? since / 0.28 : 1;
        const squash = since < 0.28 ? Math.sin(k * Math.PI) * (1 - k * 0.4) : 0;
        const hh = (PAD_H / 2) * (1 - 0.45 * squash), hw = (PAD_W / 2) * (1 + 0.12 * squash);
        const dir = d.down ? -1 : 1, base = d.down ? d.y + 1 : d.y;
        for (let a = 0; a < 2; a++) {
          const ph = (t * 1.2 + a * 0.5) % 1;
          /* pop in, climb, shrink away — by scale rather than by fading, so
             the arrow stays the pad's own solid colour instead of a muddy
             half-tone of it */
          const sc = ph < 0.15 ? ph / 0.15 : ph > 0.7 ? 1 - (ph - 0.7) / 0.3 : 1;
          spr('chev_' + d.kind, d.x + 0.5, base + dir * (0.7 + ph * 0.9), 0.3 * sc, 0.25 * sc * dir);
        }
        spr('pad_' + d.kind, d.x + 0.5, base + dir * hh, hw, hh * dir);
      }

      /* ---- orbs ---- */
      for (let i = 0; i < orbList.length; i++) {
        const o = orbList[i];
        if (o.x < c0 - 1 || o.x > c1 + 1) continue;
        const used = !!sv.orbUsed[i];
        const since = orbHitAt[i] === undefined || sv !== P ? 9 : P.t - orbHitAt[i];
        const kick = since < 0.25 ? (1 - since / 0.25) : 0;
        const s = 1 + 0.045 * Math.sin(t * 5 + o.x) + 0.3 * kick * kick;
        if (!used) spr('orbDash_' + o.kind, o.x + 0.5, o.y + 0.5, 0.75 * s, 0.75 * s, -t * 1.6);
        spr('orb_' + o.kind, o.x + 0.5, o.y + 0.5, 0.5 * s, 0.5 * s, 0, used ? 0.4 : 1);
      }

      /* ---- coins: turning on the spot, and lifting away when taken ---- */
      for (let i = 0; i < coinList.length; i++) {
        const c = coinList[i];
        if (c.x < c0 - 1 || c.x > c1 + 1) continue;
        let y = c.y + 0.5 + 0.08 * Math.sin(t * 2.4 + i), al = 1, spin = t * 2.6 + i;
        if (sv.coinsGot[i]) {
          const since = coinGotAt[i] === undefined || sv !== P ? 9 : P.t - coinGotAt[i];
          if (since > 0.5) continue;
          const k = since / 0.5;
          y += k * 1.4; al = 1 - k * k; spin = t * 14;
        }
        spr('coin', c.x + 0.5, y, 0.5 * Math.max(0.1, Math.abs(Math.cos(spin))), 0.5, 0, al);
      }

      /* ---- other players ----
         Everyone else is a ghost, drawn a little see-through so your own icon
         is always the solid one — except the player you are watching, who is
         drawn solid and last, on top of anybody sharing their spot. Before
         the go, the whole field is shown waiting on the start line. */
      if (ONLINE) {
        const order = ROSTER.filter(p => p.id !== ME_ID && p.id !== specId);
        if (specId && phase === 'out') order.push(ROSTER.find(p => p.id === specId) || ROSTER[0]);
        for (const p of order) {
          if (!p || p.id === ME_ID) continue;
          if (phase === 'count') {
            drawIcon(slotOf(p.id), 'cube', 1, HW, 0, 1, 0.55);
            continue;
          }
          const g = ghostOf(p.id);
          if (!g || g.pkt.d) continue;
          const b = RACE.board[p.id];
          if (b && b.done && !g.pkt.w) continue;
          if (g.x < c0 - 2 || g.x > c1 + 2) continue;
          const sim = g.sim, flip = sim.grav < 0 ? -1 : 1;
          const watching = phase === 'out' && p.id === specId;
          drawIcon(slotOf(p.id), sim.mode, g.x, g.y + sizeOf(sim) / 2, g.rot, flip, watching ? 1 : 0.55);
        }
      }

      /* ---- your exhaust, or your wave's line ---- */
      if (me && !P.dead && trail.length && (P.mode === 'ship' || P.mode === 'wave')) {
        const flip = P.grav < 0 ? -1 : 1, S = SLOTS[MY_SLOT];
        const wave = P.mode === 'wave';
        const tail = wave ? { x: view.x, y: view.y + WAVE_SZ / 2 }
                          : turn(view.x, view.y + SZ / 2, -0.97, -0.16 * flip, view.rot);
        const pts = trail.concat([{ x: tail.x, y: tail.y }]);
        for (let k = 1; k < pts.length; k++) {
          const a = pts[k - 1], b = pts[k];
          const f = k / (pts.length - 1);
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
          if (len < 1e-4) continue;
          const wdt = wave ? 0.04 + 0.1 * f : 0.02 + 0.13 * f;
          /* opaque, and blended into the sky by colour instead of by alpha, so
             the joins between segments do not show up as darker knots */
          const hot = wave ? mix3(S.sec3, C3.white, f * f)
                    : f > 0.7 ? mix3(S.pri3, C3.white, (f - 0.7) / 0.3) : mix3(S.priLo3, S.pri3, f / 0.7);
          quad((a.x + b.x) / 2, (a.y + b.y) / 2, len / 2 + wdt * 0.5, wdt,
               mix3(th.bg, hot, 0.25 + 0.75 * f), Math.atan2(dy, dx), K_RECT, 1);
          if (wave) quad(b.x, b.y, wdt, wdt, mix3(th.bg, hot, 0.25 + 0.75 * f), Math.PI / 4, K_RECT, 1);
        }
      }

      /* ---- you, drawn from the interpolated view, never the sim ---- */
      if (me && !P.dead) {
        drawIcon(MY_SLOT, P.mode, view.x, view.y + sizeOf(P) / 2, view.rot, P.grav < 0 ? -1 : 1, 1);
      }

      /* ---- practice checkpoints ---- */
      if (checkpoint && me) {
        const s = 1 + 0.25 * cpFlash;
        spr('cp', checkpoint.x, checkpoint.y + SZ / 2, 0.35 * s, 0.35 * s, 0);
      }

      /* ---- loose effects, on top of everything ---- */
      for (const e of fxs) {
        if (e.t < 0) continue;
        const k = e.t / e.life;
        if (e.k === 'ring') {
          const ease = 1 - (1 - k) * (1 - k) * (1 - k);
          const r = e.r0 + (e.r1 - e.r0) * ease;
          ring(e.x, e.y, r, Math.max(0.02, e.th * (1 - k)), e.col, 1);
        } else {
          const s = e.s * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
          quad(e.x, e.y, s, s, e.col, e.rot, K_RECT, 1);
        }
      }

      return v;
    }

    /* ------------------------------------------------------------- update */
    function heldJump() {
      /* a click anywhere on the stage counts as holding the button; draining
         the queue keeps a tap from also firing on the next frame */
      if (Input.takeClick()) clickHold = 0.08;
      return Input.down('Space') || Input.down('KeyW') || Input.down('ArrowUp') ||
             Input.pointer.down || clickHold > 0;
    }

    /* Fixed-step, because a rhythm game that runs its physics on the frame
       clock is a different game on a 144Hz monitor than on a 60Hz one. */
    const FIXED = 1 / 240;
    let clickHold = 0;

    function advance(dt) {
      acc += Math.min(dt, 0.1);
      const hold = heldJump();
      clickHold = Math.max(0, clickHold - dt);
      while (acc >= FIXED) {
        acc -= FIXED;
        snapPrev();
        const wasGround = P.onGround, wasMode = P.mode, vyWas = P.vy;
        P.hitPad = -1; P.gotCoin = -1; P.tookPortal = -1;
        stepSim(P, FIXED, hold);
        if (P.dead) { die(); break; }

        if (P.jumped === 1 || P.jumped === 3) Sound.jump();
        if (P.jumped === 2 && P.orbHit >= 0) {
          Sound.jump();
          orbHitAt[P.orbHit] = P.t;
          const o = orbList[P.orbHit];
          burst(o.x + 0.5, o.y + 0.5, C3.pad[o.kind], 0.5, 1.5, 0.16, 0.32, 0);
        }
        if (P.hitPad >= 0 && P.hitPad !== lastPad) {
          lastPad = P.hitPad; Sound.pickup();
          padHitAt[P.hitPad] = P.t;
          const d = padList[P.hitPad];
          burst(d.x + 0.5, d.down ? d.y + 0.8 : d.y + 0.2, C3.pad[d.kind], 0.3, 1.3, 0.14, 0.3, 0);
        }
        if (P.hitPad < 0) lastPad = -1;
        if (P.gotCoin >= 0) {
          Sound.coin();
          coinGotAt[P.gotCoin] = P.t;
          const c = coinList[P.gotCoin];
          burst(c.x + 0.5, c.y + 0.5, C3.coin, 0.4, 1.4, 0.14, 0.34, 0);
        }
        if (P.tookPortal >= 0 && P.tookPortal !== lastPortal) {
          lastPortal = P.tookPortal; Sound.zap();
          const q = portalList[P.tookPortal];
          burst(P.x, P.y + sizeOf(P) / 2, C3['portal_' + q.look] || C3.white, 0.4, 1.7, 0.16, 0.34, 0);
        }
        /* three flecks of dust on a real landing — not on every substep the
           icon happens to be touching the ground */
        if (!wasGround && P.onGround && (P.mode === 'cube' || P.mode === 'ball') && Math.abs(vyWas) > 7) {
          dust(P.x - 0.2, P.grav > 0 ? P.y : P.y + SZ, P.grav);
        }
        if (P.mode !== wasMode) trail.length = 0;
        if (P.mode === 'ship' || P.mode === 'wave') {
          const wave = P.mode === 'wave';
          trailClock += FIXED;
          if (trailClock >= (wave ? 1 / 60 : 1 / 50)) {
            trailClock = 0;
            const tl = wave ? { x: P.x, y: P.y + WAVE_SZ / 2 }
                            : turn(P.x, P.y + SZ / 2, -0.97, -0.16 * (P.grav < 0 ? -1 : 1), P.rot);
            trail.push({ x: tl.x, y: tl.y });
            if (trail.length > (wave ? 34 : 12)) trail.shift();
          }
        }
        if (P.won) break;
      }
      if (ONLINE) postKeyframe(false);
    }

    /* ---------------------------------------------------- the level select */
    /* `select` runs the highlighted level behind its own cards as a live
       preview, which is the whole reason this is a screen inside the game
       rather than a row of pills on the shell's options panel. Online, the same
       screen is the lobby: the host's cursor is everybody's cursor. */
    let phase = ONLINE ? 'lobby' : 'select';
    let winPending = false;
    const PREVIEW_FROM = 20;      // past the opening runway, where there is something to see
    const PREVIEW_SIM = newSim();
    /* the select opens on the level you last played */
    let pick = Math.max(0, ORDER.indexOf(Store.opt('gdash', 'lastLevel') || ''));
    let pickView = pick, selT = 0, previewX = PREVIEW_FROM;
    let cardBoxes = [];
    let goFlash = 0;
    let camFrom = 0, camBlend = 0;

    /* ---- the select screen as the front page ----
       Opened from the hub, Geometry Dash goes straight to its level select,
       which is its main menu: the logo pulsing with the kick of whatever
       track is playing behind the cards, the cube hopping beside it in time,
       page dots under the carousel, your icon, a big Play, practice, and the
       ways out to the hub and to a party. */
    const FK = FrontKit(api, { online: ONLINE });
    let selShownAt = -1, hotKey = '', uiBoxes = [];
    const overBox = b => { const p = Input.pointer; return p.inside && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; };
    /* 1 on the kick of the track behind the select, falling away before the
       next; read off the same clock the soundtrack is scheduled from */
    function beatK() {
      const tr = TRACKS[ORDER[pick]], b = selT * tr.bpm / 60;
      return Math.exp(-(b - Math.floor(b)) * 5);
    }
    function uiClick(k) {
      if (k === 'back') { Sound.blip(); api.hub(); return; }
      if (k === 'party') { Sound.blip(); api.openParty(); return; }
      if (k === 'play') { go(); return; }
      if (k === 'practice') { PRACTICE = !PRACTICE; Sound.grab(); return; }
      if (k.slice(0, 4) === 'icon') {
        const i = +k.slice(4);
        if (i !== MY_SLOT) { MY_SLOT = i; Store.opt('gdash', 'icon', String(i)); Sound.blip(); }
        return;
      }
      if (k.slice(0, 3) === 'dot') selectLevel(+k.slice(3));
    }
    /* the logo in the genre's gold, on the beat, with the cube hopping beside
       it - a beat a hop (every other beat on the fast tracks), landing square */
    function drawLogo(ctx, cx, y, text, beat, a) {
      if (a <= 0) return;
      ctx.save();
      ctx.font = '900 44px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      try { ctx.letterSpacing = '1.5px'; } catch (e) {}
      const tw = ctx.measureText(text).width, s = (.55 + .45 * FK.bo(a)) * (1 + beat * .03);
      ctx.translate(cx + 26, y); ctx.scale(s, s);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.globalAlpha *= Math.min(1, a * 2.5);
      ctx.lineWidth = 11; ctx.strokeStyle = 'rgba(11,10,22,.7)'; ctx.strokeText(text, 0, 5);
      ctx.strokeStyle = INK; ctx.strokeText(text, 0, 0);
      const g = ctx.createLinearGradient(0, -20, 0, 20);
      g.addColorStop(0, '#fff6a0'); g.addColorStop(.45, '#ffd23a'); g.addColorStop(1, '#ff8f1f');
      ctx.fillStyle = g; ctx.fillText(text, 0, 0);
      ctx.restore();
      const tr = TRACKS[ORDER[pick]], per = tr.bpm > 150 ? 2 : 1, b = selT * tr.bpm / 60 / per, fr = b - Math.floor(b);
      const hop = Math.sin(fr * Math.PI) * 18, rot = (Math.floor(b) + 1 - (1 - fr) * (1 - fr)) * Math.PI / 2;
      ctx.save(); ctx.globalAlpha *= Math.min(1, a * 2.5);
      drawSprite(ctx, 'cube' + MY_SLOT, cx + 26 - tw * s / 2 - 54, y - 22 - hop, 40, 40, rot);
      ctx.restore();
    }
    /* top left, the arrow every menu in the genre has in its corner; top
       right, the party */
    function drawCorners(ctx, P2, a) {
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha *= a;
      const bb = { x: 16, y: 16, w: 48, h: 48, k: 'back' };
      uiBoxes.push(bb);
      const hb = FK.glide('gdback', overBox(bb) && !api.covered ? 1 : 0, 16), sb = 1 + hb * .08;
      ctx.save(); ctx.translate(40, 40); ctx.scale(sb, sb);
      ctx.beginPath(); ctx.arc(0, 3, 23, 0, TAU); ctx.fillStyle = 'rgba(11,10,22,.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 23, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      const g = ctx.createLinearGradient(0, -19, 0, 19);
      g.addColorStop(0, '#8dff6a'); g.addColorStop(1, '#1faa3c');
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(-6, 0); ctx.lineTo(4, 9);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
      const label = P2.inRoom ? 'PARTY · ' + P2.size : 'RACE FRIENDS';
      ctx.font = '800 13px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      const pw = Math.ceil(ctx.measureText(label).width) + 66, pb = { x: W - 18 - pw, y: 20, w: pw, h: 40, k: 'party' };
      uiBoxes.push(pb);
      const hp = FK.glide('gdparty', overBox(pb) && !api.covered ? 1 : 0, 16);
      ctx.save(); ctx.translate(0, -hp * 2);
      ctx.fillStyle = 'rgba(11,10,22,.55)'; rr(ctx, pb.x + 3, pb.y + 4, pw, 40, 20); ctx.fill();
      ctx.fillStyle = INK; rr(ctx, pb.x, pb.y, pw, 40, 20); ctx.fill();
      ctx.strokeStyle = P2.inRoom ? '#ffd43b' : 'rgba(255,255,255,' + (.25 + hp * .45).toFixed(3) + ')';
      ctx.lineWidth = 2; rr(ctx, pb.x, pb.y, pw, 40, 20); ctx.stroke();
      drawSprite(ctx, 'cube1', pb.x + 12, pb.y + 11, 18, 18, 0);
      drawSprite(ctx, 'cube2', pb.x + 26, pb.y + 11, 18, 18, 0);
      panelText(ctx, pb.x + 52, pb.y + 20.5, label, 13, '#ffffff', 'left', 800);
      ctx.restore();
      ctx.restore();
    }
    /* where the picked level sits among all of them; a finished one is green */
    function drawDots(ctx, y, beat, a) {
      const n = ORDER.length, sp = 18, x0 = W / 2 - (n - 1) * sp / 2;
      ctx.save(); ctx.globalAlpha *= a;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * sp, on = i === pick, b = { x: x - 8, y: y - 10, w: 16, h: 20, k: 'dot' + i };
        uiBoxes.push(b);
        const hv = FK.glide('gddot' + i, overBox(b) && !api.covered ? 1 : 0, 16);
        const r = on ? 5.5 + beat * 1.3 : 3.4 + hv * 1.2;
        ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, TAU); ctx.fillStyle = INK; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = on ? '#ffffff' : savedBest(ORDER[i]) >= 100 ? '#86efac' : 'rgba(255,255,255,' + (.35 + hv * .35).toFixed(3) + ')';
        ctx.fill();
      }
      ctx.restore();
    }
    /* your icon, Play and practice, in one row under the dots */
    function drawControls(ctx, y, beat, a, pmode) {
      const ia = FK.eo(clamp(a * 1.4, 0, 1));
      ctx.save(); ctx.globalAlpha *= ia; ctx.translate(0, (1 - ia) * 20);
      const ix0 = W / 2 - 236;
      inkText(ctx, ix0 - 14, y + 1, 'ICON', 11, 'right', 'rgba(228,225,240,.72)');
      for (let i = 0; i < SLOTS.length; i++) {
        const x = ix0 + i * 42, b = { x: x - 4, y: y - 22, w: 40, h: 42, k: 'icon' + i };
        uiBoxes.push(b);
        const on = i === MY_SLOT, hv = FK.glide('gdic' + i, overBox(b) && !api.covered ? 1 : 0, 16);
        const lift = FK.glide('gdicl' + i, on ? 5 : 0, 14) + hv * 3;
        if (on) {
          ctx.fillStyle = INK; rr(ctx, x - 5, y - 21 - lift, 42, 42, 10); ctx.fill();
          ctx.strokeStyle = SLOTS[i].pri; ctx.lineWidth = 2.5; rr(ctx, x - 5, y - 21 - lift, 42, 42, 10); ctx.stroke();
        }
        drawSprite(ctx, 'cube' + i, x, y - 16 - lift, 32, 32, on ? Math.sin(FK.t * 3) * .07 : 0);
      }
      ctx.restore();

      /* Play: the big green button, on the beat */
      const guest = pmode === 'guest', pb = { x: W / 2 - 40, y: y - 40, w: 80, h: 80, k: 'play' };
      if (!guest) uiBoxes.push(pb);
      const hp = FK.glide('gdplay', !guest && overBox(pb) && !api.covered ? 1 : 0, 16);
      const s = FK.bo(clamp(a, 0, 1)) * (1 + (guest ? 0 : beat * .07) + hp * .08);
      ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s);
      ctx.beginPath(); ctx.arc(0, 5, 37, 0, TAU); ctx.fillStyle = 'rgba(11,10,22,.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 37, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      const g = ctx.createLinearGradient(0, -32, 0, 32);
      g.addColorStop(0, guest ? '#a4a9bd' : '#9bff72'); g.addColorStop(1, guest ? '#5d6275' : '#16a53a');
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -15, 21, 9, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, -16); ctx.lineTo(17, 0); ctx.lineTo(-9, 16); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
      if (pmode === 'host' || guest)
        inkText(ctx, W / 2, y + 54, guest ? 'WAITING FOR THE HOST' : 'START THE RACE', 12, 'center', guest ? '#e4e1f0' : '#ffd43b');

      /* practice, as a switch */
      const qa = FK.eo(clamp(a * 1.4 - .2, 0, 1));
      ctx.save(); ctx.globalAlpha *= qa; ctx.translate(0, (1 - qa) * 20);
      const qx = W / 2 + 62, qw = 184, qb = { x: qx, y: y - 19, w: qw, h: 38, k: 'practice' };
      uiBoxes.push(qb);
      const hq = FK.glide('gdprac', overBox(qb) && !api.covered ? 1 : 0, 16);
      ctx.fillStyle = 'rgba(11,10,22,.55)'; rr(ctx, qx + 3, y - 15, qw, 38, 19); ctx.fill();
      ctx.fillStyle = INK; rr(ctx, qx, y - 19, qw, 38, 19); ctx.fill();
      ctx.strokeStyle = PRACTICE ? '#4ade80' : 'rgba(255,255,255,' + (.25 + hq * .4).toFixed(3) + ')';
      ctx.lineWidth = 2; rr(ctx, qx, y - 19, qw, 38, 19); ctx.stroke();
      drawSprite(ctx, 'cp', qx + 10, y - 11, 22, 22, 0);
      panelText(ctx, qx + 40, y + .5, 'PRACTICE', 12.5, PRACTICE ? '#86efac' : 'rgba(236,233,248,.8)', 'left', 800);
      const kk = FK.spring('gdpk', PRACTICE ? 1 : 0, 520, 30), sx = qx + qw - 52;
      ctx.fillStyle = PRACTICE ? '#22c55e' : '#2a2840'; rr(ctx, sx, y - 11, 40, 22, 11); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 11 + clamp(kk, -.1, 1.1) * 18, y, 8, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
    }

    function startRun(key) {
      useLevel(key);
      Store.opt('gdash', 'lastLevel', key);
      phase = 'run';
      attempts = 1; bestPct = 0; ended = false; endT = 0; winPending = false;
      checkpoint = null; cpFlash = 0;
      reset(false);
      Sound.place();
      pushHud();
    }

    function backToSelect() {
      phase = 'select';
      selShownAt = -1;
      previewX = PREVIEW_FROM;
      fxs.length = 0; trail.length = 0;
      /* a fresh sim, or the preview keeps the last run's collected coins
         hidden and its checkpoint flag planted in mid-air */
      P = newSim();
      checkpoint = null;
      pushHud();
    }

    function selectLevel(i) {
      const n = ORDER.length;
      i = (i + n) % n;
      if (i === pick) return;
      /* wrapping from the last card to the first slides across everything in
         between, which is a lot of motion for one keypress — so it cuts */
      if (Math.abs(i - pick) > 1) pickView = i;
      pick = i; previewX = PREVIEW_FROM; Sound.blip();
    }

    function updateSelect(dt) {
      selT += dt;
      const audioClick = Input.clicks && Input.clicks[0];
      if(audioClick && audioClick.x>=W/2-210 && audioClick.x<=W/2+210 && audioClick.y>=560 && audioClick.y<=590){Input.takeClick();music.toggle();return;}
      if (ONLINE && !IS_HOST) {
        followHost();
        if (phase !== 'lobby') return;
      } else {
        /* the party list can be open over the select, and what is typed or
           clicked there is not for it */
        const covered = !!api.covered;
        if (covered) while (Input.takeClick()) {}
        if (!covered && (Input.pressed('ArrowRight') || Input.pressed('KeyD'))) selectLevel(pick + 1);
        if (!covered && (Input.pressed('ArrowLeft') || Input.pressed('KeyA'))) selectLevel(pick - 1);
        if (!covered && !ONLINE && Input.pressed('KeyP')) { PRACTICE = !PRACTICE; Sound.grab(); }

        const c = covered ? null : Input.takeClick();
        if (c) {
          /* the buttons round the carousel first: the corner arrow, the party,
             Play, the icons, practice and the page dots */
          const u = uiBoxes.find(b => c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h);
          if (u) { uiClick(u.k); if (phase !== 'select' && phase !== 'lobby') return; }
          else for (const b of cardBoxes) {
            if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) {
              if (b.i === pick) { go(); return; }
              selectLevel(b.i);
            }
          }
        }
        if (!covered && (Input.pressed('Enter') || Input.pressed('Space') || Input.pressed('KeyW'))) { go(); return; }
        if (ONLINE) {
          /* the host's cursor, sent when it moves and every so often anyway so
             that somebody who joins the lobby late still lands on it */
          const lv = ORDER[pick], t = performance.now();
          if (lv !== lobbyPosted || t - lastPostAt > 800) {
            lobbyPosted = lv; lastPostAt = t;
            RACE.post({ ph: 'lobby', lv: lv }, true);
          }
        }
      }

      pickView += (pick - pickView) * Math.min(1, dt * 12);
      /* the preview scrolls the highlighted level past behind the cards */
      previewX += dt * SPEED * 0.55;
      /* a travelling saw is drawn from the runner's column, and in the preview
         the runner is wherever the camera has scrolled to */
      PREVIEW_SIM.x = previewX + 7;
      const L = PARSED[ORDER[pick]];
      if (previewX > L.len - 24) previewX = PREVIEW_FROM;
      pushHud();
    }

    function go() {
      if (!ONLINE) {
        /* the shell counts the round from here - and in a party this is the
           host starting a race for everybody, so nothing starts here */
        if (!api.play()) return;
        startRun(ORDER[pick]); return;
      }
      seenGo = 1 + ((Math.random() * 1e9) | 0);
      enterCount(ORDER[pick], COUNT_MS);
      lastPostAt = performance.now();
      RACE.post({ ph: 'go', lv: raceLevel, n: seenGo, cd: COUNT_MS }, true);
    }

    /* A guest follows whatever the host's last packet says: their cursor in
       the lobby, a go with however long was left on the count when it was
       sent, or — if every go went missing — a race already under way, which
       is joined straight away rather than never. */
    function followHost() {
      const hp = RACE.peers[HOST_ID];
      if (!hp || ORDER.indexOf(hp.lv) < 0) return;
      if (hp.ph === 'lobby') {
        selectLevel(ORDER.indexOf(hp.lv));
      } else if (hp.ph === 'go' && hp.n !== seenGo) {
        seenGo = hp.n;
        enterCount(hp.lv, hp.cd - (Date.now() - hp._t));
      } else if (hp.ph === 'run') {
        enterCount(hp.lv, 0);
      }
    }

    function enterCount(key, msLeft) {
      raceLevel = key;
      useLevel(key);
      PRACTICE = false;
      reset(false);
      phase = 'count';
      countEnd = performance.now() + Math.max(0, msLeft);
      countBeat = -1;
      for (const id in ghosts) delete ghosts[id];
      pick = ORDER.indexOf(key); pickView = pick;
      pushHud();
    }

    function updateCount(dt) {
      const left = countEnd - performance.now();
      const beat = Math.ceil(left / 1000);
      if (beat !== countBeat) {
        countBeat = beat;
        if (beat >= 1 && beat <= 3) Sound.blip();
      }
      if (IS_HOST && performance.now() - lastPostAt > 250) {
        lastPostAt = performance.now();
        RACE.post({ ph: 'go', lv: raceLevel, n: seenGo, cd: Math.max(0, Math.round(left)) }, true);
      }
      stepFx(dt);
      lerpView();
      if (left <= 0) {
        startRun(raceLevel);
        Sound.coin();
        goFlash = 1;
        postKeyframe(true);
      }
    }

    function goOut() {
      phase = 'out'; outT = 0; resultsT = 0;
      specId = null;
      pickSpec(0);
      camFrom = camX; camBlend = 1;
      pushHud();
    }
    function pickSpec(dir) {
      const list = runners();
      if (!list.length) return;
      let i = list.indexOf(specId);
      i = i < 0 ? 0 : (i + dir + list.length) % list.length;
      if (list[i] !== specId) { specId = list[i]; camFrom = camX; camBlend = 1; }
    }
    /* somebody else's icon broke: show it where it happened */
    function watchGhosts() {
      for (const p of ROSTER) {
        if (p.id === ME_ID) continue;
        const g = ghostOf(p.id);
        if (g && g.pkt.d && !g.broke) {
          g.broke = true;
          shatter(g.pkt.x, g.pkt.y + (g.pkt.m === 4 ? WAVE_SZ : SZ) / 2, slotOf(p.id));
          if (phase === 'out' && p.id === specId) Sound.explode();
        }
      }
    }

    function updateOut(dt) {
      outT += dt;
      stepFx(dt); easeGhosts(dt);
      goFlash = Math.max(0, goFlash - dt * 2);
      if (Input.pressed('ArrowRight') || Input.pressed('KeyD') || Input.takeClick()) { pickSpec(1); Sound.blip(); }
      if (Input.pressed('ArrowLeft') || Input.pressed('KeyA')) { pickSpec(-1); Sound.blip(); }
      /* Backspace is the way out, as it is on every other screen here. For
         the host that is also the end of the race for everybody, which the
         hint on screen says before it happens. */
      if (Input.pressed('Backspace')) { try { location.hash = ''; } catch (e) {} return; }
      watchGhosts();

      /* the one being watched finished or fell: stay on them a moment so you
         see it happen, then move on to whoever is still going */
      const still = runners();
      if (specId && still.indexOf(specId) < 0) {
        specSwitchT += dt;
        if (specSwitchT > 1.3 && still.length) { specSwitchT = 0; pickSpec(0); }
      } else {
        specSwitchT = 0;
        if (!specId && still.length) pickSpec(0);
      }

      const g = specId ? ghostOf(specId) : null;
      if (g) {
        const target = Math.max(0, g.x - 7);
        camBlend = Math.max(0, camBlend - dt * 2.2);
        const e = camBlend * camBlend * (3 - 2 * camBlend);
        camX = target + (camFrom - target) * e;
      }

      /* keep saying where you ended up, now and then, in case the packet that
         said it the first time was lost */
      if (performance.now() - lastPostAt > 1000) { lastPostAt = performance.now(); RACE.post(keyframe(), true); }

      if (RACE.allDone()) {
        resultsT += dt;
        if (resultsT > 1.6) raceResults();
      } else resultsT = 0;
      pushHud();
    }

    function raceResults() {
      if (ended) return;
      ended = true;
      const list = RACE.list();
      const mine = list.find(p => p.me);
      const my = mine ? mine.score : pct();
      api.gameOver({
        score: my,
        win: list.length > 1 && !!list[0].me,
        title: P.won ? LDEF.name + ' cleared' : 'Out at ' + my + '%',
        message: LDEF.name + ' · ' + ROSTER.length + '-player race',
        stats: [
          { label: 'Progress', value: my + '%' },
          { label: 'Coins', value: P.coins + '/' + (coinList.length || 0) }
        ]
      });
    }

    function update(dt) {
      if (Input.pressed('KeyM')) music.toggle();
      if (Input.pressed('BracketLeft')) music.adjust(-.1);
      if (Input.pressed('BracketRight')) music.adjust(.1);
      const selecting = phase === 'select' || phase === 'lobby';
      const listening = phase === 'out' && specId && ghosts[specId] ? ghosts[specId].sim : P;
      music.sync(selecting ? ORDER[pick] : LKEY, selecting ? selT : listening.t,
                 selecting || (phase === 'run' && !P.dead && !ended) || (phase === 'out' && listening && !listening.dead));
      if (phase === 'select' || phase === 'lobby') { updateSelect(dt); return; }
      if (phase === 'count') { updateCount(dt); return; }
      if (phase === 'out') { updateOut(dt); return; }
      goFlash = Math.max(0, goFlash - dt * 1.6);
      if (ONLINE) { easeGhosts(dt); watchGhosts(); }

      if (ended) {
        endT += dt;
        stepFx(dt);
        /* the level is cleared a beat before the card comes up, so the finish
           is something you see happen rather than a menu that cuts it off */
        if (winPending && endT > 1.05) { winPending = false; finish(true); }
        return;
      }

      if (!ONLINE) {
        if (Input.pressed('KeyR')) { reset(PRACTICE); }
        /* Esc is the shell's pause, so leaving a level is Backspace — it goes
           back to the select screen with the run's best still banked. */
        if (Input.pressed('Backspace')) {
          saveRun(LKEY, bestPct, P.coins);
          backToSelect(); return;
        }
        /* A run has no natural end short of finishing the level — dying puts
           you straight back at the start, which is the genre. Enter is the way
           to stop and keep the best percentage you reached. */
        if (Input.pressed('Enter') && attempts > 1) { ended = true; finish(false); return; }
        if (PRACTICE && Input.pressed('KeyZ') && !P.dead) {
          checkpoint = { x: P.x, y: P.y, t: P.t, grav: P.grav, mode: P.mode, speedMul: P.speedMul,
                         coins: P.coins, coinsGot: Object.assign({}, P.coinsGot),
                         portalDone: Object.assign({}, P.portalDone),
                         orbUsed: Object.assign({}, P.orbUsed) };
          cpFlash = 1; Sound.place();
        }
      }

      if (P.dead) {
        deadT += dt;
        stepFx(dt);
        if (ONLINE) { if (deadT > 1.1) goOut(); }
        else if (deadT > 0.62) reset(PRACTICE);
        pushHud();
        return;
      }

      if (P.won) {
        if (!P.winDone) {
          P.winDone = true;
          bestPct = 100;
          saveRun(LKEY, 100, P.coins);
          Sound.win();
          lerpView();
          const wx = view.x, wy = view.y + sizeOf(P) / 2, S = SLOTS[MY_SLOT];
          burst(wx, wy, S.pri3, 0.3, 3.2, 0.3, 0.6, 0);
          burst(wx, wy, S.sec3, 0.2, 2.4, 0.2, 0.55, 0.1);
          burst(wx, wy, C3.white, 0.1, 1.6, 0.12, 0.5, 0.2);
          deadT = 0;
          if (ONLINE) { RACE.finish(100); postKeyframe(true); }
          else { ended = true; endT = 0; winPending = true; return; }
        }
        deadT += dt;
        stepFx(dt);
        if (deadT > 1.6) goOut();
        return;
      }

      advance(dt);
      lerpView();
      bestPct = Math.max(bestPct, pct());
      stepFx(dt);
      if (ONLINE && !P.dead) RACE.report(pct(), true, null);

      /* The camera is pinned to the icon, not eased toward it. It runs at a
         constant speed, so an exact follow is perfectly smooth and holds it at
         one fixed point on screen — which is the whole read of the genre. A
         lerp here only adds a lag that breathes in and out with the frame
         rate, and that breathing is what reads as unsteady. */
      camX = Math.max(0, view.x - 7);
      if (cpFlash > 0) cpFlash = Math.max(0, cpFlash - dt * 2);

      pushHud();
    }

    function finish(won) {
      const coinsAll = coinList.length ? (P.coins === coinList.length) : true;
      const score = PRACTICE ? 0 : (won ? 100 : bestPct);
      api.gameOver({
        score: score,
        win: won,
        title: won ? (PRACTICE ? 'Practice run complete' : LDEF.name + ' cleared') : 'Run ended',
        message: PRACTICE
          ? 'Practice runs are not scored — switch to Normal for the leaderboard.'
          : (won ? (coinsAll && coinList.length ? 'All ' + coinList.length + ' coins, first try or not.' : 'Start to finish.')
                 : 'Best this run: ' + bestPct + '%'),
        stats: [
          { label: 'Progress', value: (won ? 100 : bestPct) + '%' },
          { label: 'Attempts', value: attempts },
          { label: 'Coins', value: P.coins + '/' + (coinList.length || 0) }
        ]
      });
    }

    /* ---- the results ----
       The finish in the level select's own look: the verdict in the logo's
       gold with your cube hopping beside it on the level's beat, the level's
       name and its difficulty in spikes, how far the run got on a big bar in
       the level's colour, what it did on the select's ink cards (the coins as
       coins), a band of the level's sky across the coins card, and the play
       button's green for going again. */
    const GD_FACE = 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
    function goldText(ctx, x, y, str, size) {
      ctx.save();
      ctx.font = '900 ' + size + 'px ' + GD_FACE;
      try { ctx.letterSpacing = (size * .035).toFixed(1) + 'px'; } catch (e) {}
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = size * .25; ctx.strokeStyle = 'rgba(11,10,22,.7)'; ctx.strokeText(str, x, y + size * .11);
      ctx.strokeStyle = INK; ctx.strokeText(str, x, y);
      const g = ctx.createLinearGradient(0, y - size * .45, 0, y + size * .45);
      g.addColorStop(0, '#fff6a0'); g.addColorStop(.45, '#ffd23a'); g.addColorStop(1, '#ff8f1f');
      ctx.fillStyle = g; ctx.fillText(str, x, y);
      const w = ctx.measureText(str).width;
      ctx.restore();
      return w;
    }
    function tierSpikes(ctx, x, y, tier, col) {
      for (let k = 0; k < 5; k++) {
        const sx = x + k * 14;
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 6, y - 11); ctx.lineTo(sx + 12, y); ctx.closePath();
        ctx.fillStyle = k < tier ? col : INK; ctx.fill();
        ctx.lineWidth = 1.6; ctx.lineJoin = 'miter'; ctx.strokeStyle = k < tier ? INK : 'rgba(255,255,255,.35)'; ctx.stroke();
      }
    }
    const inkCard = (ctx, x, y, w, h, r, edge) => {
      ctx.fillStyle = 'rgba(11,10,22,.55)'; rr(ctx, x + 5, y + 7, w, h, r); ctx.fill();
      ctx.fillStyle = INK; rr(ctx, x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = edge || 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; rr(ctx, x, y, w, h, r); ctx.stroke();
    };
    const RES_BANDS = ['#ffd43b', '#4ade80', '#ff5fb8', '#38bdf8'];
    const RES = {
      top: 22, gap: 20, statH: 52, colL: 230, colR: 440,
      veil(ctx, k) { ctx.fillStyle = 'rgba(11,10,22,' + (.62 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); },
      hero(ctx, cx, top) {
        const Rs = FK.R, tight = Rs.paid.length > 4;
        /* the verdict, popping in the way the logo does, with the cube */
        const word = String(Rs.title).toUpperCase(), size = word.length > 18 ? 34 : word.length > 13 ? 38 : 44;
        const k = FK.rs('title', undefined, .45), ty = top + 24;
        if (k > 0) {
          ctx.save(); ctx.globalAlpha *= Math.min(1, k * 2.5);
          const sc = .55 + .45 * FK.bo(k);
          ctx.translate(cx + 24, ty); ctx.scale(sc, sc);
          const tw = goldText(ctx, 0, 0, word, size);
          const tr = TRACKS[LKEY], per = tr.bpm > 150 ? 2 : 1, b = FK.t * tr.bpm / 60 / per, fr = b - Math.floor(b);
          const hop = Math.sin(fr * Math.PI) * 16, rot = (Math.floor(b) + 1 - (1 - fr) * (1 - fr)) * Math.PI / 2;
          drawSprite(ctx, 'cube' + MY_SLOT, -tw / 2 - 54, -20 - hop, 38, 38, rot);
          ctx.restore();
        }
        /* the level, and how hard it is */
        const lk = FK.eo(FK.rs('sub', undefined, .4)), ly = ty + (tight ? 38 : 42);
        if (lk > 0) {
          const tier = TIERS[LDEF.tier] || TIERS[1], name = LDEF.name.toUpperCase();
          ctx.save(); ctx.globalAlpha *= lk;
          ctx.font = '800 15px ' + GD_FACE;
          const w1 = ctx.measureText(name).width;
          ctx.font = '800 12px ' + GD_FACE;
          const w2 = ctx.measureText(tier.name).width, tot = w1 + 16 + 68 + 10 + w2;
          let x = cx - tot / 2;
          inkText(ctx, x, ly, name, 15, 'left');
          x += w1 + 16;
          tierSpikes(ctx, x, ly + 6, LDEF.tier, tier.col);
          inkText(ctx, x + 78, ly + 1, tier.name, 12, 'left', tier.col);
          panelText(ctx, cx, ly + 22, String(Rs.message), 12, 'rgba(236,233,248,.72)', 'center', 600);
          ctx.restore();
        }
        /* how far the run got, on the bar the level is played under */
        const pst = Rs.gameStats.find(q => q.label === 'Progress'), pv = pst ? parseFloat(pst.value) : Rs.score;
        const pc = isNaN(pv) ? 0 : clamp(pv, 0, 100), bk = FK.rs('stat', 0, .35);
        const bw = Math.min(560, W * .56), bh = 22, bx = cx - bw / 2, by = ly + (tight ? 40 : 50);
        if (bk > 0) {
          const fill = pc * FK.eo(FK.rs('stat', 0, 1.1)) / 100;
          ctx.save(); ctx.globalAlpha *= FK.eo(bk);
          ctx.fillStyle = 'rgba(11,10,22,.55)'; rr(ctx, bx - 5 + 4, by - 5 + 6, bw + 10, bh + 10, 14); ctx.fill();
          ctx.fillStyle = INK; rr(ctx, bx - 5, by - 5, bw + 10, bh + 10, 14); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, bx, by, bw, bh, 11); ctx.fill();
          if (fill > .004) {
            const col = pc >= 100 ? '#4ade80' : ONLINE ? SLOTS[MY_SLOT].pri : LDEF.accent;
            ctx.fillStyle = col; rr(ctx, bx, by, Math.max(bh, bw * fill), bh, 11); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(ctx, bx + 4, by + 3, Math.max(bh - 8, bw * fill - 8), 5, 2.5); ctx.fill();
          }
          inkText(ctx, cx, by + bh / 2 + 1, Math.round(fill * 100) + '%', 19, 'center');
          ctx.restore();
        }
        /* and the best, under it */
        const gy = by + bh + (tight ? 22 : 26), gk = FK.rs('tag', undefined, .45);
        if (gk > 0) {
          if (Rs.isBest) {
            ctx.save(); ctx.translate(cx, gy); const pop = popScale(gk); ctx.scale(pop, pop);
            inkText(ctx, 0, 0, 'NEW BEST!', 20, 'center', '#ffd43b');
            ctx.restore();
          } else {
            ctx.save(); ctx.globalAlpha *= FK.eo(gk);
            inkText(ctx, cx, gy, (Rs.cheated ? 'NOT SAVED  ·  ' : '') + 'BEST  ' + fmt(Rs.best) + '%', 14, 'center', '#e4e1f0');
            ctx.restore();
          }
        }
        return gy + 14 - top;
      },
      /* the bar already says how far the run got */
      stats: gs => gs.filter(q => q.label !== 'Progress'),
      stat(ctx, st, x, y, w, h, i) {
        inkCard(ctx, x, y, w, h, 12);
        ctx.save(); rr(ctx, x, y, w, h, 12); ctx.clip();
        ctx.fillStyle = RES_BANDS[i % RES_BANDS.length]; ctx.fillRect(x, y, 7, h);
        ctx.restore();
        panelText(ctx, x + 22, y + h / 2, String(st.label).toUpperCase(), 10, 'rgba(236,233,248,.55)', 'left', 800);
        const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(st.value));
        if (st.label === 'Coins' && m && +m[2] > 0 && +m[2] <= 5) {
          for (let c = 0; c < +m[2]; c++) {
            ctx.save(); ctx.globalAlpha *= c < +m[1] ? 1 : .22;
            drawSprite(ctx, 'coin', x + w - 14 - (+m[2] - c) * 25, y + h / 2 - 11, 22, 22, 0);
            ctx.restore();
          }
        } else inkText(ctx, x + w - 16, y + h / 2 + 1, String(st.value), 21, 'right');
      },
      card(ctx, x, y, w, h) {
        inkCard(ctx, x, y, w, h, 14);
        ctx.save(); rr(ctx, x, y, w, h, 14); ctx.clip();
        ctx.fillStyle = (THEMES[LKEY] || THEMES.drift)[0].bg; ctx.fillRect(x, y, w, 44);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + 38, w, 6);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 14); ctx.stroke();
      },
      head(ctx, x, y, w) {
        drawSprite(ctx, 'coin', x, y - 11, 22, 22, 0);
        inkText(ctx, x + 30, y + 1, 'COINS', 14, 'left');
        inkText(ctx, x + w, y + 1, fmt(FK.purse()), 20, 'right', '#ffd43b');
      },
      headH: 54,
      ls: FK.ledgerStyle({
        face: GD_FACE, weight: 800, ink: '#ffffff', mute: 'rgba(236,233,248,.55)', gold: '#ffd43b',
        rule: 'rgba(255,255,255,.12)', bar: 'rgba(255,255,255,.14)', fill: '#4ade80', rowH: 24, size: 14, lsize: 10,
        totalSize: 30, totalH: 42, xpH: 42, barH: 10, track: .16
      }),
      std: { me: '#ffd43b', fmt: v => Math.round(v) + '%' },
      stdCard(ctx, x, y, w, h) { inkCard(ctx, x, y, w, h, 14); },
      button(ctx, key, label, x, y, w, h, primary) {
        const b = FK.btn(key, x, y, w, h), sc = 1 + b.h * .05 - b.p * .04, r = h / 2;
        ctx.save(); ctx.translate(x + w / 2, y + h / 2 - b.h * 2); ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(11,10,22,.55)'; rr(ctx, -w / 2 + 3, -h / 2 + 5, w, h, r); ctx.fill();
        ctx.fillStyle = INK; rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fill();
        if (primary) {
          const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
          g.addColorStop(0, '#9bff72'); g.addColorStop(1, '#16a53a');
          ctx.fillStyle = g; rr(ctx, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, r - 5); ctx.fill();
          ctx.beginPath(); ctx.ellipse(0, -h * .2, w / 2 - 24, h * .13, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
          /* the select screen's play triangle */
          const tx = -w / 2 + 36;
          ctx.beginPath(); ctx.moveTo(tx - 7, -11); ctx.lineTo(tx + 11, 0); ctx.lineTo(tx - 7, 11); ctx.closePath();
          ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fill();
          inkText(ctx, 16, 1, label, 20, 'center');
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,' + (.25 + b.h * .45).toFixed(3) + ')'; ctx.lineWidth = 2;
          rr(ctx, -w / 2, -h / 2, w, h, r); ctx.stroke();
          const ix = -w / 2 + 30;
          if (key === 'hub') {
            /* the corner's green back arrow, small */
            const g = ctx.createLinearGradient(0, -13, 0, 13);
            g.addColorStop(0, '#8dff6a'); g.addColorStop(1, '#1faa3c');
            ctx.beginPath(); ctx.arc(ix, 0, 13, 0, TAU); ctx.fillStyle = g; ctx.fill();
            ctx.beginPath(); ctx.moveTo(ix + 3, -6); ctx.lineTo(ix - 4, 0); ctx.lineTo(ix + 3, 6);
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
            ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            ctx.lineCap = 'butt';
          } else {
            /* three level cards, the select screen in small */
            for (let c = 0; c < 3; c++) {
              ctx.fillStyle = c === 1 ? '#ffffff' : 'rgba(255,255,255,.4)';
              rr(ctx, ix - 13 + c * 9, c === 1 ? -9 : -7, 7, c === 1 ? 18 : 14, 2); ctx.fill();
            }
          }
          panelText(ctx, 12, .5, label, 14, '#ffffff', 'center', 800);
        }
        ctx.restore();
      },
      hint(ctx, cx, y) { inkText(ctx, cx, y, 'ENTER  play again        ESC  hub', 11.5, 'center', 'rgba(228,225,240,.85)'); }
    };

    /* ------------------------------------------------------------- render */
    function paintGL(ctx, cx, v) {
      /* Match the backing store to the pixels this will actually occupy. A
         canvas sized in logical units and then scaled up by the stage is the
         difference between a sharp edge and a soft one. */
      const tf = ctx.getTransform ? ctx.getTransform() : null;
      const S = tf ? clamp(Math.hypot(tf.a, tf.b), 1, 3) : 1;
      R.resize(Math.ceil(W * S), Math.ceil(H * S));
      R.draw(icount, cx, VIEW_Y, v.vw, v.vh);
      ctx.fillStyle = '#0b0720';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(R.canvas, 0, 0, W, H);
    }

    function render(ctx) {
      if (api.paused) music.silence();
      if (hotKey && phase !== 'select' && phase !== 'lobby') { hotKey = ''; try { cv.style.cursor = ''; } catch (e) {} }
      const t = performance.now() / 1000;
      const tf = ctx.getTransform ? ctx.getTransform() : null;
      const want = wantPPC(tf ? clamp(Math.hypot(tf.a, tf.b), 1, 3) : 1);
      if (want !== atlasPPC) bakeAtlas(want);
      if (phase === 'select' || phase === 'lobby') { renderSelect(ctx, t); return; }
      if (FK.R) FK.frame();
      const fade = FK.R ? 1 - FK.eo(FK.rs('title', undefined, .3)) : 1;
      if (phase === 'out') {
        const g = specId ? ghosts[specId] : null;
        const v = buildScene(t, camX, g && g.sim ? g.sim : P, false);
        paintGL(ctx, camX, v);
        FK.layer(ctx, fade, c => { drawNameTags(c, v, false); drawStandings(c); drawSpectate(c, t, g); });
        if (FK.R) FK.resultsPage(ctx, W, H, RES);
        return;
      }
      const v = buildScene(t, camX, P, true);
      paintGL(ctx, camX, v);
      FK.layer(ctx, fade, c => {
        if (ONLINE) { drawNameTags(c, v, true); drawStandings(c); }
        drawChrome(c, t);
        if (phase === 'count') drawCountdown(c, t);
      });
      if (FK.R) FK.resultsPage(ctx, W, H, RES);
    }

    /* ---------------------------------------------------- select: painting */
    /* The highlighted level runs behind the cards. It is the same scene
       builder the game uses, pointed at whichever level is under the cursor
       and with nobody in it — which is why every level is parsed at mount
       rather than only the one being played. */
    function renderSelect(ctx, t) {
      FK.frame();
      if (selShownAt < 0) selShownAt = t;
      const ink = (d, dur) => clamp((t - selShownAt - d) / dur, 0, 1);
      const prevKey = LKEY;
      useLevel(ORDER[pick]);
      const v = buildScene(t, previewX, PREVIEW_SIM, false);
      paintGL(ctx, previewX, v);
      useLevel(prevKey);

      /* the preview is scenery, not the subject — but it keeps its colour,
         because the colour is most of what tells the levels apart */
      ctx.fillStyle = 'rgba(11,10,22,.42)';
      ctx.fillRect(0, 0, W, H);
      /* and it breathes with the kick of the track playing behind it, the way
         the levels themselves do */
      const beat = beatK();
      ctx.save(); ctx.globalAlpha = beat * .08;
      ctx.fillStyle = (THEMES[ORDER[pick]] || THEMES.drift)[0].bg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      uiBoxes = [];
      const P2 = api.party, pmode = ONLINE ? 'race' : !P2.inRoom ? 'solo' : P2.isHost ? 'host' : 'guest';

      /* ---- the logo, and the ways out ---- */
      drawLogo(ctx, W / 2, 60, ONLINE ? 'RACE LOBBY' : 'GEOMETRY DASH', beat, ink(0, .55));
      const sub = !ONLINE ? 'PICK A LEVEL'
                : IS_HOST ? 'YOU PICK THE LEVEL · ONE LIFE EACH'
                : nameOf(HOST_ID).toUpperCase() + ' IS PICKING THE LEVEL';
      if (ink(.25, .3) > .5) inkText(ctx, W / 2, 104, sub, 13, 'center', '#e4e1f0');
      if (!ONLINE) drawCorners(ctx, P2, ink(.3, .4));

      /* ---- the cards, as a carousel centred on the one picked ---- */
      const n = ORDER.length;
      const cw = 236, ch = 252, gapx = 22, cy = 140;
      cardBoxes = [];
      for (let i = 0; i < n; i++) {
        const L = PARSED[ORDER[i]];
        /* on the way in each card slides up from the right, a moment after
           the one before it */
        const ik = FK.eo(ink(.12 + Math.max(0, i - pickView + 1) * .06, .55));
        const x = W / 2 - cw / 2 + (i - pickView) * (cw + gapx) + (1 - ik) * W * .55;
        if (x > W + 20 || x + cw < -20) continue;
        const sel = Math.max(0, 1 - Math.abs(pickView - i));
        const hv = FK.glide('gdcard' + i, overBox({ x: x, y: cy - 12, w: cw, h: ch + 12 }) && !api.covered ? 1 : 0, 14);
        const y = cy - sel * 12 - hv * 5;
        const band = (THEMES[L.key] || THEMES.drift)[0].bg;
        const tier = TIERS[L.tier] || TIERS[1];
        cardBoxes.push({ x: x, y: y, w: cw, h: ch, i: i });

        ctx.save();
        /* a hard offset shadow rather than a blur */
        ctx.fillStyle = 'rgba(11,10,22,.55)';
        rr(ctx, x + 6, y + 8, cw, ch, 14); ctx.fill();
        ctx.fillStyle = INK;
        rr(ctx, x, y, cw, ch, 14); ctx.fill();

        ctx.save();
        rr(ctx, x, y, cw, ch, 14); ctx.clip();
        ctx.fillStyle = band;
        ctx.fillRect(x, y, cw, 62);
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.fillRect(x, y + 54, cw, 8);
        drawMiniMap(ctx, L, x + 14, y + 158, cw - 28, 44, sel);
        ctx.restore();

        /* the picked card's edge glows in its own colour, on the beat */
        if (sel > 0.5) {
          ctx.save();
          ctx.shadowColor = band; ctx.shadowBlur = 8 + beat * 18;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 + beat * 1.2;
          rr(ctx, x, y, cw, ch, 14); ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,' + (.22 + hv * .3).toFixed(3) + ')';
          ctx.lineWidth = 2;
          rr(ctx, x, y, cw, ch, 14); ctx.stroke();
        }

        inkText(ctx, x + 16, y + 25, L.name, 18, 'left');
        /* difficulty as spikes, which is the only unit this game has, and the
           word for it in its own colour */
        for (let k = 0; k < 5; k++) {
          const sx = x + 16 + k * 14, sy = y + 50;
          ctx.beginPath();
          ctx.moveTo(sx, sy); ctx.lineTo(sx + 6, sy - 11); ctx.lineTo(sx + 12, sy); ctx.closePath();
          ctx.fillStyle = k < L.tier ? tier.col : INK; ctx.fill();
          ctx.lineWidth = 1.6; ctx.lineJoin = 'miter';
          ctx.strokeStyle = k < L.tier ? INK : 'rgba(255,255,255,.35)';
          ctx.stroke();
        }
        inkText(ctx, x + 92, y + 45, tier.name, 12, 'left', tier.col);

        const lines = wrap(ctx, L.blurb, cw - 32, 11, 2);
        for (let li = 0; li < lines.length; li++)
          panelText(ctx, x + 16, y + 84 + li * 16, lines[li], 11, 'rgba(236,233,248,.78)', 'left', 600);

        const b = savedBest(L.key), got = savedCoins(L.key);
        panelText(ctx, x + 16, y + 128, 'BEST', 9.5, 'rgba(236,233,248,.5)', 'left', 800);
        panelText(ctx, x + 16, y + 145, b + '%', 21, b >= 100 ? '#86efac' : '#ffffff', 'left', 800);
        panelText(ctx, x + cw - 16, y + 128, 'COINS', 9.5, 'rgba(236,233,248,.5)', 'right', 800);
        drawSprite(ctx, 'coin', x + cw - 16 - 44 - 18, y + 136, 18, 18, 0);
        panelText(ctx, x + cw - 16, y + 145, got + '/' + L.coins.length, 21,
                  got >= L.coins.length && L.coins.length ? '#ffd43b' : '#ffffff', 'right', 800);

        /* completion along the bottom of the card */
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        rr(ctx, x + 14, y + ch - 26, cw - 28, 9, 5); ctx.fill();
        if (b > 0) {
          ctx.fillStyle = '#ffffff';
          rr(ctx, x + 14, y + ch - 26, Math.max(9, (cw - 28) * (b / 100)), 9, 5); ctx.fill();
        }
        ctx.restore();
      }
      /* arrows at the edges when there is more to either side */
      const pulse = 1 + 0.08 * Math.sin(t * 5);
      for (const side of [-1, 1]) {
        if (side < 0 ? pick <= 0 : pick >= n - 1) continue;
        const ax = side < 0 ? 34 : W - 34, ay = cy + ch / 2, r = 22 * pulse;
        ctx.beginPath(); ctx.arc(ax, ay, r, 0, TAU); ctx.fillStyle = INK; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - side * 5, ay - 9); ctx.lineTo(ax + side * 5, ay); ctx.lineTo(ax - side * 5, ay + 9);
        ctx.lineWidth = 4; ctx.lineJoin = 'miter'; ctx.lineCap = 'square'; ctx.stroke();
        ctx.lineCap = 'butt';
      }
      drawDots(ctx, cy + ch + 18, beat, ink(.45, .4));

      const track=TRACKS[ORDER[pick]];
      panelText(ctx,W/2,550,track.title.toUpperCase()+'   ·   '+track.genre.toUpperCase()+'   ·   '+track.bpm+' BPM',12,'#deebff','center',700);
      ctx.fillStyle=Sound.muted||!music.enabled?'rgba(14,23,45,.88)':'rgba(28,71,80,.88)';
      rr(ctx,W/2-210,560,420,30,15);ctx.fill();ctx.strokeStyle='rgba(161,213,255,.35)';ctx.lineWidth=1;ctx.stroke();
      panelText(ctx,W/2,575,musicStatus(),10,'#b4c8e5','center',600);
      const by = cy + ch + 40;
      if (ONLINE) {
        /* ---- who is in the race ---- */
        const pw = 176, gap2 = 12, total = ROSTER.length * pw + (ROSTER.length - 1) * gap2;
        let px = (W - total) / 2;
        for (const p of ROSTER) {
          const me = p.id === ME_ID, host = p.id === HOST_ID;
          ctx.fillStyle = INK;
          rr(ctx, px, by, pw, 40, 20); ctx.fill();
          ctx.strokeStyle = me ? SLOTS[slotOf(p.id)].pri : 'rgba(255,255,255,.22)';
          ctx.lineWidth = 2;
          rr(ctx, px, by, pw, 40, 20); ctx.stroke();
          drawSprite(ctx, 'cube' + slotOf(p.id), px + 9, by + 8, 24, 24, 0);
          const nm = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
          panelText(ctx, px + 42, by + (host ? 15 : 20.5), nm, 12.5, '#ffffff', 'left', 700);
          if (host) panelText(ctx, px + 42, by + 29, 'HOST', 9, '#ffd43b', 'left', 800);
          px += pw + gap2;
        }
        const msg = IS_HOST ? '← →  choose       ENTER  start the race'
                            : 'Waiting for ' + nameOf(HOST_ID) + ' to start…';
        const pop = IS_HOST ? 1 : 1 + 0.04 * Math.sin(t * 4);
        inkText(ctx, W / 2, by + 66, msg, Math.round(15 * pop), 'center', IS_HOST ? '#ffffff' : '#e4e1f0');
      } else {
        /* ---- your icon, Play and practice, then the keys ---- */
        drawControls(ctx, cy + ch + 66, beat, ink(.5, .5), pmode);
        if (ink(.8, .3) > .5)
          inkText(ctx, W / 2, 516, '← →  choose      ENTER  play      P  practice      ESC  hub', 11.5, 'center', 'rgba(228,225,240,.85)');
      }

      /* the pointer, over anything that can be clicked */
      const hot = !api.covered && (uiBoxes.some(overBox) || cardBoxes.some(overBox)) ? 'pointer' : '';
      if (hot !== hotKey) { hotKey = hot; try { cv.style.cursor = hot; } catch (e) {} }
    }

    /* a sprite from the atlas onto the 2D chrome, turned about its centre */
    function drawSprite(ctx, name, x, y, w, h, rot) {
      const s = SPR[name];
      if (!s || !atlas) return;
      const AW = atlas.width, AH = atlas.height;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(atlas, s.u0 * AW, s.v0 * AH, (s.u1 - s.u0) * AW, (s.v1 - s.v0) * AH, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    /* Break a line on words rather than on a character count. Slicing at a
       fixed width is fine until it lands mid-word and the card reads "Le arn
       it a section at a time", which is exactly what it did. */
    function wrap(ctx, str, maxW, size, maxLines) {
      ctx.font = '600 ' + size + 'px ui-sans-serif,system-ui,sans-serif';
      const words = str.split(' '), out = [];
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const t = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(t).width <= maxW) { line = t; continue; }
        if (out.length === maxLines - 1) {
          /* on the last line, take the whole remainder and trim it below —
             dropping it word by word here loses the tail silently */
          line = (line ? line + ' ' : '') + words.slice(i).join(' ');
          break;
        }
        out.push(line);
        line = words[i];
      }
      out.push(line);
      const last = out.length - 1;
      if (out[last] && ctx.measureText(out[last]).width > maxW) {
        while (out[last].length > 1 && ctx.measureText(out[last] + '…').width > maxW)
          out[last] = out[last].slice(0, -1);
        out[last] = out[last].replace(/[ ,.]+$/, '') + '…';
      }
      return out;
    }

    /* A sketch of the whole level in one strip: every obstacle as a mark at
       its own height. It is not a map you can read a jump off, it is a shape —
       you can see at a glance that one level is sparse and another is wall to
       wall, which is the thing a name never tells you. */
    function drawMiniMap(ctx, L, x, y, w, h, sel) {
      ctx.save();
      ctx.globalAlpha = 0.30 + 0.5 * sel;
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      rr(ctx, x, y, w, h, 4); ctx.fill();
      const sx = w / L.len, base = y + h - 4;
      ctx.fillStyle = L.accent;
      for (const s of L.spikes) ctx.fillRect(x + s.x * sx, base - 4 - s.y * 3.4, 1.2, s.small ? 2 : 4);
      for (const s of L.saws) ctx.fillRect(x + s.x * sx - 1, base - 3 - s.y * 3.4, 2.4, 2.4);
      for (let c = 0; c < L.len; c += 2) {
        const col = L.cols[c]; if (!col) continue;
        for (const yc of col) {
          if (yc === -1) continue;
          ctx.fillRect(x + c * sx, base - 3 - yc * 3.4, 1.6, 2.2);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (const q of L.portals) ctx.fillRect(x + q.x * sx, y + 3, 1.2, h - 6);
      ctx.fillStyle = '#fde68a';
      for (const c of L.coins) {
        ctx.beginPath(); ctx.arc(x + c.x * sx, base - 3 - c.y * 3.4, 1.6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(x, base, w, 1.2);
      ctx.restore();
    }

    /* Text with a hard dark edge, which reads over any colour the sky has
       drifted to without needing a panel behind it. It is never faded: the
       outline and the fill blend separately, so half-transparent outlined text
       comes out as a grey smear. Anything that has to come and go scales. */
    function inkText(ctx, x, y, s, size, align, col) {
      ctx.save();
      ctx.font = '800 ' + size + 'px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.17);
      ctx.strokeStyle = INK; ctx.strokeText(s, x, y);
      ctx.fillStyle = col || '#ffffff'; ctx.fillText(s, x, y);
      ctx.restore();
    }
    /* a quick overshooting pop from nothing, for words that arrive */
    function popScale(k) {
      k = clamp(k, 0, 1);
      return 0.55 + 0.45 * (1 - (1 - k) * (1 - k)) + 0.12 * Math.sin(k * Math.PI);
    }

    function progressBar(ctx, p, col, label) {
      const bw = Math.min(440, W * 0.38), bx = (W - bw) / 2, by = 20, bh = 12;
      ctx.fillStyle = INK;
      rr(ctx, bx - 4, by - 4, bw + 8, bh + 8, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      rr(ctx, bx, by, bw, bh, 6); ctx.fill();
      if (p > 0.005) {
        ctx.fillStyle = col || '#ffffff';
        rr(ctx, bx, by, Math.max(bh, bw * p), bh, 6); ctx.fill();
      }
      inkText(ctx, bx + bw + 14, by + bh / 2 + 1, label || Math.round(p * 100) + '%', 18, 'left');
    }

    /* The bar across the top, the attempt count, and the one line of text that
       tells a new player what the button is. Canvas 2D on top of the GL frame,
       because text is the one thing a quad renderer has no business doing. */
    function drawChrome(ctx, t) {
      progressBar(ctx, clamp(view.x / (LEN - 2), 0, 1), ONLINE ? SLOTS[MY_SLOT].pri : LDEF.accent);
      const tr=TRACKS[LKEY], beat=P.t*tr.bpm/60;
      panelText(ctx,18,44,tr.title+'  /  '+tr.bpm+' BPM',11,'#d4e4ff','left',600);
      panelText(ctx,18,61,musicStatus(),9,'#a3b5d1','left',600);
      for(let i=0;i<16;i++){const active=i===Math.floor(beat*4)%16;ctx.fillStyle=active?LDEF.accent:'rgba(160,194,255,.15)';ctx.fillRect(18+i*8,74,5,active?9:4);}
      const fraction=P.x/LEN, chapter=fraction<.25?'IGNITION':fraction<.5?'LIFT OFF':fraction<.75?'THE DROP':'FINAL RUN';
      if(!ONLINE)panelText(ctx,W-18,48,chapter+'  /  '+P.mode.toUpperCase(),10,'#b4c8e5','right',600);
      const v = viewSize(), ppc = W / v.vw, ppy = H / v.vh;

      if (!ONLINE) {
        /* ---- the attempt count, standing in the level itself ----
           It is painted at a fixed spot in the world just ahead of where the
           attempt began, so it scrolls away with the floor rather than sitting
           on the glass — the run starts, and the number is left behind. */
        const ax = (runFrom + 11 - camX) * ppc;
        if (ax > -420 && ax < W + 420) {
          const ay = H - (4.9 - VIEW_Y) * ppy;
          inkText(ctx, ax, ay, 'Attempt ' + attempts, 44, 'center');
          if (attempts === 1 && !PRACTICE && runFrom < 2) {
            inkText(ctx, ax, ay + 40, 'Space, W, ↑ or click to jump', 16, 'center');
          }
        }
        if (PRACTICE) {
          inkText(ctx, W / 2, H - 24,
                  checkpoint ? 'Z  moves the checkpoint    ·    R  restarts from it' : 'Z  drops a checkpoint',
                  14, 'center', cpFlash > 0 ? '#86efac' : '#ffffff');
        } else if (attempts > 1) {
          inkText(ctx, W / 2, H - 24, 'Enter  ends the run and keeps ' + bestPct + '%', 14, 'center', '#e4e1f0');
        }
      } else if (phase === 'run') {
        /* the level's name, standing in the world where the race began */
        const ax = (12 - camX) * ppc;
        if (ax > -420 && ax < W + 420) inkText(ctx, ax, H - (4.9 - VIEW_Y) * ppy, LDEF.name, 40, 'center');
      }

      if (goFlash > 0) {
        const k = 1 - goFlash;
        inkText(ctx, W / 2, H * 0.24, 'GO!', Math.round(78 * popScale(k * 4)), 'center', '#86efac');
      }
      /* the percentage you reached, popping in over the wreck */
      if (P.dead && deadT > 0.05 && deadT < (ONLINE ? 1.1 : 0.56)) {
        const pop = popScale((deadT - 0.05) / 0.14);
        if (ONLINE) {
          inkText(ctx, W / 2, H * 0.36, 'OUT', Math.round(64 * pop), 'center', '#ff6b7a');
          inkText(ctx, W / 2, H * 0.36 + 50, 'at ' + pct() + '%', Math.round(26 * pop), 'center');
        } else inkText(ctx, W / 2, H * 0.4, pct() + '%', Math.round(52 * pop), 'center');
      }
      if (ONLINE && P.won && P.winDone) {
        inkText(ctx, W / 2, H * 0.36, 'FINISHED!', Math.round(64 * popScale(deadT / 0.16)), 'center', '#ffd43b');
      }
    }

    /* 3, 2, 1 — each number pops in as its second begins, and the level's
       name sits above them so everyone knows what they are about to play */
    function drawCountdown(ctx, t) {
      const left = countEnd - performance.now();
      const n = Math.ceil(left / 1000);
      inkText(ctx, W / 2, H * 0.22, LDEF.name.toUpperCase(), 30, 'center');
      const tier = TIERS[LDEF.tier] || TIERS[1];
      inkText(ctx, W / 2, H * 0.22 + 32, tier.name, 14, 'center', tier.col);
      if (n > 3) {
        inkText(ctx, W / 2, H * 0.44, 'GET READY', 44, 'center');
      } else if (n >= 1) {
        const k = 1 - (left - (n - 1) * 1000) / 1000;
        inkText(ctx, W / 2, H * 0.44, String(n), Math.round(110 * popScale(k * 3.5)), 'center', ['#86efac', '#ffd43b', '#ff6b7a'][n - 1]);
      }
      inkText(ctx, W / 2, H - 26, 'One life each · when you are out, you watch the rest', 14, 'center', '#e4e1f0');
    }

    /* world to stage */
    function toScreen(v, x, y) {
      return { x: (x - camX) * (W / v.vw), y: H - (y - VIEW_Y) * (H / v.vh) };
    }

    /* Names over icons. Four players spend most of a race stacked on the same
       spot, so a tag that would land on another one steps up above it rather
       than printing on top. */
    function drawNameTags(ctx, v, withMe) {
      const tags = [];
      if (withMe && !P.dead && !P.won) {
        const s = toScreen(v, view.x, view.y + sizeOf(P) + (P.mode === 'ufo' ? 0.5 : 0.05));
        tags.push({ x: s.x, y: s.y - 14, text: 'YOU', col: SLOTS[MY_SLOT].pri });
      }
      for (const p of ROSTER) {
        if (p.id === ME_ID) continue;
        if (phase === 'count') {
          const s = toScreen(v, 1, SZ + 0.05);
          const nm = p.name.length > 12 ? p.name.slice(0, 11) + '\u2026' : p.name;
          tags.push({ x: s.x, y: s.y - 14, text: nm, col: SLOTS[slotOf(p.id)].pri });
          continue;
        }
        const g = ghosts[p.id];
        if (!g || !g.pkt || g.pkt.d || g.pkt.lv !== LKEY) continue;
        const b = RACE.board[p.id];
        if (b && b.done && !g.pkt.w) continue;
        const s = toScreen(v, g.x, g.y + sizeOf(g.sim) + (g.sim.mode === 'ufo' ? 0.5 : 0.05));
        if (s.x < -60 || s.x > W + 60) continue;
        const nm = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
        tags.push({ x: s.x, y: s.y - 14, text: nm, col: SLOTS[slotOf(p.id)].pri, spec: p.id === specId && phase === 'out' });
      }
      const placed = [];
      ctx.save();
      ctx.font = '800 13px ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
      for (const tg of tags) {
        const w = ctx.measureText(tg.text).width + 12;
        let y = tg.y;
        for (let guard = 0; guard < 6; guard++) {
          const hit = placed.some(q => Math.abs(q.x - tg.x) < (q.w + w) / 2 && Math.abs(q.y - y) < 18);
          if (!hit) break;
          y -= 18;
        }
        placed.push({ x: tg.x, y: y, w: w });
        inkText(ctx, tg.x, y, tg.text, tg.spec ? 15 : 13, 'center', tg.col);
      }
      ctx.restore();
    }

    /* Everyone in the race, best first: their icon, their name, how far they
       have got, and whether they are still going. */
    function drawStandings(ctx) {
      const rows = ROSTER.map(p => {
        const b = RACE.board[p.id], pk = RACE.peers[p.id];
        const me = p.id === ME_ID;
        const won = me ? P.won : !!(pk && pk.w) || (b && b.done && b.score >= 100);
        const out = me ? (P.dead || phase === 'out' && !P.won) : !!(b && b.done && !won);
        return { p: p, pct: livePct(p.id), won: won, out: out, me: me };
      }).sort((a, b) => b.pct - a.pct || (a.out - b.out));
      const x = 14, y = 14, w = 206, rh = 30;
      ctx.fillStyle = INK;
      rr(ctx, x, y, w, 12 + rows.length * rh, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
      rr(ctx, x, y, w, 12 + rows.length * rh, 12); ctx.stroke();
      rows.forEach((r, i) => {
        const ry = y + 6 + i * rh, slot = slotOf(r.p.id);
        if (r.me) {
          ctx.fillStyle = 'rgba(255,255,255,.08)';
          rr(ctx, x + 5, ry + 1, w - 10, rh - 2, 8); ctx.fill();
        }
        panelText(ctx, x + 16, ry + rh / 2, String(i + 1), 12, 'rgba(236,233,248,.55)', 'center', 800);
        drawSprite(ctx, 'cube' + slot, x + 28, ry + 5, 20, 20, 0);
        if (r.out) {
          ctx.strokeStyle = '#ff5a6e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x + 29, ry + 6); ctx.lineTo(x + 47, ry + 24);
          ctx.moveTo(x + 47, ry + 6); ctx.lineTo(x + 29, ry + 24); ctx.stroke();
        }
        const nm = r.p.name.length > 11 ? r.p.name.slice(0, 10) + '…' : r.p.name;
        panelText(ctx, x + 56, ry + rh / 2, nm, 12.5, r.out ? 'rgba(236,233,248,.5)' : '#ffffff', 'left', r.me ? 800 : 700);
        const val = r.won ? '100%' : r.pct + '%';
        panelText(ctx, x + w - 12, ry + rh / 2, val, 13, r.won ? '#ffd43b' : r.out ? '#ff8a96' : SLOTS[slot].pri, 'right', 800);
      });
    }

    function drawSpectate(ctx, t, g) {
      const v = viewSize();
      if (g && g.pkt) {
        const slot = slotOf(specId);
        progressBar(ctx, clamp(g.x / (LEN - 2), 0, 1), SLOTS[slot].pri);
        inkText(ctx, W / 2, 62, 'WATCHING', 12, 'center', '#e4e1f0');
        inkText(ctx, W / 2, 86, nameOf(specId), Math.round(26 * popScale(1 - camBlend * 0.6)), 'center', SLOTS[slot].pri);
        if (g.pkt.d) inkText(ctx, W / 2, H * 0.4, 'OUT', 56, 'center', '#ff6b7a');
        else if (g.pkt.w) inkText(ctx, W / 2, H * 0.4, 'FINISHED!', 56, 'center', '#ffd43b');
      }
      const still = runners();
      if (!still.length) {
        const done = RACE.allDone();
        inkText(ctx, W / 2, H * 0.52, done ? 'RACE OVER' : 'Waiting for results…',
                Math.round(40 * (done ? popScale(resultsT / 0.2) : 1)), 'center');
      }
      const mine = P.won ? 'You finished' : 'You went out at ' + pct() + '%';
      inkText(ctx, W / 2, H - 52, mine, 15, 'center', P.won ? '#ffd43b' : '#ffffff');
      const hint = (still.length > 1 ? '← →  switch player      ' : '') +
                   'Backspace  ' + (IS_HOST ? 'back to hub — ends the race for everyone' : 'back to hub');
      inkText(ctx, W / 2, H - 24, hint, 13, 'center', '#e4e1f0');
    }

    /* Opens on the select screen, or the lobby online. `useLevel` has already
       pointed everything at the first level so the preview has something to
       draw. */
    useLevel(ORDER[pick]);
    reset(false);
    /* a restart, or Play again off the end card, goes straight back into the
       level you were on; the select screen is the front page */
    if (!ONLINE && api.entry !== 'menu' && Store.opt('gdash', 'lastLevel')) startRun(ORDER[pick]);
    pushHud();

    return {
      resize() { W = api.W; },
      update: update,
      render: render,
      /* Escape on the level select goes back to the hub; in a level it pauses */
      escape() { if (phase === 'select') { api.hub(); return true; } return false; },
      destroy() {
        music.destroy(); try { R.dispose(); } catch (e) {}
        if (hotKey) { try { cv.style.cursor = ''; } catch (e) {} }
        FK.done();
      },
      results(Rs) { FK.showResults(Rs); },
      /* Used by the level checker: the physics is a pure function of a plain
         object, so a search over press timings can play a level start to
         finish without a canvas, a clock or a player. */
      _dev: {
        newSim: newSim, stepSim: stepSim, fixed: FIXED, gl: usingGL,
        soundtrack: music._dev, parsed: PARSED, tracks: TRACKS,
        levels: ORDER, keyframe: keyframe, simFrom: simFrom,
        /* the level under test is chosen here now that the options panel is
           gone; everything else reads through the same aliases the game does */
        use(k) { startRun(k); },
        get len() { return LEN; }, get cols() { return cols; },
        get now() { return P; }, get phase() { return phase; },
        /* the interpolated position the frame is actually drawn from, which is
           what "smooth" means here and so what the check measures */
        get view() { return view; }, get cam() { return camX; },
        get spikes() { return spikeList; }, get orbs() { return orbList; },
        get pads() { return padList; }, get portals() { return portalList; },
        get coins() { return coinList; }, get saws() { return sawList; },
        get spans() { return LDEF.spans; },
        get ghosts() { return ghosts; }, get spec() { return specId; },
        get atlas() { return atlas; }, sprites: SPR,
        set practice(v) { PRACTICE = !!v; }
      }
    };
  }
});
