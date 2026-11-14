import React, { useEffect, useState } from 'react';
import {
  Activity,
  Brain,
  FileText,
  HeartPulse,
  LineChart,
  LogOut,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react';

export function OrbitLogo({ className = 'w-6 h-6', animated = true }) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-full w-full text-[#83dce8] ${animated ? 'animate-orbit-breathe' : ''}`}
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.7" />
        <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(-32 16 16)" stroke="currentColor" strokeWidth="1" opacity=".45" />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
        <circle cx="23.1" cy="8.9" r="2" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function HeaderNav({ activeTab, onSelectTab, pendingCount, storageError, accountName, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.IS_REACT_ACT_ENVIRONMENT || globalThis.IS_REACT_ACT_ENVIRONMENT)) return undefined;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'vitals', label: 'Dashboard', icon: HeartPulse },
    { id: 'health', label: 'Health metrics', icon: Activity },
    { id: 'realtime', label: 'Monitoring', icon: Activity },
    { id: 'cognitive', label: 'Wellbeing', icon: Brain },
    { id: 'analytics', label: 'Trends', icon: LineChart },
    { id: 'advisory', label: 'Guidance', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];
  const localTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  function selectTab(id) {
    onSelectTab(id);
    if (id === 'health') {
      window.setTimeout(() => document.getElementById('metrics')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    } else if (id === 'vitals') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="nav-brand" href="#top" onClick={(event) => { event.preventDefault(); selectTab('vitals'); }} aria-label="Orbit dashboard">
          <span className="nav-mark"><OrbitLogo className="h-6 w-6" /></span>
          <span className="nav-brand-copy"><strong>ORBIT</strong><small>CREW WELLNESS</small></span>
        </a>

        <nav aria-label="Main navigation" className="main-nav">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className="nav-item"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          <span className="utc-clock" title="Device local time">{localTime}</span>
          <span className="connection-pill" data-error={Boolean(storageError)} role="status" title={storageError || `${pendingCount} local changes in the device journal`}>
            <span className="connection-dot" aria-hidden="true" />
            {storageError ? 'Storage issue' : 'On this device'}
          </span>
          <button type="button" onClick={() => onSelectTab('settings')} className="crew-profile" title="Crew profile and settings" aria-label={`Profile and settings for ${accountName || 'crew'}`}>
            <UserRound className="h-4 w-4" aria-hidden="true" />
            <span>{accountName || 'Crew'}</span>
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onLogout} className="nav-logout" aria-label="Log out" title="Log out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
