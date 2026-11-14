import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  HeartPulse, 
  Brain, 
  LineChart, 
  FileText, 
  Sparkles, 
  Clock, 
  User,
  Settings
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore.js';

export function OrbitLogo({ className = "w-6 h-6", animated = true }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full text-[#a4d007] ${animated ? 'animate-orbit-breathe' : ''}`}
      >
        {/* Orbital Ring */}
        <circle
          cx="16"
          cy="16"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        {/* Central Planet */}
        <circle
          cx="16"
          cy="16"
          r="3.2"
          fill="currentColor"
        />
        {/* Orbiting Satellite Node (at ~45 deg) */}
        <circle
          cx="23.1"
          cy="8.9"
          r="2.4"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export default function HeaderNav({ activeTab, onSelectTab, pendingCount, storageError }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const activeCrew = useHealthStore((s) => s.activeCrew);

  useEffect(() => {
    // Avoid un-act-wrapped interval triggers in testing environment
    if (typeof window !== 'undefined' && (window.IS_REACT_ACT_ENVIRONMENT || globalThis.IS_REACT_ACT_ENVIRONMENT)) {
      return;
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'vitals', label: 'Vitals', icon: HeartPulse },
    { id: 'realtime', label: 'Real-Time', icon: Activity },
    { id: 'cognitive', label: 'Cognitive', icon: Brain },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'advisory', label: 'AI Advisory', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const utcString = currentTime.toISOString().slice(11, 19) + ' UTC';

  return (
    <header className="w-full bg-[#171a21] border-b border-[#233245] sticky top-0 z-50 px-4 sm:px-6 py-0 shadow-md">
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between h-[56px] gap-2 lg:gap-4">
        {/* Left: Orbit App Icon with Breathing Effect & Brand */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-[4px] bg-[#101822] border border-[#2a475e] flex items-center justify-center shadow-inner">
            <OrbitLogo className="w-5 h-5" animated={true} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <strong className="text-sm lg:text-base font-extrabold tracking-wider text-white">
                ORBIT
              </strong>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded-[2px] bg-[#101822] border border-[#2a475e] text-[#66c0f4] uppercase font-bold tracking-wider">
                v2.0
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#8f98a0] tracking-wider uppercase leading-tight mt-0.5 hidden sm:inline">
              CREW HEALTH
            </span>
          </div>
        </div>

        {/* Center: Steam-Style Navigation Tabs (Clean & Fixed Width - Never Hidden) */}
        <nav className="flex items-center h-full gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`h-[56px] px-2.5 sm:px-3.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 shrink-0 ${
                  isActive
                    ? '!border-[#1a9fff] !text-white !bg-[#1b2838]/60 !shadow-none'
                    : '!border-transparent !text-[#c6d4df] hover:!text-white hover:!bg-[#1b2838]/30 !bg-transparent !shadow-none'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#66c0f4]' : 'text-[#8f98a0]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Steam Utility Bar (Clock, Crew Profile, Settings) */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 text-xs font-mono">
          {/* MET & UTC Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-[#101822] border border-[#2a475e] text-[#8f98a0] text-[11px]">
            <Clock className="w-3.5 h-3.5 text-[#66c0f4] shrink-0" />
            <span>MET +14d</span>
            <span className="text-[#3d5a80]">|</span>
            <span className="text-[#c6d4df] font-semibold">{utcString}</span>
          </div>

          {/* Crew Profile Box */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] text-[#c6d4df] hover:text-white transition cursor-pointer text-left"
            title="Crew Profile & Station Settings"
          >
            <User className="w-3.5 h-3.5 text-[#66c0f4] shrink-0" />
            <span className="text-[11px] sm:text-[11.5px] font-semibold truncate max-w-[90px] sm:max-w-none">
              {activeCrew?.name || 'CDR. Vance'}
            </span>
          </button>

          {/* Settings Section Button */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[3px] border transition text-xs font-semibold shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? '!bg-[#1a9fff] !text-white !border-[#1a9fff] shadow-sm'
                : '!bg-[#212c3d] !text-[#c6d4df] !border-[#3d4f68] hover:!text-white hover:!bg-[#28384d]'
            }`}
            title="Settings & System Preferences"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
