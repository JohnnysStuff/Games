// Optional browser smoke test: NODE_PATH must include Playwright's package.
// Hooks are injected into the served copy only; the shipped game has no cheats.
const fs=require('node:fs'), path=require('node:path'), http=require('node:http');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'), output=path.join(root,'.backups','golf-qa');
fs.mkdirSync(output,{recursive:true});
let html=fs.readFileSync(path.join(root,'games.html'),'utf8');
html=html.replace('  async function restore() {', "  async function restore() { profile = {id:'local-golf-qa',username:'CourseTester'}; return true;");
html=html.replace('    if (!VIEW) VIEW = makeViewFlat();',`    if (!VIEW) VIEW = makeViewFlat();
    window.__golfQA = { courses: COURSES, beginCourse, loadHole,
      state: () => ({hole, courseIdx, phase, strokes, sunk, ending, busy:VIEW.busy(), gl:VIEW.gl, x:ball.x, y:ball.y, vx:ball.vx, rest:ball.rest, len:C && C.len}),
      tour: () => VIEW.toggle(),
      jump: s => { const p=C.frame(s); placeBall(p.x,p.y); VIEW.skip(); VIEW.qaSnap(); },
      locate: k => C.F[k].map(o => k==='tunnel' ? o.sa : o.s),
      putt: () => {VIEW.skip();const f=C.frame(C.near(ball.x,ball.y).s);ball.vx=f.tx*650;ball.vy=f.ty*650;ball.rest=false;ball.gnd=true;strokes++;},
      cup: () => {VIEW.skip();placeBall(C.cup.x,C.cup.y);ball.rest=false;},
      tick: n => {for(let i=0;i<n;i++) inst.update(1/60);},
      finalHole: () => {beginCourse(0); for(let i=0;i<17;i++) scores[i]=HOLES[i].par; loadHole(17);},
      screenPoint: (x,y) => {const r=cv.getBoundingClientRect();return {x:r.left+Stage.ox+x*Stage.scale,y:r.top+Stage.oy+y*Stage.scale};},
      ballPoint: () => {const p=VIEW.toScreen(ball.x,ball.y,ball.z);return window.__golfQA.screenPoint(p.x,p.y);},
      view: () => VIEW,
    };`);
html=html.replace('gl: true, input, render,','gl: true, input, render, qaSnap() { introOn=false; const g=goal(); if(g) Object.assign(cs,g); camStep(1); },');
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='warning' && /Mini golf/.test(m.text())) errors.push(m.text());});
 try {
  await page.goto(`http://127.0.0.1:${server.address().port}/#/golf`);
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(output,'menu.png')});
  // The menu's solo button starts the course picker.
  await page.locator('#gmGo').click();
  await page.waitForFunction(()=>!!window.__golfQA,null,{timeout:10000});
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(output,'courses.png')});
  const assert=require('node:assert/strict');
  const card=await page.evaluate(()=>window.__golfQA.screenPoint(810,413));
  await page.mouse.click(card.x,card.y);
  await page.waitForFunction(()=>window.__golfQA.state().courseIdx===7);
  await page.waitForTimeout(3000);
  await page.evaluate(()=>window.__golfQA.jump(80));
  await page.waitForTimeout(300);
  const aim=await page.evaluate(()=>window.__golfQA.ballPoint());
  await page.mouse.move(aim.x,aim.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.move(aim.x,aim.y+100,{steps:8});
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForFunction(()=>window.__golfQA.state().strokes===1,null,{timeout:20000});
  console.log('PASS: eighth course selection and mouse drag/release putting.');
  const cases=[[0,2,'meadow-mill','mill'],[1,4,'lagoon-tunnel','tunnel'],[6,0,'cedar-valley',null],[7,17,'coastal-finale',null],[4,12,'glacier-mill','mill'],[5,9,'night-tunnel','tunnel'],[2,17,'canyon-finale',null],[3,11,'caldera-bridges',null]];
  for(const [ci,hi,name,feature] of process.env.GOLF_QUICK ? [] : cases) {
    await page.evaluate(([c,h])=>{window.__golfQA.beginCourse(c);window.__golfQA.loadHole(h);},[ci,hi]);
    await page.waitForTimeout(5000);
    await page.evaluate(k=>{const q=window.__golfQA;q.jump(k ? q.locate(k)[0]-240 : 80);},feature);
    await page.waitForTimeout(800);
    const state=await page.evaluate(()=>window.__golfQA.state());
    assert.equal(state.gl,true,name+' WebGL');
    assert.equal(state.hole,hi);
    await page.screenshot({path:path.join(output,name+'.png')});
    console.log('PASS: '+name+' renders in WebGL.');
  }
  // Check a putt moves, then that the eighteenth cup completes the round.
  await page.evaluate(()=>window.__golfQA.finalHole());
  await page.waitForTimeout(5000);
  const before=await page.evaluate(()=>{window.__golfQA.putt();return window.__golfQA.state();});
  await page.evaluate(()=>window.__golfQA.tick(60));
  const after=await page.evaluate(()=>window.__golfQA.state());
  assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>10,'Putt moves');
  await page.evaluate(()=>window.__golfQA.cup());
  await page.evaluate(()=>window.__golfQA.tick(60));
  assert.ok(await page.evaluate(()=>window.__golfQA.state().sunk),'Cup accepts the ball');
  await page.evaluate(()=>window.__golfQA.tick(120));
  assert.ok(await page.evaluate(()=>window.__golfQA.state().ending),'Eighteenth hole ends the round');
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,'round-finish.png')});
  assert.deepEqual(errors,[],'No render errors');
  console.log('PASS: WebGL courses, putt physics, cup capture, 18-hole round completion.');
 } finally {console.log('ERRORS',errors); await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
