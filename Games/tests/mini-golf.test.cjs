const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'games.html'), 'utf8');
for (const [, attrs, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!attrs.includes('src=') && !attrs.includes('application/')) new vm.Script(source);
}
const start = html.indexOf('    const THEMES =', html.indexOf("id: 'golf'"));
const end = html.indexOf('    /* ------------------------------------------------------- state', start);
const world = vm.runInNewContext(html.slice(start, end) + '\n({COURSES, THEMES, compile, stretchHole, routeLength})', {
  clamp: (v,a,b) => Math.max(a,Math.min(b,v)), lerp: (a,b,t) => a+(b-a)*t
});
assert.equal(world.COURSES.length, 8);
let holes = 0, shortest = Infinity, longest = 0, tunnels = 0, mills = 0;
for (const course of world.COURSES) {
  assert.equal(course.holes.length,18, course.name);
  assert.equal(new Set(course.holes.map(h=>h.n)).size,18, 'Unique hole names');
  for (const [i, def] of course.holes.entries()) {
    const label = `${course.name} / ${i+1} ${def.n}`;
    const C = world.compile(def,world.THEMES[course.th],9001+i*137);
    assert.ok(C.len >= 1800, label + ' is a long hole');
    shortest=Math.min(shortest,C.len); longest=Math.max(longest,C.len);
    assert.ok(C.par >= 3 && C.par <= 8,label+' par');
    for(const f of def.f || []) {
      assert.ok(f[1] > 0 && f[1] < C.len,label+' feature station '+f);
      if(f[0]==='tunnel' || f[0]==='bank') assert.ok(f[2]>f[1] && f[2]<C.len,label+' feature end');
    }
    for(let s=0;s<=C.len;s+=25) {
      const p=C.frame(s), q=C.near(p.x,p.y);
      for(const z of [C.H(p.x,p.y),C.land(p.x,p.y),p.z,q.s]) assert.ok(Number.isFinite(z),label+' finite surface');
      assert.ok(q.e < 0,label+' connected lane');
    }
    for(const s of [C.teeS,C.cup.s]) {
      const p=C.frame(s);
      assert.ok(!C.inSand(p.x,p.y),label+' clear tee/cup');
      for(const c of C.F.creek) assert.ok(C.creekD(c,p.x,p.y).dl>c.w/2+30,label+' dry tee/cup');
    }
    for(const t of C.F.tunnel) {
      tunnels++;
      assert.ok(t.L>0 && t.u1>t.u0+40,label+' useful open tunnel');
      for(let u=t.u0+10;u<t.u1;u+=20) assert.ok(Number.isFinite(C.tunZ(t,u)),label+' tunnel floor');
    }
    for(const c of C.F.creek) for(const b of c.br) {
      const p=C.at(c.s,b.t);
      assert.ok(C.laneZ(...p)>c.level,label+' dry bridge deck');
      assert.ok(Math.abs(b.t)+b.w/2<C.hw+2,label+' bridge fits lane');
    }
    mills+=C.F.mill.length; holes++;
  }
}
// Stretching cannot lengthen the airborne gap or the physical ramp.
const original={n:'jump',par:3,w:300,p:[[0,0,0],[1500,0,0]],f:[['ramp',520,120,26],['creek',700,110]]};
const stretched=world.stretchHole(original,1.65);
assert.equal(stretched.f[1][1]-stretched.f[0][1],180);
assert.equal(stretched.f[0][2],120);
console.log(JSON.stringify({holes,courses:8,shortest:Math.round(shortest),longest:Math.round(longest),tunnels,mills,syntax:'passed',geometry:'passed'},null,2));
