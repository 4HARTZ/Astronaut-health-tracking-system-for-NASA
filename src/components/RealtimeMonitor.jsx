import React, { useEffect, useRef, useState } from 'react';
import { 
  Activity, 
  Camera, 
  Bluetooth, 
  Play, 
  Pause, 
  CheckCircle2, 
  Radio
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore.js';

export default function RealtimeMonitor({ bridge = null }) {
  const native = Boolean(bridge || (typeof window !== 'undefined' && window.__TAURI_INTERNALS__));
  const [isRunning, setIsRunning] = useState(true);
  const [heartRate, setHeartRate] = useState(null);
  const [rppgConnected, setRppgConnected] = useState(false);
  const [rppgTelemetry, setRppgTelemetry] = useState(null);
  const [rppgStatusMsg, setRppgStatusMsg] = useState('Standby · No camera samples');
  const [hasLiveSample, setHasLiveSample] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const canvasRef=useRef(null), samples=useRef([]), unlistenRef=useRef(null), lastSample=useRef(null), running=useRef(isRunning), owner=useRef(null), generation=useRef(0);
  running.current=isRunning;
  const demo=rppgConnected&&!native, live=rppgConnected&&native&&hasLiveSample;
  const displayHeartRate=demo?68:live?heartRate:null;
  const setStoreLiveVitals=useHealthStore(s=>s.setLiveVitals);
  const getBridge=async()=>bridge||{...await import('@tauri-apps/api/core'),...await import('@tauri-apps/api/event')};

  async function toggleRppg(){
    if(connecting)return;
    if(rppgConnected){
      generation.current++;unlistenRef.current?.();unlistenRef.current=null;
      try{await owner.current?.invoke('rppg_stop');}catch(error){setHasLiveSample(false);setHeartRate(null);samples.current=[];setRppgStatusMsg(`Stop error: ${error}. Retry disconnecting.`);return;}
      owner.current=null;setRppgConnected(false);setHasLiveSample(false);setRppgTelemetry(null);setHeartRate(null);lastSample.current=null;samples.current=[];setRppgStatusMsg('Standby · Disconnected');return;
    }
    samples.current=[];
    if(!native){setRppgConnected(true);setRppgStatusMsg('Optical waveform demo · No camera is connected');return;}
    const request=++generation.current;setConnecting(true);setRppgStatusMsg('Starting camera sidecar · Waiting for samples');
    let api,unlisten;
    try{
      api=await getBridge();
      unlisten=await api.listen('rppg-telemetry',event=>{
        if(generation.current!==request)return;
        const data=event.payload;
        const valid=data?.faceDetected===true&&Number.isFinite(data.pulseValue);
        setHasLiveSample(valid);setRppgTelemetry(data||null);
        if(!valid){setHeartRate(null);samples.current=[];lastSample.current=null;setRppgStatusMsg(data?.faceDetected?'Face detected · Waiting for pulse samples':'Searching for face · No pulse samples');return;}
        const now=performance.now();lastSample.current=now;
        setHeartRate(Number.isFinite(data.estimatedBpm)&&data.estimatedBpm>0?Math.round(data.estimatedBpm):null);
        setRppgStatusMsg(`Face detected · R:${data.r??'—'} G:${data.g??'—'} B:${data.b??'—'} · SNR:${data.snr??'—'}`);
        if(running.current){samples.current.push({at:now,value:data.pulseValue});if(samples.current.length>500)samples.current.shift();}
      });
      await api.invoke('rppg_start',{camera:'0'});
      if(generation.current!==request){unlisten();await api.invoke('rppg_stop');return;}
      owner.current=api;unlistenRef.current=unlisten;setRppgConnected(true);
    }catch(error){unlisten?.();if(generation.current===request){setHasLiveSample(false);setRppgStatusMsg(`Camera connection error: ${error}`);}}
    finally{if(generation.current===request)setConnecting(false);}
  }
  useEffect(()=>()=>{generation.current++;unlistenRef.current?.();owner.current?.invoke('rppg_stop').catch(()=>{});setStoreLiveVitals({heartRate:null,spO2:null,respiration:null,perfusionIndex:null,isStreaming:false,leadStatus:'No active monitor'});},[setStoreLiveVitals]);
  useEffect(()=>{
    if(!native||!rppgConnected)return;
    const timer=setInterval(()=>{if(lastSample.current!==null&&performance.now()-lastSample.current>2000){setHasLiveSample(false);setHeartRate(null);samples.current=[];setRppgStatusMsg('Stream interrupted · Waiting for fresh camera samples');}},500);
    return ()=>clearInterval(timer);
  },[native,rppgConnected]);
  useEffect(()=>{
    // Preview values must never be published as measured vital signs.
    setStoreLiveVitals({heartRate:live?heartRate:null,spO2:null,respiration:null,perfusionIndex:null,isStreaming:live&&isRunning,leadStatus:demo?'Optical demo (not measured)':live?'rPPG samples received':'No live optical samples'});
  },[heartRate,live,demo,isRunning,setStoreLiveVitals]);

  useEffect(()=>{
    if(globalThis.IS_REACT_ACT_ENVIRONMENT||window.IS_REACT_ACT_ENVIRONMENT)return;
    const canvas=canvasRef.current;if(!canvas)return;
    let ctx;try{ctx=canvas.getContext('2d');}catch{return;}if(!ctx)return;
    let frame,lastDemo=0,demoStep=0;
    function render(now){
      if(demo&&isRunning&&now-lastDemo>=1000/30){
        lastDemo=now;demoStep++;
        // An illustrative optical-style signal, never an ECG fallback or camera measurement.
        const t=demoStep/30;
        const value=12*Math.sin(t*.7)+5*Math.sin(t*1.9)+2*Math.sin(t*2*Math.PI*68/60)+.6*Math.sin(t*17);
        samples.current.push({at:now,value});if(samples.current.length>500)samples.current.shift();
      }
      const width=canvas.width,height=canvas.height;
      ctx.fillStyle='#080d18';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#111e33';ctx.lineWidth=1;ctx.beginPath();
      for(let x=0;x<width;x+=40){ctx.moveTo(x,0);ctx.lineTo(x,height);}for(let y=0;y<height;y+=30){ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();
      const points=samples.current;
      if(points.length){
        const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),span=Math.max(1,max-min),center=(max+min)/2;
        const y=value=>height/2-(value-center)/span*(height*.65);
        const start=points[0].at,windowMs=Math.max(500/30*1000,points.at(-1).at-start);
        ctx.strokeStyle='#10b981';ctx.shadowColor='#10b981';ctx.shadowBlur=7;ctx.lineWidth=2;ctx.beginPath();
        points.forEach((point,i)=>{const x=(point.at-start)/windowMs*width;if(i===0||point.at-points[i-1].at>500)ctx.moveTo(x,y(point.value));else ctx.lineTo(x,y(point.value));});ctx.stroke();ctx.shadowBlur=0;
        const head=points.at(-1);ctx.fillStyle='#34d399';ctx.beginPath();ctx.arc((head.at-start)/windowMs*width,y(head.value),3,0,Math.PI*2);ctx.fill();
      }else{ctx.fillStyle='#8f98a0';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText(rppgConnected?'Waiting for optical samples':'Connect a camera in the desktop app, or preview the optical demo',width/2,height/2);}
      frame=requestAnimationFrame(render);
    }
    frame=requestAnimationFrame(render);return ()=>cancelAnimationFrame(frame);
  },[demo,rppgConnected,isRunning]);

  return (
    <section className="space-y-6">
      {/* Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-[4px] bg-[#16202d] border border-[#2a475e]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#66c0f4] font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#66c0f4]" />
            {demo?'OPTICAL WAVEFORM DEMO · NOT A CAMERA MEASUREMENT':live?'LIVE rPPG OPTICAL SAMPLES':'rPPG OPTICAL WAVEFORM · WAITING FOR SOURCE'}
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Real-Time Physiological Telemetry</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[3px] text-xs font-semibold ${
              isRunning ? 'bg-[#212c3d] text-[#e58e26] border border-[#e58e26]/40' : 'bg-[#5c7e10]/30 text-[#a4d007] border border-[#a4d007]/40'
            }`}
          >
            {isRunning ? <><Pause className="w-3.5 h-3.5" /> Pause Stream</> : <><Play className="w-3.5 h-3.5" /> Resume Stream</>}
          </button>
          <span className="text-xs font-mono px-3 py-1.5 rounded-[3px] bg-[#101822] text-[#8f98a0] border border-[#2a475e]">
            {demo?'DEMO: 30 HZ':`REPORTED FPS: ${live&&Number.isFinite(rppgTelemetry?.fps)?rppgTelemetry.fps:'—'}`}
          </span>
        </div>
      </div>

      {/* Main Waveform Monitor */}
      <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] relative overflow-hidden shadow-sm">
        <div className="flex flex-wrap gap-2 justify-between items-center mb-3 px-1">
          <span className="text-xs font-mono text-[#8f98a0] flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${rppgConnected ? 'bg-[#a4d007]' : 'bg-[#66c0f4]'}`}></span>
            {demo?'SOURCE: OPTICAL DEMO':live?'SOURCE: CAMERA rPPG PULSE':'SOURCE: NOT CONNECTED / NO SAMPLES'}
          </span>
          <span className={`text-xs font-mono ${rppgConnected ? 'text-[#a4d007]' : 'text-[#66c0f4]'} font-semibold`}>
            {demo?'SIMULATED · NOT MEASURED':live?'CAMERA SAMPLES RECEIVED':'WAITING FOR SIGNAL'}
          </span>
        </div>

        <canvas
          aria-label="Optical signal waveform; relative amplitude with automatic scaling"
          ref={canvasRef}
          width={1100}
          height={240}
          className="w-full h-56 rounded-[3px] bg-[#101822] border border-[#2a475e] block"
        />

        <p className="text-xs text-[#8f98a0] mt-3">Relative amplitude · auto-scaled · no ECG shaping. {demo?'Illustrative waveform and demo values only. No camera access in this browser preview.':'Only incoming camera samples are plotted. Signal quality and clinical validity are not established.'}</p>
        {/* Live Gauges Overlay */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Heart Rate</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-bold font-mono ${rppgConnected ? 'text-[#a4d007]' : 'text-[#66c0f4]'}`}>
                {displayHeartRate??'—'}
              </span>
              <span className="text-xs text-[#8f98a0] font-mono">BPM</span>
            </div>
            <div className="text-xs text-[#a4d007] mt-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {demo?'Demo value':live?'Camera estimate · unreviewed':'Not measured'}
            </div>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Oxygen Saturation</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-[#a4d007]">{demo?98:'—'}</span>
              <span className="text-xs text-[#8f98a0] font-mono">% SpO₂</span>
            </div>
            <div className="text-xs text-[#8f98a0] mt-1.5">{demo?'Demo value':'Not supplied by camera'}</div>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Respiration Rate</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-[#66c0f4]">{demo?14:'—'}</span>
              <span className="text-xs text-[#8f98a0] font-mono">BrPM</span>
            </div>
            <div className="text-xs text-[#8f98a0] mt-1.5">{demo?'Demo value':'Not supplied by camera'}</div>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Perfusion Index</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-[#c6d4df]">{demo?'4.8':'—'}</span>
              <span className="text-xs text-[#8f98a0] font-mono">PI %</span>
            </div>
            <div className="text-xs text-[#a4d007] mt-1.5">{demo?'Demo value':'Not supplied by camera'}</div>
          </div>
        </div>
      </div>

      {/* Sensor Feeds & rPPG Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* rPPG Optical Sensor Panel */}
        <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-[#66c0f4]" />
              <h3 className="text-sm font-bold text-white m-0">Contactless rPPG Camera Feed</h3>
            </div>
            <span className={`px-2.5 py-1 rounded-[3px] text-[10px] font-mono ${
              rppgConnected ? 'bg-[#5c7e10]/30 text-[#a4d007] border border-[#a4d007]/40' : 'bg-[#101822] text-[#8f98a0] border border-[#2a475e]'
            }`}>
              {demo?'DEMO ACTIVE':live?'SAMPLES RECEIVED':rppgConnected?'WAITING FOR SAMPLES':'STANDBY'}
            </span>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed m-0">
            {native?'Desktop camera pipeline: ':'Browser preview: camera sidecar requires the desktop app. '}<code className="text-[#66c0f4] bg-[#101822] px-1.5 py-0.5 rounded-[2px] border border-[#2a475e]">rppg/rppg_streamer.py</code>. Uses MediaPipe Face Landmarker to extract RGB micro-pulsations from facial capillaries and calculates real-time pulse.
          </p>

          <div className="p-3.5 rounded-[3px] bg-[#101822] border border-[#2a475e] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <div className="text-[#8f98a0]">Status: <span className="text-[#c6d4df]">{rppgStatusMsg}</span></div>
              <div className="text-[#626d78] text-[11px] mt-1">ROI: Forehead &amp; Bilateral Cheeks</div>
            </div>
            <button
              type="button"
              onClick={toggleRppg}
              disabled={connecting}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] transition ${
                rppgConnected
                  ? '!bg-[#d9534f]/20 !text-[#d9534f] !border-[#d9534f]/40'
                  : '!bg-[#212c3d] !text-[#66c0f4] !border-[#3d4f68] hover:!text-white'
              }`}
            >
              {connecting?'Connecting…':rppgConnected?(demo?'Stop optical demo':'Disconnect rPPG'):native?'Connect rPPG Feed':'Preview optical demo'}
            </button>
          </div>
        </div>

        {/* Hardware Sensor Bridge */}
        <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bluetooth className="w-4 h-4 text-[#66c0f4]" />
              <h3 className="text-sm font-bold text-white m-0">Wearable &amp; Hardware Sensor Hub</h3>
            </div>
            <span className="px-2.5 py-1 rounded-[3px] text-[10px] font-mono bg-[#5c7e10]/30 text-[#a4d007] border border-[#a4d007]/40">
              NOT CONNECTED
            </span>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed m-0">
            Direct serial / Bluetooth Low Energy channel for astronaut vital patches, pulse oximeters, and flight biomedical harnesses.
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5 rounded-[3px] bg-[#101822] border border-[#2a475e]">
              <span className="text-[#c6d4df]">Crew Wearable Vital Patch (BLE #1)</span>
              <span className="text-[#a4d007]">No device connected</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-[3px] bg-[#101822] border border-[#2a475e]">
              <span className="text-[#c6d4df]">Digital Pulse Oximeter (USB-Serial)</span>
              <span className="text-[#a4d007]">No device connected</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
