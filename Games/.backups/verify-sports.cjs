// Isolated canvas verification. No DOM, browser, network or page initialization.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {createCanvas}=require('C:/Users/johnt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const html=fs.readFileSync('games.html','utf8');
const games={};let clock=1000;
const sandbox={console,performance:{now:()=>clock},Math,registerGame:g=>games[g.id]=g,
 getRace:()=>null,getSession:()=>null,NetBuf:()=>({}),Gfx3D:{get:()=>null,groundInput:i=>i},
 Sound:new Proxy({},{get:()=>()=>{}})};
vm.createContext(sandbox);
vm.runInContext(html.slice(html.indexOf('const TAU ='),html.indexOf('function shade(')),sandbox);
vm.runInContext(html.slice(html.indexOf('const P = {\n  board:'),html.indexOf('/* ---- multiplayer helpers shared')),sandbox);
const mul=html.indexOf('function mulberry(');
vm.runInContext(html.slice(mul,html.indexOf('\n}',mul)+2),sandbox);
const shade=html.indexOf('function shade(');
vm.runInContext(html.slice(shade,html.indexOf('\n}',shade)+2),sandbox);
for(const id of ['golf','pool']){
 const start=html.indexOf("registerGame({\n  id: '"+id+"'");
 const end=html.indexOf('\n});',start)+4;
 let source=html.slice(start,end);
 if(id==='pool')source=source.replace('    return {\n      update(dt)', '    return {\n      testGroups() { groups = ["solid", "stripe"]; },\n      testLongNames() { PLAYERS[0].name = "A very long multiplayer player name"; PLAYERS[1].name = "Another extremely long opponent name"; },\n      update(dt)');
 vm.runInContext(source,sandbox);
}
fs.mkdirSync('.backups/sports-previews',{recursive:true});
function setup(id){
 let click=null;const input={get clicks(){return click?[click]:[]},pointer:{x:480,y:320,down:false,inside:true},any:()=>false,down:()=>false,pressed:()=>false,takeClick:()=>{const c=click;click=null;return c},takeMoves:()=>[]};
 let hud={}; const api={input,opt:k=>k==='gfx'?'flat':null,hud:h=>hud=h,shake:()=>{},gameOver:()=>{},fx:{burst:()=>{}}};
 const instance=games[id].mount(api),canvas=createCanvas(960,600),native=canvas.getContext('2d');
 // Native Skia's CSS font parser needs discrete weights; browsers support the original values.
 const ctx=new Proxy(native,{get:(o,k)=>typeof o[k]==='function'?o[k].bind(o):o[k],set:(o,k,v)=>{if(k==='font')v=v.replace(/^(\d+) /,(_,w)=>Math.round(Number(w)/100)*100+' ');o[k]=v;return true}});
 const step=(frames=1)=>{for(let i=0;i<frames;i++){clock+=1000/60;instance.update(1/60);instance.render(ctx)}};
 return {instance,canvas,ctx,input,step,click:p=>click=p,hud:()=>hud,save:name=>fs.writeFileSync('.backups/sports-previews/'+name+'.png',canvas.toBuffer('image/png'))};
}
const golf=setup('golf');golf.step(80);golf.save('golf-courses');
for(let i=0;i<6;i++){
 const g=setup('golf');g.step(65);g.click({x:180+(i%3)*300,y:230+Math.floor(i/3)*206});g.step(160);
 assert.strictEqual(g.hud().Hole,'1/8');
 if(i===0){
  g.save('golf-playing');
  g.input.pressed=k=>k==='KeyV';g.step();g.input.pressed=()=>false;g.step(30);g.save('golf-overview');
  g.input.pressed=k=>k==='KeyV';g.step();g.input.pressed=()=>false;g.step(30);
  g.click({x:80,y:0});g.input.pointer={x:-40,y:0,down:true,inside:true};g.step(30);g.save('golf-power');
  g.input.pointer.down=false;g.step();assert.strictEqual(g.hud().Strokes,1);
 }
 if(i===4)g.save('golf-ice');
 g.instance.destroy();
}
const pool=setup('pool');pool.step(60);pool.save('pool-ready');
pool.input.pointer={x:720,y:328,down:false,inside:true};pool.step();
pool.input.pointer.down=true;pool.step();pool.input.pointer.x-=100;pool.step(35);pool.save('pool-power');
pool.input.pointer.down=false;pool.step(90);assert(pool.hud().Shots>0);pool.save('pool-after-shot');
const rack=setup('pool');rack.instance.testGroups();rack.instance.testLongNames();rack.step(60);rack.save('pool-groups');
const roster=[{id:'a',name:'Alex',me:true},{id:'b',name:'Blair'},{id:'c',name:'Casey'},{id:'d',name:'Drew'}];
sandbox.getRace=()=>({cfg:{players:roster},me:'a',peers:{b:{ph:'v',v:0},c:{ph:'v',v:0}},list:()=>roster,post:()=>{},board:{}});
const vote=setup('golf');vote.step(65);vote.click({x:180,y:230});vote.step(50);vote.save('golf-voting');
console.log('PASS: all six golf courses select and render; multiplayer voting renders; pool aims, charges, shoots and renders; player group rails and long names render.');
// Exercise the actual start markup with a minimal shell; keep other games on their existing menu.
sandbox.Store={best:()=>0,opt:()=>null};sandbox.panelEl={innerHTML:''};sandbox.ovEl={classList:{add:()=>{}}};
sandbox.wireOpts=()=>{};sandbox.start=()=>{};const button={};sandbox.el=()=>button;
for(const [name,next] of [['optionsHTML','/* The start panel'],['showStart','function wireOpts']]){
 const a=html.indexOf('function '+name+'('),b=html.indexOf(next,a);vm.runInContext(html.slice(a,b),sandbox);
}
for(const id of ['golf','pool','pong']){
 sandbox.cur=games[id]||{id:'pong',title:'Pong',tagline:'Original description'};
 vm.runInContext('showStart()',sandbox);
 assert.strictEqual(button.onclick,sandbox.start);
 assert(sandbox.panelEl.innerHTML.includes(id==='golf'?'Choose course':id==='pool'?'Play pool':'Original description'));
 assert.strictEqual(sandbox.panelEl.innerHTML.includes('sports-intro'),id!=='pong');
}
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(!/src=|application\//.test(m[1]))new vm.Script(m[2]);
}
console.log('PASS: golf, pool and ordinary start-menu markup and actions; full JavaScript syntax.');
