/* ============================================================================
   REGISTRY — the one list every game is on

   Each game file calls registerGame({ id, title, ..., mount(api) }) as it
   loads, so the order of the game files in src/manifest.json is the hub's
   Featured order. The router looks a game up in byId. README.md has the
   full shape of a definition.
   ========================================================================== */
const GAMES = [];
const byId = {};
function registerGame(def) {
  def.w = def.w || 960; def.h = def.h || 600;
  def.tags = def.tags || [];
  GAMES.push(def); byId[def.id] = def;
}

