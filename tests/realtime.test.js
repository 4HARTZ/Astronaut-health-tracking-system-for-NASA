import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost:8084',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Node','MutationObserver'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import('react')).default;
const {render,screen,fireEvent,act,cleanup}=await import('@testing-library/react');
const {default:RealtimeMonitor}=await import('../src/components/RealtimeMonitor.jsx');
const {useHealthStore}=await import('../src/store/useHealthStore.js');
afterEach(cleanup);
test('browser optical demo is explicit, does not claim camera connection or publish fake vitals',async()=>{
 render(React.createElement(RealtimeMonitor));fireEvent.click(screen.getByRole('button',{name:'Preview optical demo'}));
 assert.ok(screen.getByText('DEMO ACTIVE'));assert.ok(screen.getByText('SIMULATED · NOT MEASURED'));assert.equal(useHealthStore.getState().liveVitals.heartRate,null);assert.equal(useHealthStore.getState().liveVitals.isStreaming,false);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Stop optical demo'}))); assert.ok(screen.getByRole('button',{name:'Preview optical demo'}));
});
test('native listener is registered before camera start; zero is valid; face loss clears measurements',async()=>{
 let receive,unsubscribed=false;const calls=[];const bridge={listen:async(_name,callback)=>{calls.push('listen');receive=callback;return ()=>{unsubscribed=true;};},invoke:async command=>{calls.push(command);}};
 render(React.createElement(RealtimeMonitor,{bridge}));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Connect rPPG Feed'})));
 assert.deepEqual(calls,['listen','rppg_start']);assert.ok(screen.getByText('WAITING FOR SAMPLES'));
 await act(async()=>receive({payload:{faceDetected:true,pulseValue:0,estimatedBpm:52,r:102.5,g:105.6,b:111.3,snr:1.85,fps:30}}));
 assert.ok(screen.getByText('CAMERA SAMPLES RECEIVED'));assert.equal(useHealthStore.getState().liveVitals.heartRate,52);assert.equal(useHealthStore.getState().liveVitals.spO2,null);
 await act(async()=>receive({payload:{faceDetected:false}}));assert.ok(screen.getByText('WAITING FOR SAMPLES'));assert.equal(useHealthStore.getState().liveVitals.heartRate,null);assert.equal(useHealthStore.getState().liveVitals.isStreaming,false);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Disconnect rPPG'})));assert.equal(unsubscribed,true);assert.equal(calls.at(-1),'rppg_stop');
});
test('missing pulse or BPM never turns into an invented 72 BPM measurement',async()=>{
 let receive;const bridge={listen:async(_name,callback)=>{receive=callback;return ()=>{};},invoke:async()=>{}};
 render(React.createElement(RealtimeMonitor,{bridge}));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Connect rPPG Feed'})));
 await act(async()=>receive({payload:{faceDetected:true,pulseValue:null,estimatedBpm:72}}));assert.equal(useHealthStore.getState().liveVitals.heartRate,null);
 await act(async()=>receive({payload:{faceDetected:true,pulseValue:1,estimatedBpm:0}}));assert.equal(useHealthStore.getState().liveVitals.heartRate,null);assert.ok(screen.getByText('CAMERA SAMPLES RECEIVED'));
});
