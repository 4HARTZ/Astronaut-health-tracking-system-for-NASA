import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost:8083',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Node','MutationObserver'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
let time=0,next=0;const timers=new Map();
Object.defineProperty(performance,'now',{value:()=>time,configurable:true});
const realSetInterval=globalThis.setInterval,realClearInterval=globalThis.clearInterval;
const React=(await import('react')).default;
const {render,screen,fireEvent,act,cleanup}=await import('@testing-library/react');
const {default:BreathingGuide}=await import('../src/components/BreathingGuide.jsx');
afterEach(()=>{cleanup();globalThis.setInterval=realSetInterval;globalThis.clearInterval=realClearInterval;timers.clear();time=0;});
function mount(){globalThis.setInterval=callback=>{timers.set(++next,callback);return next;};globalThis.clearInterval=id=>timers.delete(id);render(React.createElement(BreathingGuide));}
async function tick(ms){await act(async()=>{time+=ms;[...timers.values()].forEach(callback=>callback());});}
test('box breathing has four equal phases, steady holds and skippable holds without adding elapsed time',async()=>{
 mount();fireEvent.click(screen.getByRole('button',{name:'Begin breathing'}));
 for(let i=0;i<4;i++)await tick(1000);assert.ok(screen.getByText('Hold gently'));
 const visual=document.querySelector('.breathing-visual');const full=visual.style.getPropertyValue('--breath-scale');await tick(1000);assert.equal(visual.style.getPropertyValue('--breath-scale'),full);
 fireEvent.click(screen.getByRole('button',{name:'Skip hold'}));assert.ok(screen.getByText('Breathe out'));assert.match(document.body.textContent,/1:55 remaining/);
 for(let i=0;i<4;i++)await tick(1000);assert.ok(screen.getByText('Hold gently'));assert.match(document.body.textContent,/After breathing out/);
 const empty=visual.style.getPropertyValue('--breath-scale');await tick(1000);assert.equal(visual.style.getPropertyValue('--breath-scale'),empty);assert.notEqual(empty,full);
 fireEvent.click(screen.getByRole('button',{name:'Skip hold'}));assert.ok(screen.getByText('Breathe in'));
});
test('text and circle use the same phase; reduced motion is default; paused time is excluded and resume restarts inhale',async()=>{
 mount();fireEvent.change(screen.getByLabelText('Breathing method'),{target:{value:'gentle'}});assert.ok(screen.getByRole('button',{name:'Circle movement: off'}));fireEvent.click(screen.getByRole('button',{name:'Begin breathing'}));
 assert.ok(screen.getByText('Breathe in'));for(let i=0;i<8;i++)await tick(500);assert.ok(screen.getByText('Breathe out'));
 fireEvent.click(screen.getByRole('button',{name:'Pause guide'}));assert.equal(timers.size,0);await tick(10000);
 fireEvent.click(screen.getByRole('button',{name:'Resume guide'}));assert.ok(screen.getByText('Breathe in'));assert.match(document.body.textContent,/1:56 remaining/);
 fireEvent.blur(window);assert.ok(screen.getByRole('button',{name:'Resume guide'}));assert.equal(timers.size,0);
});
test('guide ends without a score and a timing stall pauses instead of skipping breathing cues',async()=>{
 mount();fireEvent.change(screen.getByLabelText('Guide length'),{target:{value:'60'}});fireEvent.click(screen.getByRole('button',{name:'Begin breathing'}));
 for(let i=0;i<60;i++)await tick(1000);assert.ok(screen.getByText('Rest here'));assert.equal(timers.size,0);assert.ok(screen.getByRole('button',{name:'Begin again'}));
 fireEvent.click(screen.getByRole('button',{name:'Begin again'}));await tick(2000);assert.ok(screen.getByRole('button',{name:'Resume guide'}));assert.match(document.body.textContent,/Guide paused/);
 fireEvent.click(screen.getByRole('button',{name:'Stop session'}));assert.equal(timers.size,0);assert.ok(screen.getByRole('button',{name:'Begin breathing'}));
});
