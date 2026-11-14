import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Trophy, 
  Activity,
  Clock,
  Gauge
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore.js';

export default function CognitiveGames() {
  const [activeGame, setActiveGame] = useState('pvt'); // 'pvt' | 'stroop'
  const [sessionMode, setSessionMode] = useState('quick'); // 'quick' (5 trials) | 'standard' (15 trials) | 'practice'

  // PVT State
  const [pvtState, setPvtState] = useState('idle'); // 'idle' | 'waiting' | 'active' | 'result' | 'early' | 'completed'
  const [reactionTime, setReactionTime] = useState(null);
  const [history, setHistory] = useState([248, 262, 239, 255]);
  const [trialCount, setTrialCount] = useState(0);
  const [lapses, setLapses] = useState(0); // RT > 500ms
  const [falseStarts, setFalseStarts] = useState(0);
  const [displayMs, setDisplayMs] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef(null);

  const maxTrials = sessionMode === 'quick' ? 5 : sessionMode === 'standard' ? 15 : 999;
  const recordPvtTrial = useHealthStore((s) => s.recordPvtTrial);

  const raf = typeof window !== 'undefined' && window.requestAnimationFrame 
    ? window.requestAnimationFrame.bind(window) 
    : (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16));
  const caf = typeof window !== 'undefined' && window.cancelAnimationFrame 
    ? window.cancelAnimationFrame.bind(window) 
    : (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id) => clearTimeout(id));

  // Start a new PVT trial
  const startPvtTrial = () => {
    if (trialCount >= maxTrials && sessionMode !== 'practice') {
      setPvtState('completed');
      return;
    }

    setPvtState('waiting');
    setReactionTime(null);
    setDisplayMs(0);

    // Random inter-stimulus interval between 2000ms and 5000ms
    const delay = Math.floor(Math.random() * 3000) + 2000;
    timerRef.current = setTimeout(() => {
      startTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setPvtState('active');

      const updateCounter = () => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = Math.floor(now - startTimeRef.current);
        setDisplayMs(elapsed);
        animFrameRef.current = raf(updateCounter);
      };
      animFrameRef.current = raf(updateCounter);
    }, delay);
  };

  const handlePvtClick = () => {
    if (pvtState === 'waiting') {
      // False start / Anticipatory response
      clearTimeout(timerRef.current);
      setFalseStarts(prev => prev + 1);
      setPvtState('early');
    } else if (pvtState === 'active') {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const rt = Math.round(now - startTimeRef.current);
      caf(animFrameRef.current);
      setReactionTime(rt);
      setDisplayMs(rt);

      const nextCount = trialCount + 1;
      setTrialCount(nextCount);
      setHistory(prev => [rt, ...prev.slice(0, 19)]);
      recordPvtTrial(rt);

      if (rt > 500) {
        setLapses(prev => prev + 1);
      }

      if (nextCount >= maxTrials && sessionMode !== 'practice') {
        setPvtState('completed');
      } else {
        setPvtState('result');
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && (pvtState === 'waiting' || pvtState === 'active')) {
        e.preventDefault();
        handlePvtClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
      caf(animFrameRef.current);
    };
  }, [pvtState]);

  const resetSession = () => {
    clearTimeout(timerRef.current);
    caf(animFrameRef.current);
    setPvtState('idle');
    setTrialCount(0);
    setLapses(0);
    setFalseStarts(0);
    setReactionTime(null);
  };

  // Performance calculations
  const meanRt = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0;
  const fastestRt = history.length ? Math.min(...history) : 0;
  const sortedRt = [...history].sort((a, b) => a - b);
  const fastest10Percent = sortedRt.length >= 3 ? sortedRt[0] : fastestRt;
  const slowest10Percent = sortedRt.length >= 3 ? sortedRt[sortedRt.length - 1] : Math.max(...history);

  // Astronaut Readiness Score calculation
  let readinessScore = 100;
  if (meanRt > 250) readinessScore -= Math.min(30, (meanRt - 250) * 0.3);
  readinessScore -= lapses * 12;
  readinessScore -= falseStarts * 5;
  readinessScore = Math.max(20, Math.min(100, Math.round(readinessScore)));

  const getDutyGrade = (score) => {
    if (score >= 90) return { grade: 'GRADE A', label: 'OPTIMAL · GO FOR EVA / CRITICAL FLIGHT OPS', color: 'text-emerald-400' };
    if (score >= 75) return { grade: 'GRADE B', label: 'NOMINAL · STANDARD MISSION READINESS', color: 'text-cyan-400' };
    if (score >= 60) return { grade: 'GRADE C', label: 'MILD FATIGUE · MONITORED TASKS ONLY', color: 'text-amber-400' };
    return { grade: 'GRADE D', label: 'FATIGUE CAUTION · CREW REST MANDATED', color: 'text-rose-400' };
  };

  const duty = getDutyGrade(readinessScore);

  // Stroop Test State
  const colors = [
    { name: 'RED', css: 'text-red-500', hex: '#ef4444' },
    { name: 'GREEN', css: 'text-emerald-500', hex: '#10b981' },
    { name: 'BLUE', css: 'text-sky-500', hex: '#0ea5e9' },
    { name: 'YELLOW', css: 'text-amber-400', hex: '#facc15' },
  ];
  const [stroopWord, setStroopWord] = useState(colors[0]);
  const [stroopInk, setStroopInk] = useState(colors[1]);
  const [stroopScore, setStroopScore] = useState(0);
  const [stroopTrials, setStroopTrials] = useState(0);

  const nextStroop = () => {
    const w = colors[Math.floor(Math.random() * colors.length)];
    const i = colors[Math.floor(Math.random() * colors.length)];
    setStroopWord(w);
    setStroopInk(i);
  };

  const handleStroopChoice = (chosenColor) => {
    setStroopTrials(prev => prev + 1);
    if (chosenColor.name === stroopInk.name) {
      setStroopScore(prev => prev + 1);
    }
    nextStroop();
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-[4px] bg-[#16202d] border border-[#2a475e]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#66c0f4] font-bold flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#66c0f4]" />
            NASA NEUROBEHAVIORAL READINESS SUITE (PVT &amp; EXECUTIVE ATTENTION)
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Cognitive Fitness &amp; Mental Health</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveGame('pvt')}
            className={`px-4 py-2 rounded-[3px] text-xs font-semibold transition ${
              activeGame === 'pvt' ? '!bg-[#1a9fff] !text-white font-bold' : '!bg-[#212c3d] !text-[#c6d4df] !border-[#3d4f68] hover:!text-white'
            }`}
          >
            PVT Vigilance Task
          </button>
          <button
            type="button"
            onClick={() => { setActiveGame('stroop'); nextStroop(); }}
            className={`px-4 py-2 rounded-[3px] text-xs font-semibold transition ${
              activeGame === 'stroop' ? '!bg-[#1a9fff] !text-white font-bold' : '!bg-[#212c3d] !text-[#c6d4df] !border-[#3d4f68] hover:!text-white'
            }`}
          >
            Stroop Conflict Test
          </button>
        </div>
      </div>

      {activeGame === 'pvt' ? (
        /* PVT Game Container */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-[4px] bg-[#1b2838] border border-[#2a475e] flex flex-col items-center justify-center min-h-[380px] text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-xs font-mono text-[#8f98a0]">
              <span>
                PROTOCOL: {sessionMode === 'quick' ? '1-MIN QUICK CHECK' : sessionMode === 'standard' ? 'NASA 3-MIN FLIGHT PROTOCOL' : 'PRACTICE'}
              </span>
              <span>
                TRIAL: <strong className="text-white">{trialCount}</strong> / {maxTrials === 999 ? '∞' : maxTrials}
              </span>
            </div>

            {pvtState === 'idle' && (
              <div className="space-y-5 max-w-lg mx-auto pt-4">
                <div className="w-14 h-14 rounded-full bg-[#1a9fff]/10 border border-[#1a9fff]/30 flex items-center justify-center mx-auto text-[#66c0f4]">
                  <Zap className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white m-0">Psychomotor Vigilance Task (PVT)</h3>
                  <p className="text-xs text-[#8f98a0] mt-1.5 leading-relaxed">
                    Evaluates central nervous system speed, cognitive throughput, and micro-sleep vulnerability under circadian disruption. Press <kbd className="px-2 py-0.5 rounded bg-[#101822] border border-[#2a475e] text-[#66c0f4]">SPACEBAR</kbd> or click as fast as possible when the red millisecond counter appears.
                  </p>
                </div>

                <div className="flex justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSessionMode('quick'); }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] ${
                      sessionMode === 'quick' ? '!bg-[#212c3d] !text-[#66c0f4] !border-[#1a9fff]' : '!bg-[#101822] !text-[#8f98a0] !border-[#2a475e]'
                    }`}
                  >
                    1-Min Check (5 Trials)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSessionMode('standard'); }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] ${
                      sessionMode === 'standard' ? '!bg-[#212c3d] !text-[#66c0f4] !border-[#1a9fff]' : '!bg-[#101822] !text-[#8f98a0] !border-[#2a475e]'
                    }`}
                  >
                    NASA Standard (15 Trials)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startPvtTrial}
                  className="button !py-2.5 !px-6 !text-xs !font-bold"
                >
                  Start Assessment Protocol ↗
                </button>
              </div>
            )}

            {pvtState === 'waiting' && (
              <div
                onClick={handlePvtClick}
                className="w-full h-full min-h-[220px] flex flex-col items-center justify-center cursor-pointer select-none"
              >
                <div className="w-4 h-4 rounded-full bg-[#8f98a0] animate-ping mb-3"></div>
                <p className="text-sm font-mono text-[#8f98a0] tracking-wider m-0">WAIT FOR STIMULUS…</p>
                <span className="text-[11px] text-[#626d78] mt-1">Focus on center · Do not anticipate</span>
              </div>
            )}

            {pvtState === 'active' && (
              <div
                onClick={handlePvtClick}
                className="w-full h-full min-h-[220px] flex flex-col items-center justify-center cursor-pointer select-none bg-[#d9534f]/10"
              >
                <div className="text-5xl sm:text-6xl font-black font-mono text-[#d9534f] tracking-tight animate-pulse">
                  {displayMs} <span className="text-xl font-normal">ms</span>
                </div>
                <p className="text-xs font-mono text-[#d9534f] mt-3 font-bold uppercase tracking-widest m-0">
                  PRESS SPACEBAR / CLICK NOW!
                </p>
              </div>
            )}

            {pvtState === 'result' && (
              <div className="space-y-3">
                <div className="text-4xl sm:text-5xl font-black font-mono text-[#66c0f4]">
                  {reactionTime} <span className="text-xl text-[#8f98a0]">ms</span>
                </div>
                <div className="text-xs font-mono">
                  {reactionTime < 240 ? (
                    <span className="text-[#a4d007] font-semibold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Optimal Neurobehavioral Speed (&lt;240 ms)
                    </span>
                  ) : reactionTime < 350 ? (
                    <span className="text-[#66c0f4] font-semibold">Nominal Flight Response (240–350 ms)</span>
                  ) : reactionTime <= 500 ? (
                    <span className="text-[#e58e26] font-semibold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Slower Reaction / Mild CNS Fatigue
                    </span>
                  ) : (
                    <span className="text-[#d9534f] font-semibold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Attention Lapse Registered (&gt;500 ms)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={startPvtTrial}
                  className="px-4 py-1.5 rounded-[3px] bg-[#212c3d] text-[#c6d4df] hover:text-white border border-[#3d4f68] text-xs font-semibold"
                >
                  Continue to Next Trial ({trialCount + 1}/{maxTrials}) ↗
                </button>
              </div>
            )}

            {pvtState === 'early' && (
              <div className="space-y-3">
                <div className="text-[#e58e26] text-sm font-bold flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> False Start (Anticipation Error)
                </div>
                <p className="text-xs text-[#8f98a0] m-0">Response triggered before the millisecond counter appeared.</p>
                <button
                  type="button"
                  onClick={startPvtTrial}
                  className="px-4 py-1.5 rounded-[3px] bg-[#212c3d] text-[#c6d4df] hover:text-white border border-[#3d4f68] text-xs font-semibold"
                >
                  Repeat Trial
                </button>
              </div>
            )}

            {pvtState === 'completed' && (
              <div className="space-y-3 max-w-md mx-auto">
                <div className="w-10 h-10 rounded-full bg-[#5c7e10]/20 border border-[#a4d007]/40 flex items-center justify-center mx-auto text-[#a4d007]">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white m-0">Assessment Session Completed</h3>
                <div className="p-2.5 rounded-[3px] bg-[#16202d] border border-[#2a475e] text-xs font-mono">
                  <div className={`text-sm font-black ${duty.color}`}>{duty.grade}</div>
                  <div className="text-[#c6d4df] mt-0.5">{duty.label}</div>
                  <div className="text-[#8f98a0] text-[11px] mt-0.5">Readiness Index: {readinessScore}%</div>
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={resetSession}
                    className="px-3.5 py-1.5 rounded-[3px] bg-[#212c3d] text-[#c6d4df] hover:text-white border border-[#3d4f68] text-xs font-semibold"
                  >
                    New Assessment
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PVT Telemetry & NASA Standards */}
          <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono m-0 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#66c0f4]" />
                Readiness Analytics
              </h3>
              <span className={`text-xs font-mono font-bold ${duty.color}`}>{duty.grade}</span>
            </div>

            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] text-center">
              <div className="text-[11px] font-mono uppercase text-[#8f98a0]">Readiness Score</div>
              <div className="text-4xl font-black font-mono text-[#66c0f4] my-1">{readinessScore}%</div>
              <div className="text-xs text-[#8f98a0] font-mono">{duty.label}</div>
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-[3px] bg-[#16202d] border border-[#2a475e] flex justify-between items-center text-xs">
                <span className="text-[#8f98a0]">Mean Reaction Time</span>
                <span className="font-bold font-mono text-[#66c0f4]">{meanRt} ms</span>
              </div>

              <div className="p-2.5 rounded-[3px] bg-[#16202d] border border-[#2a475e] flex justify-between items-center text-xs">
                <span className="text-[#8f98a0]">Fastest 10% (Optimum)</span>
                <span className="font-bold font-mono text-[#a4d007]">{fastest10Percent} ms</span>
              </div>

              <div className="p-2.5 rounded-[3px] bg-[#16202d] border border-[#2a475e] flex justify-between items-center text-xs">
                <span className="text-[#8f98a0]">Attention Lapses (&gt;500ms)</span>
                <span className={`font-bold font-mono ${lapses === 0 ? 'text-[#a4d007]' : 'text-[#d9534f]'}`}>
                  {lapses}
                </span>
              </div>

              <div className="p-2.5 rounded-[3px] bg-[#16202d] border border-[#2a475e] flex justify-between items-center text-xs">
                <span className="text-[#8f98a0]">False Starts (Anticipations)</span>
                <span className={`font-bold font-mono ${falseStarts === 0 ? 'text-[#a4d007]' : 'text-[#e58e26]'}`}>
                  {falseStarts}
                </span>
              </div>
            </div>

            {/* Recent Trial Bubbles */}
            <div className="pt-1.5">
              <div className="text-[11px] font-mono text-[#8f98a0] uppercase mb-2">Recent Trial History</div>
              <div className="flex gap-1.5 flex-wrap">
                {history.slice(0, 10).map((rt, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-[2px] text-[11px] font-mono border ${
                      rt < 250
                        ? 'bg-[#5c7e10]/20 text-[#a4d007] border-[#a4d007]/30'
                        : rt < 350
                        ? 'bg-[#16202d] text-[#c6d4df] border-[#2a475e]'
                        : 'bg-[#d9534f]/20 text-[#d9534f] border-[#d9534f]/30'
                    }`}
                  >
                    {rt}ms
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Stroop Test Container */
        <div className="p-8 sm:p-10 rounded-[4px] bg-[#1b2838] border border-[#2a475e] max-w-xl mx-auto text-center space-y-6 shadow-sm">
          <div>
            <span className="text-xs font-mono text-[#8f98a0] uppercase">Executive Attention &amp; Conflict Processing</span>
            <h3 className="text-lg font-bold text-white mt-1.5">Select the INK COLOR, ignore the word text</h3>
          </div>

          <div className="p-10 rounded-[3px] bg-[#16202d] border border-[#2a475e]">
            <span className={`text-4xl sm:text-5xl font-black tracking-widest ${stroopInk.css}`}>
              {stroopWord.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleStroopChoice(c)}
                className="py-3 px-4 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] text-xs font-bold text-white hover:border-[#66c0f4] transition"
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-[#8f98a0]">
            Score: <span className="text-[#66c0f4] font-bold">{stroopScore}</span> / {stroopTrials} correct
          </div>
        </div>
      )}
    </section>
  );
}
