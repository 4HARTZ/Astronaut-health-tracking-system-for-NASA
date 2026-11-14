import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost:8080',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Node','MutationObserver'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.assign(globalThis,{innerWidth:1000,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:true}),IS_REACT_ACT_ENVIRONMENT:true});
let time=0,next=0;const callbacks=new Map();
Object.defineProperty(performance,'now',{value:()=>time,configurable:true});
globalThis.requestAnimationFrame=cb=>{callbacks.set(++next,cb);return next;};globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
const React=(await import('react')).default;
const {render,screen,fireEvent,act,cleanup}=await import('@testing-library/react');
const {default:CognitiveGames}=await import('../src/components/CognitiveGames.jsx');
afterEach(()=>{cleanup();callbacks.clear();time=0;});
async function advance(amount){for(let end=time+amount;time<end;){await act(async()=>{time=Math.min(time+500,end);const pending=[...callbacks.values()];callbacks.clear();pending.forEach(cb=>cb(time));});}}
async function click(name){await act(async()=>fireEvent.click(screen.getByRole('button',{name,exact:true})));}
async function mount(){const saved=new Map();const repository={cognitiveSessions:async()=>[...saved.values()],saveCognitiveSession:async s=>saved.set(s.id,structuredClone(s))};await act(async()=>render(React.createElement(CognitiveGames,{repository})));return saved;}
test('practice gates scored sessions; repeated keys are ignored; focus loss saves an interrupted attempt',async()=>{
 const saved=await mount();assert.equal(screen.getByRole('button',{name:'Start Signal Watch'}).disabled,true);
 await click('Practice Signal Watch');await advance(20000);assert.equal(saved.size,0);assert.equal(screen.getByRole('button',{name:'Start Signal Watch'}).disabled,false);
 await click('Start Signal Watch');await act(async()=>fireEvent.keyDown(window,{code:'Space',key:' ',repeat:true}));await advance(1500);
 await act(async()=>fireEvent.keyDown(window,{code:'Space',key:' '}));
 await act(async()=>fireEvent.blur(window));
 const s=[...saved.values()][0];assert.equal(s.status,'interrupted');assert.equal(s.trials[0].response,'respond');assert.equal(s.earlyResponses.length,0);assert.match(s.reason,/focus/);
});
test('position practice has two unscored presentations, records both choice types, and enables scored play',async()=>{
 const saved=await mount();fireEvent.change(screen.getByLabelText('Activity'),{target:{value:'position'}});await click('Practice Position Match');
 await advance(1500);assert.match(document.body.textContent,/first two presentations are unscored/);await advance(6000);
 await act(async()=>fireEvent.keyDown(window,{key:'m'}));await advance(3000);await act(async()=>fireEvent.keyDown(window,{key:'d'}));await advance(15000);
 assert.equal(screen.getByRole('button',{name:'Start Position Match'}).disabled,false);assert.equal(saved.size,0);
 await click('Start Position Match');await advance(1500);await click('Exit activity');const s=[...saved.values()][0];assert.equal(s.status,'interrupted');assert.equal(s.trials[0].eligible,false);assert.equal(s.task,'position');
});
test('a browser timing stall ends the attempt rather than generating misleading timing',async()=>{
 await mount();await click('Practice Signal Watch');await act(async()=>{time+=2000;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(cb=>cb(time));});assert.match(document.body.textContent,/browser timing gap/);assert.equal(screen.getByRole('button',{name:'Start Signal Watch'}).disabled,true);
});
test('full position session completes with 38 eligible trials and persists unanswered trials',async()=>{
 const saved=await mount();fireEvent.change(screen.getByLabelText('Activity'),{target:{value:'position'}});await click('Practice Position Match');await advance(25500);
 await click('Start Position Match');await advance(121500);const s=[...saved.values()][0];assert.equal(s.status,'completed');assert.equal(s.trials.length,40);assert.equal(s.trials.filter(t=>t.eligible).length,38);assert.ok(s.trials.every(t=>t.response===null));
});
test('pointer responses are accepted once and full signal session completes',async()=>{
 const saved=await mount();fireEvent.change(screen.getByLabelText('Response controls'),{target:{value:'pointer'}});await click('Practice Signal Watch');await advance(20000);await click('Start Signal Watch');await advance(1500);
 await act(async()=>{const button=screen.getByRole('button',{name:'Respond',exact:true});fireEvent.pointerDown(button,{pointerType:'touch'});fireEvent.click(button,{detail:1});});
 await advance(178500);const s=[...saved.values()][0];assert.equal(s.status,'completed');assert.equal(s.trials[0].response,'respond');assert.equal(s.earlyResponses.length,0);assert.equal(s.context.input,'pointer');
});
