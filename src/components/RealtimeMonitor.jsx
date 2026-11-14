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

export default function RealtimeMonitor() {
  const [isRunning, setIsRunning] = useState(true);
  const [heartRate, setHeartRate] = useState(68);
  const [spO2, setSpO2] = useState(98);
  const [respiration, setRespiration] = useState(14);
  const [rppgConnected, setRppgConnected] = useState(false);
  const [rppgTelemetry, setRppgTelemetry] = useState(null);
  const [rppgStatusMsg, setRppgStatusMsg] = useState('Standby · Click to connect camera');
  
  const canvasRef = useRef(null);
  const unlistenRef = useRef(null);
  const livePulseRef = useRef(0);
  const setStoreLiveVitals = useHealthStore((s) => s.setLiveVitals);

  // Toggle rPPG sidecar process
  async function toggleRppg() {
    const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

    if (!rppgConnected) {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const { listen } = await import('@tauri-apps/api/event');

          setRppgStatusMsg('Starting MediaPipe optical sidecar...');
          await invoke('rppg_start', { camera: "0" });

          const unlisten = await listen('rppg-telemetry', (event) => {
            const data = event.payload;
            if (data.faceDetected) {
              setHeartRate(Math.round(data.estimatedBpm || 72));
              setRppgTelemetry(data);
              setRppgStatusMsg(`Face locked · R:${data.r} G:${data.g} B:${data.b} · SNR:${data.snr}`);
              if (data.pulseValue != null) {
                livePulseRef.current = data.pulseValue;
              }
            } else {
              setRppgStatusMsg('Searching for astronaut face...');
            }
          });

          unlistenRef.current = unlisten;
          setRppgConnected(true);
        } catch (err) {
          console.warn('Tauri rPPG sidecar start error:', err);
          setRppgStatusMsg(`Error: ${err}`);
        }
      } else {
        // Web / simulation preview fallback
        setRppgConnected(true);
        setRppgStatusMsg('Optical stream active (Synthesized capillary signal)');
      }
    } else {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('rppg_stop');
        } catch (err) {
          console.warn('Tauri rPPG stop error:', err);
        }
      }
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      setRppgConnected(false);
      setRppgTelemetry(null);
      setRppgStatusMsg('Standby · Disconnected');
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) unlistenRef.current();
    };
  }, []);

  // Update Zustand global store
  useEffect(() => {
    setStoreLiveVitals({
      heartRate,
      spO2,
      respiration,
      perfusionIndex: 4.8,
      isStreaming: isRunning,
      leadStatus: rppgConnected ? 'rPPG Optical Active' : 'Simulated Lead II',
    });
  }, [heartRate, spO2, respiration, isRunning, rppgConnected, setStoreLiveVitals]);

  // Draw smooth real-time simulated ECG/PPG telemetry on HTML5 Canvas
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.IS_REACT_ACT_ENVIRONMENT || globalThis.IS_REACT_ACT_ENVIRONMENT)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      // JSDOM environment without canvas support
    }
    if (!ctx) return;

    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
    const caf = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id) => clearTimeout(id);

    let animationFrameId;
    let step = 0;
    const dataPoints = [];
    const maxPoints = 500;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      step += 1;
      const cycle = step % 60;
      let val = 0;

      if (rppgConnected && livePulseRef.current) {
        // Direct rPPG pulse wave
        val = livePulseRef.current * 3.5;
      } else {
        // ECG waveform with P-Q-R-S-T peaks
        if (cycle === 12) val = 8;      // P wave
        else if (cycle === 16) val = -5; // Q
        else if (cycle === 18) val = 42; // R peak
        else if (cycle === 20) val = -12;// S
        else if (cycle === 28) val = 12; // T wave
        else val = (Math.random() - 0.5) * 2; // baseline micro-noise
      }

      dataPoints.push(mid - val);
      if (dataPoints.length > maxPoints) dataPoints.shift();

      // Clear with subtle sweep trail
      ctx.fillStyle = '#080d18';
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = '#111e33';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw ECG / PPG Waveform
      ctx.strokeStyle = rppgConnected ? '#10b981' : '#06b6d4';
      ctx.shadowColor = rppgConnected ? '#10b981' : '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < dataPoints.length; i++) {
        const x = (i / maxPoints) * width;
        const y = dataPoints[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw sweeping lead head
      const leadX = (dataPoints.length / maxPoints) * width;
      ctx.fillStyle = rppgConnected ? '#34d399' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(leadX, dataPoints[dataPoints.length - 1] || mid, 4, 0, Math.PI * 2);
      ctx.fill();

      // Subtle vital fluctuations when in pure simulation mode
      if (!rppgConnected && step % 40 === 0) {
        setHeartRate(prev => Math.min(85, Math.max(62, prev + Math.floor((Math.random() - 0.5) * 3))));
      }

      animationFrameId = raf(render);
    };

    if (isRunning) {
      render();
    }

    return () => caf(animationFrameId);
  }, [isRunning, rppgConnected]);

  return (
    <section className="space-y-6">
      {/* Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-[4px] bg-[#16202d] border border-[#2a475e]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#66c0f4] font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#66c0f4]" />
            {rppgConnected ? 'LIVE rPPG OPTICAL WAVEFORM · FACIAL CAPILLARY PULSE' : 'LIVE TELEMETRY STREAM · LEAD II'}
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
            SAMPLING: {rppgTelemetry?.fps || 30} HZ
          </span>
        </div>
      </div>

      {/* Main Waveform Monitor */}
      <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] relative overflow-hidden shadow-sm">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs font-mono text-[#8f98a0] flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${rppgConnected ? 'bg-[#a4d007]' : 'bg-[#66c0f4]'}`}></span>
            {rppgConnected ? 'SOURCE: rPPG GREEN PULSE (530nm)' : 'SWEEP: 25 mm/s · GAIN: 10 mm/mV'}
          </span>
          <span className={`text-xs font-mono ${rppgConnected ? 'text-[#a4d007]' : 'text-[#66c0f4]'} font-semibold`}>
            {rppgConnected ? 'SIGNAL QUALITY: OPTICAL LOCK' : 'SIGNAL QUALITY: NOMINAL (99.4%)'}
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={1100}
          height={240}
          className="w-full h-56 rounded-[3px] bg-[#101822] border border-[#2a475e] block"
        />

        {/* Live Gauges Overlay */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Heart Rate</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-bold font-mono ${rppgConnected ? 'text-[#a4d007]' : 'text-[#66c0f4]'}`}>
                {heartRate}
              </span>
              <span className="text-xs text-[#8f98a0] font-mono">BPM</span>
            </div>
            <div className="text-xs text-[#a4d007] mt-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {rppgConnected ? 'Optical Plethysmograph' : 'Sinus Rhythm'}
            </div>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Oxygen Saturation</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-[#a4d007]">{spO2}</span>
              <span className="text-xs text-[#8f98a0] font-mono">% SpO₂</span>
            </div>
            <div className="text-xs text-[#8f98a0] mt-1.5">Target &gt; 95%</div>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Respiration Rate</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-[#66c0f4]">{respiration}</span>
              <span className="text-xs text-[#8f98a0] font-mono">BrPM</span>
            </div>
            <div className="text-xs text-[#8f98a0] mt-1.5">Quiet breathing</div>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#1e2633] border border-[#2a475e]">
            <div className="text-[11px] uppercase font-mono text-[#8f98a0]">Perfusion Index</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-[#c6d4df]">4.8</span>
              <span className="text-xs text-[#8f98a0] font-mono">PI %</span>
            </div>
            <div className="text-xs text-[#a4d007] mt-1.5">Adequate perfusion</div>
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
              {rppgConnected ? 'STREAMING ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed m-0">
            Sidecar pipeline: <code className="text-[#66c0f4] bg-[#101822] px-1.5 py-0.5 rounded-[2px] border border-[#2a475e]">rppg/rppg_streamer.py</code>. Uses MediaPipe Face Landmarker to extract RGB micro-pulsations from facial capillaries and calculates real-time pulse.
          </p>

          <div className="p-3.5 rounded-[3px] bg-[#101822] border border-[#2a475e] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <div className="text-[#8f98a0]">Status: <span className="text-[#c6d4df]">{rppgStatusMsg}</span></div>
              <div className="text-[#626d78] text-[11px] mt-1">ROI: Forehead &amp; Bilateral Cheeks</div>
            </div>
            <button
              type="button"
              onClick={toggleRppg}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] transition ${
                rppgConnected
                  ? '!bg-[#d9534f]/20 !text-[#d9534f] !border-[#d9534f]/40'
                  : '!bg-[#212c3d] !text-[#66c0f4] !border-[#3d4f68] hover:!text-white'
              }`}
            >
              {rppgConnected ? 'Disconnect rPPG' : 'Connect rPPG Feed'}
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
              BLE READY
            </span>
          </div>

          <p className="text-xs text-[#8f98a0] leading-relaxed m-0">
            Direct serial / Bluetooth Low Energy channel for astronaut vital patches, pulse oximeters, and flight biomedical harnesses.
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5 rounded-[3px] bg-[#101822] border border-[#2a475e]">
              <span className="text-[#c6d4df]">Crew Wearable Vital Patch (BLE #1)</span>
              <span className="text-[#a4d007]">98% Battery · 0ms Latency</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-[3px] bg-[#101822] border border-[#2a475e]">
              <span className="text-[#c6d4df]">Digital Pulse Oximeter (USB-Serial)</span>
              <span className="text-[#a4d007]">Port COM3 · Locked</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
