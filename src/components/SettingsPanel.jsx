import React, { useState } from 'react';
import { useHealthStore } from '../store/useHealthStore.js';
import { 
  Settings, 
  Moon, 
  Sun, 
  User, 
  Shield, 
  Database, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  Download,
  FileCheck
} from 'lucide-react';
function readCrewProfile(accountId, accountName) {
  const fallback = { id: accountId, name: accountName || 'Crew member', role: 'Crew member', mission: '' };
  try {
    const saved = localStorage.getItem(`orbit-profile:${accountId}`);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch { return fallback; }
}

export default function SettingsPanel({ entries = [], onOpenHistory, accountId = 'local', accountName = 'Crew member' }) {
  const [activeSection, setActiveSection] = useState('preferences'); // 'preferences' | 'profile' | 'security'
  const theme = useHealthStore((s) => s.theme);
  const setTheme = useHealthStore((s) => s.setTheme);
  const activeCrew = useHealthStore((s) => s.activeCrew);
  const setActiveCrew = useHealthStore((s) => s.setActiveCrew);
  const storageStats = useHealthStore((s) => s.storageStats);
  const storageBackend = useHealthStore((s) => s.storageBackend);

  const [initialProfile] = useState(() => accountId === 'local' ? activeCrew : readCrewProfile(accountId, accountName));
  const [crewName, setCrewName] = useState(initialProfile.name);
  const [crewRole, setCrewRole] = useState(initialProfile.role);
  const [crewMission, setCrewMission] = useState(initialProfile.mission);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSaveCrew = (e) => {
    e.preventDefault();
    const profile = {
      id: accountId,
      name: crewName.trim() || accountName || 'Crew member',
      role: crewRole,
      mission: crewMission.trim(),
    };
    if (accountId === 'local') setActiveCrew(profile);
    else try { localStorage.setItem(`orbit-profile:${accountId}`, JSON.stringify(profile)); } catch { /* profile remains in this page session */ }
    setSavedMsg('Profile updated successfully.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  return (
    <section className="space-y-6">
      {/* Settings Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-[4px] bg-[#16202d] border border-[#2a475e]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#66c0f4] font-bold flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#66c0f4]" />
            YOUR WORKSPACE
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Application Settings</h2>
          <p className="text-xs text-[#8f98a0] mt-1 max-w-2xl leading-relaxed m-0">
            Choose how Orbit looks, update your crew details, and review how this device stores your records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-[3px] bg-[#101822] text-[#8f98a0] border border-[#2a475e]">
            ORBIT v2.0 · SETTINGS
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2a475e] pb-2">
        <button
          type="button"
          onClick={() => setActiveSection('preferences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[3px] text-xs font-bold uppercase tracking-wider transition ${
            activeSection === 'preferences'
              ? '!bg-[#1a9fff] !text-white'
              : '!bg-[#16202d] !text-[#8f98a0] hover:!text-white border border-[#2a475e]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Preferences &amp; Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[3px] text-xs font-bold uppercase tracking-wider transition ${
            activeSection === 'profile'
              ? '!bg-[#1a9fff] !text-white'
              : '!bg-[#16202d] !text-[#8f98a0] hover:!text-white border border-[#2a475e]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Crew Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[3px] text-xs font-bold uppercase tracking-wider transition ${
            activeSection === 'security'
              ? '!bg-[#1a9fff] !text-white'
              : '!bg-[#16202d] !text-[#8f98a0] hover:!text-white border border-[#2a475e]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Local data</span>
        </button>
      </div>

      {/* SECTION 1: PREFERENCES (THEME, UNITS, DISPLAY) */}
      {activeSection === 'preferences' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider m-0">
                Display Theme Mode
              </h3>
              <p className="text-xs text-[#8f98a0] mt-1 m-0">
                Choose the darker midnight palette or a brighter daylight palette.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Option */}
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`theme-choice p-5 rounded-[4px] border cursor-pointer transition flex flex-col justify-between gap-4 ${
                  theme === 'dark'
                    ? 'bg-[#16202d] border-[#1a9fff] ring-1 ring-[#1a9fff]'
                    : 'bg-[#101822] border-[#2a475e] hover:border-[#3d5a80]'
                }`}
              >
                <span className="theme-choice-main">
                  <span className="theme-choice-icon"><Moon className="w-4 h-4" /></span>
                  <span className="theme-choice-copy"><strong>Dark Mode (Default)</strong><small>Midnight orbit</small></span>
                  {theme === 'dark' && <CheckCircle2 className="theme-choice-check" aria-hidden="true" />}
                </span>
                <span className="theme-choice-description">A deep navy palette with soft cyan and teal accents.</span>
                <span className="theme-swatches" aria-hidden="true"><i className="swatch swatch-space" /><i className="swatch swatch-surface" /><i className="swatch swatch-cyan" /><i className="swatch swatch-teal" /><small>Midnight palette</small></span>
              </button>

              {/* Light Theme Option */}
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`theme-choice p-5 rounded-[4px] border cursor-pointer transition flex flex-col justify-between gap-4 ${
                  theme === 'light'
                    ? 'bg-[#16202d] border-[#1a9fff] ring-1 ring-[#1a9fff]'
                    : 'bg-[#101822] border-[#2a475e] hover:border-[#3d5a80]'
                }`}
              >
                <span className="theme-choice-main">
                  <span className="theme-choice-icon theme-choice-icon-light"><Sun className="w-4 h-4" /></span>
                  <span className="theme-choice-copy"><strong>Light Mode</strong><small>Daylight</small></span>
                  {theme === 'light' && <CheckCircle2 className="theme-choice-check" aria-hidden="true" />}
                </span>
                <span className="theme-choice-description">A brighter, cool-toned palette for well-lit environments.</span>
                <span className="theme-swatches" aria-hidden="true"><i className="swatch swatch-light" /><i className="swatch swatch-day" /><i className="swatch swatch-cyan" /><i className="swatch swatch-teal" /><small>Daylight palette</small></span>
              </button>
            </div>
          </div>

          {/* Operational Metrics & Formatting */}
          <div className="p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider m-0">
              Units &amp; time
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-2">
                <span className="text-xs font-semibold text-white block">Temperature</span>
                <p className="text-xs text-[#8f98a0] m-0">Recorded temperatures use Celsius (°C). Conversion preferences are not available.</p>
                <span className="setting-value">Celsius · °C</span>
              </div>

              <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-2">
                <span className="text-xs font-semibold text-white block">Time zone</span>
                <p className="text-xs text-[#8f98a0] m-0">Timestamps use your device’s local time. Mission elapsed time is not configured.</p>
                <span className="setting-value">Device local time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CREW PROFILE */}
      {activeSection === 'profile' && (
        <form onSubmit={handleSaveCrew} className="p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider m-0">
              Astronaut Flight Profile
            </h3>
            <p className="text-xs text-[#8f98a0] mt-1 m-0">
              Save a name, role, and optional mission label for this crew workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="crew-name" className="text-xs font-semibold text-white">Call-Sign / Name</label>
              <input
                id="crew-name"
                type="text"
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                placeholder="e.g. CDR. Vance"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <label htmlFor="crew-role" className="text-xs font-semibold text-white">Station Role</label>
              <select
                id="crew-role"
                value={crewRole}
                onChange={(e) => setCrewRole(e.target.value)}
                className="mt-1.5"
              >
                <option value="Crew member">Crew member</option>
                <option value="Commander">Commander (CDR)</option>
                <option value="Flight Engineer">Flight Engineer (FE)</option>
                <option value="Crew Medical Officer">Crew Medical Officer (CMO)</option>
                <option value="Science Specialist">Science Specialist (MS)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="crew-mission" className="text-xs font-semibold text-white">Mission / Expedition</label>
              <input
                id="crew-mission"
                type="text"
                value={crewMission}
                onChange={(e) => setCrewMission(e.target.value)}
                placeholder="e.g. Expedition 72 · Gateway Base"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="button !py-2 !px-5 text-xs font-bold">
              Save Crew Profile
            </button>
            {savedMsg && (
              <span className="text-xs text-[#a4d007] font-semibold flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> {savedMsg}
              </span>
            )}
          </div>
        </form>
      )}

      {/* SECTION 3: SECURITY & DATABASE VAULT */}
      {activeSection === 'security' && (
        <div className="p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider m-0">
              Autonomous Enclave &amp; Local Storage Vault
            </h3>
            <p className="text-xs text-[#8f98a0] mt-1 m-0">
              Review where records are stored and export a local backup.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-1">
              <div className="text-[10.5px] font-mono text-[#8f98a0] uppercase">Storage Engine</div>
              <div className="text-sm font-bold text-white font-mono">{storageBackend}</div>
              <div className="text-xs text-[#a4d007] font-mono">Stored on this device</div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-1">
              <div className="text-[10.5px] font-mono text-[#8f98a0] uppercase">Saved Check-Ins</div>
              <div className="text-sm font-bold text-white font-mono">{entries.length} Records</div>
              <div className="text-xs text-[#66c0f4] font-mono">Saved records</div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-1">
              <div className="text-[10.5px] font-mono text-[#8f98a0] uppercase">Cloud sync</div>
              <div className="text-sm font-bold text-[#a4d007] font-mono">Not connected</div>
              <div className="text-xs text-[#8f98a0] font-mono">Unencrypted local storage</div>
            </div>
          </div>

          <div className="p-4 rounded-[3px] bg-[#101822] border border-[#2a475e] flex flex-wrap items-center justify-between gap-4">
            <div>
              <strong className="text-xs text-white block">Export JSON Backup (Unencrypted)</strong>
              <span className="text-[11px] text-[#8f98a0]">
                Generates a timestamped JSON backup file containing saved check-ins. The change journal is not included.
              </span>
            </div>
            <button
              onClick={onOpenHistory}
              type="button"
              className="px-3.5 py-1.5 rounded-[3px] bg-[#212c3d] text-[#66c0f4] border border-[#3d4f68] hover:text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Go to History &amp; Backup ↗</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
