/* ============================================================================
   RELEASE — which version this build is, and what changed in each one.

   The top entry is this build: its version is what the page reports, what the
   update check compares against the copy online, and what the "What's new"
   window opens on. Every entry lists what a player would notice, in their
   words, under added / changed / removed / fixed (any of the four may be
   left out). Newest first; tools/build.mjs checks the order and the format,
   stamps the version into the page and writes release/version.json from this.

   To ship an update: put a new entry on top with a higher version and the
   date, build, and publish the release/ folder (see CLAUDE.md, "Releases").
   ========================================================================== */
const CHANGELOG = [
  {
    version: '1.0.7',
    date: '2026-09-27',
    title: 'Beach Volley',
    added: [
      'Beach Volley: a new game. Two on two in the sand against the computer, or one on one: bump, set and spike, block at the net, and dive for the ones out of reach. Rally scoring to 11, 15 or 21, win by two',
      'Beach Volley: hold Z to serve and let go when the meter is right, or hold X for a harder jump serve. Z passes and sets, X jumps to spike or block, and the arrows you hold as you hit it aim a spike',
      'Beach Volley: your partner calls for the balls that are theirs, sets for you when you pass, and spikes what you set',
      'Beach Volley: a ring on the sand shows where the ball is coming down, a line in the sand marks where the net stands, the net lights up where the ball goes over and gives where it hits, and every point is called IN or OUT where it landed',
      'Beach Volley: a crowd on the sand that cheers and waves its towels for its own side, an umpire on her high chair who whistles, signals and points to the next serve, and gulls and a crab that get out of your way',
      'Beach Volley: pick your side\'s colours, and how good the computer is: easy, normal or hard'
    ]
  },
  {
    version: '1.0.6',
    date: '2026-09-27',
    title: 'Ball Brawl, and soccer with friends',
    added: [
      'Ball Brawl: a new game. Pick a ball with a power, aim it, and watch it fight: two balls bounce round a box with nobody steering until one of them breaks',
      'Ball Brawl: twenty-four balls, each growing stronger its own way as it fights: a sword that gets longer, daggers that spin faster, an axe that gets angrier as it is hurt, a bow that fires more arrows, a shield that gets wider, a lance, bombs, a snake whose tail keeps growing, a vampire that heals, ice that slows, a ghost that fades out, and a giant that gets bigger',
      'Ball Brawl: and twelve more: a war hammer that hits harder every time, a spiked flail swung by every bounce, a boomerang that comes back, a laser that charges up and fires across the box, a ninja whose stars bounce off the walls, a wizard whose spells chase you, a blaze that leaves a trail of fire, a tesla coil that shocks anything close, a cactus that sprays needles, a comet that speeds up off every wall, a buzzsaw that grows, and a katana that dashes in to slash',
      'Ball Brawl: every ball is fully modelled, from the sword\'s gold guard to the wizard\'s hat and beard, the ghost\'s wavy sheet and the cactus\'s flower, and the ones with faces look where they are going',
      'Ball Brawl: three hearts each, and a heart breaks for every round lost. Your three cards are dealt face down and turn over one at a time, with one reroll a match, and neither side sees the other\'s ball until the VS',
      'Ball Brawl: against the computer on easy, normal or hard, where your win streak is your score, or one on one online with a friend in your party. Both screens run the same fight, so it plays out with no lag at all',
      'Ball Brawl: The Balls, on the front page, shows all twenty-four: what each one does, its health, damage, speed, reach and win rate, and which balls it does best and worst against',
      'Soccer: play online with your party, up to six of you. The host picks the size and length, then everyone picks their own position, first come, first served: play against each other, or on the same side against the computer, which fills any empty places',
      'Soccer online: your own player moves, dribbles, shoots and tackles the instant you press, your shots, passes, tackles and saves count the way you saw them on your screen, and everyone else glides smoothly, even when the connection hiccups',
      'Soccer: new goal celebrations: the floss, a knee slide, a backflip, the airplane, a robot dance and a muscle flex. Keepers roar and knee-slide too',
      'Soccer: the side that concedes takes it badly: sinking to their knees, flat on their back, hands on their head, stomping, or crying',
      'Soccer: each player picks their own, so a team rarely does the same thing twice, and the final whistle gets the same treatment',
      'Soccer: the stands are full. Fans in each side\'s colours clap the kickoff, jump up and wave scarves and flags when their team scores, and hold their heads when the other team does',
      'Soccer: a referee runs the match from the far touchline, facing you. He sidesteps along it to keep up with play, blows for kickoffs, goals and full time, points back to the middle after a goal, and after a hard tackle waves play on or shows a yellow or even a red card (just for show)'
    ],
    fixed: [
      'Soccer: the player who scores always gets to celebrate, even if they were still following through on the shot',
      'Soccer: a ball taken off a bounce or the chest drops onto your foot instead of jumping there',
      'Online games no longer end with "Host left" when the host pauses and looks at another tab for a while',
      'In someone else\'s party, Play again on the results says the host starts the next game and keeps the results up, instead of leaving the finished game frozen'
    ]
  },
  {
    version: '1.0.5',
    date: '2026-09-26',
    title: 'Soccer, polished',
    added: [
      'Soccer: the controls stay in the bottom-right corner all match, say what Z and X do right now, and press in as you press them',
      'Soccer: confetti in your colours when you score'
    ],
    changed: [
      'Soccer: KICK OFF, GOAL! and FULL TIME stamp in a letter at a time, high over the pitch, instead of covering the players',
      'Soccer: the scoreboard and clock sit above the pitch and light up in the scorers\' colour after a goal',
      'Soccer: the menu slides in piece by piece, a cursor follows what you are choosing, and changing team swaps the kit on a carousel',
      'Soccer: the full-time screen is easier to read, with nothing drawn over anything else'
    ],
    fixed: [
      'Soccer: a ball in the net sits behind the netting instead of on top of it'
    ]
  },
  {
    version: '1.0.4',
    date: '2026-09-26',
    title: 'Soccer',
    added: [
      'Soccer: a new game — quick, non-stop pixel soccer against the computer, 1v1, 2v2 or 3v3. In 2v2 and 3v3 you pick your position, and each side always has one keeper. Pick your team and how long the match lasts',
      'Soccer: no throw-ins and no corners. The ball comes back off the walls, and play only stops for a goal',
      'Soccer: keepers dive across the goal to the far post and the near one, and can catch the ball at full stretch'
    ]
  },
  {
    version: '1.0.3',
    date: '2026-09-25',
    title: 'Watch the rest of the race',
    added: [
      'Crossy Road: once you are out of a race you watch someone still running, like in Geometry Dash — the view follows them until they are out too, then moves on to whoever is left. Left and right switch who you are watching'
    ],
    changed: [
      'Crossy Road: no more race board in the corner — the names over the birds say who is who, and the results show the standings',
      'Crossy Road: everyone in a race sees the same traffic, so the other players dodge the cars you see them dodge',
      'Crossy Road: the results wait until the whole race is over, and then come up with everyone on them'
    ],
    fixed: [
      'A race no longer waits forever for someone who closed the game partway through',
      'Friends who join a party while the results are up wait for the next game instead of being dropped into one that has finished'
    ]
  },
  {
    version: '1.0.2',
    date: '2026-09-25',
    title: 'Better with friends',
    added: [
      'Your friends list says which game each friend is playing right now',
      'A notification when a friend comes online, with an Invite button when you are in a party',
      'A bell button at the top turns friend notifications off and on — on a phone, the switch is at the bottom of your friends list'
    ],
    changed: [
      'In a party everyone follows the host: onto a game\'s menu when they open it, into the match when they start it, and back to the hub when they leave',
      'Crossy Road: the other players hop the way you do, arc and landing and all, instead of sliding along the ground, and pop away when they are out',
      'Crossy Road: in a race everyone starts on a tile of their own, side by side, instead of all on the same spot',
      'Pac-Man: the other players move more smoothly, even on a patchy connection',
      'Paper.io: the other players move more smoothly, even on a patchy connection',
      '8-Ball Pool: the balls roll more smoothly online'
    ],
    fixed: [
      'Starting a new game in a party after going back to the hub sometimes left friends behind, in the hub or on the game\'s menu on their own',
      'The screen waiting for the others to finish could pop up again over the next match',
      'The line under "Run complete" on that screen was cut off partway through',
      'After a match someone walked out of, the next ones stopped waiting for everyone to finish and showed no standings',
      'A friend sitting in the hub for a while could drop off the party list and miss the next game',
      'Your results no longer turn into "Everyone left" when the other player heads back to the hub after the match',
      'Mini Golf: the other players\' balls move smoothly through the air instead of jumping'
    ]
  },
  {
    version: '1.0.1',
    date: '2026-09-25',
    title: 'A clearer What\'s new',
    added: [
      'What\'s new is sorted by game now: every game that changed gets its own card with its picture, so you can see at a glance what changed where'
    ],
    changed: [
      'Every change is labelled New, Changed, Removed or Fixed, in bigger text that is easier to read',
      'Older updates fold down to one line each, so the newest is always on top — click one to open it',
      'The button at the top says What\'s new, with your version next to it, and turns into an Update button when a newer version is out'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-09-25',
    title: 'Updates come to you',
    added: [
      'The arcade now checks for a newer version when you open it, and can download it for you',
      'This What\'s new window, which opens the first time you play each new version. The version button at the top brings it back',
      'All In: 14 new tables — Slide, Pump, Darts, Cases, Diamonds, Bars, Drill, Moles, Snakes, Flip, Rock Paper Scissors, Roulette, Baccarat and Video Poker',
      'All In: Auto betting on 22 tables',
      'Crossy Road: how you go out depends on what got you — flattened on the road, splatted on the side of a lorry and carried off, swatted by a polar bear, swallowed by the sandworm, snapped up by a crocodile',
      'Crossy Road: smoke from the trucks\' exhausts, logs and lily pads that dip when you land on them, ripples, and trees that shake when you walk into them'
    ],
    changed: [
      'Crossy Road: an easier start with much bigger gaps, and every lane keeps its own speed — slow, steady or fast',
      'Crossy Road: when you get hit the world keeps moving until you are gone, and carries on behind the results',
      'All In: Moles and Chicken redrawn from scratch',
      'All In: new dropdowns that match the rest of the casino, and a sharper icon for Snakes'
    ],
    removed: [
      'All In: Tarot, Packs and Lucky Sevens'
    ],
    fixed: [
      'Crossy Road: flickering wheels on the buses, and flickering parts on the trains, the haul trucks, the camper van and the railway signals'
    ]
  }
];
