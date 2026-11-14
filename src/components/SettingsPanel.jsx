import React, { useState } from 'react';
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
import { useHealthStore } from '../store/useHealthStore.js';

export default function SettingsPanel({ entries = [], onExportBackup }) {
  const [activeSection, setActiveSection] = useState('preferences'); // 'preferences' | 'profile' | 'security'
  const theme = useHealthStore((s) => s.theme);
  const setTheme = useHealthStore((s) => s.setTheme);
  const activeCrew = useHealthStore((s) => s.activeCrew);
  const setActiveCrew = useHealthStore((s) => s.setActiveCrew);
  const storageStats = useHealthStore((s) => s.storageStats);
  const storageBackend = useHealthStore((s) => s.storageBackend);

  const [crewName, setCrewName] = useState(activeCrew?.name || 'CDR. Vance');
  const [crewRole, setCrewRole] = useState(activeCrew?.role || 'Commander');
  const [crewMission, setCrewMission] = useState(activeCrew?.mission || 'Expedition 72 · ISS');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSaveCrew = (e) => {
    e.preventDefault();
    setActiveCrew({
      ...activeCrew,
      name: crewName.trim() || 'CDR. Vance',
      role: crewRole,
      mission: crewMission.trim() || 'Expedition 72',
    });
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
            SYSTEM CONFIGURATION &amp; PREFERENCES
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Application Settings</h2>
          <p className="text-xs text-[#8f98a0] mt-1 max-w-2xl leading-relaxed m-0">
            Configure visual display themes, mission telemetry thresholds, crew identifiers, and inspect local encryption vault integrity.
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
          <span>Security &amp; Vault</span>
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
                Select your preferred visual mode for spacecraft operations. Changes apply instantaneously.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Option */}
              <div
                onClick={() => setTheme('dark')}
                className={`p-5 rounded-[4px] border cursor-pointer transition flex flex-col justify-between gap-4 ${
                  theme === 'dark'
                    ? 'bg-[#16202d] border-[#1a9fff] ring-1 ring-[#1a9fff]'
                    : 'bg-[#101822] border-[#2a475e] hover:border-[#3d5a80]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] flex items-center justify-center text-[#66c0f4]">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-sm text-white block">Dark Mode (Default)</strong>
                        <span className="text-[11px] text-[#8f98a0] font-mono">Deep Space · Steam Theme</span>
                      </div>
                    </div>
                    {theme === 'dark' && (
                      <CheckCircle2 className="w-5 h-5 text-[#a4d007]" />
                    )}
                  </div>
                  <p className="text-xs text-[#8f98a0] leading-relaxed m-0 pt-1">
                    Calm, low-glare dark palette optimized for orbital night, low-light cabin environments, and minimal eye strain.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#2a475e]/60">
                  <div className="w-4 h-4 rounded-full bg-[#171a21] border border-[#3d5a80]" />
                  <div className="w-4 h-4 rounded-full bg-[#1b2838] border border-[#3d5a80]" />
                  <div className="w-4 h-4 rounded-full bg-[#1a9fff]" />
                  <div className="w-4 h-4 rounded-full bg-[#a4d007]" />
                  <span className="text-[10px] text-[#626d78] font-mono ml-auto">Active Steam Palette</span>
                </div>
              </div>

              {/* Light Theme Option */}
              <div
                onClick={() => setTheme('light')}
                className={`p-5 rounded-[4px] border cursor-pointer transition flex flex-col justify-between gap-4 ${
                  theme === 'light'
                    ? 'bg-[#16202d] border-[#1a9fff] ring-1 ring-[#1a9fff]'
                    : 'bg-[#101822] border-[#2a475e] hover:border-[#3d5a80]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] flex items-center justify-center text-[#e58e26]">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-sm text-white block">Light Mode</strong>
                        <span className="text-[11px] text-[#8f98a0] font-mono">Solar Daylight · Cleanroom</span>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <CheckCircle2 className="w-5 h-5 text-[#a4d007]" />
                    )}
                  </div>
                  <p className="text-xs text-[#8f98a0] leading-relaxed m-0 pt-1">
                    Bright, high-contrast daytime layout with crisp slate text and high-visibility borders for daylight conditions.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#2a475e]/60">
                  <div className="w-4 h-4 rounded-full bg-[#ffffff] border border-slate-300" />
                  <div className="w-4 h-4 rounded-full bg-[#f1f5f9] border border-slate-300" />
                  <div className="w-4 h-4 rounded-full bg-[#0284c7]" />
                  <div className="w-4 h-4 rounded-full bg-[#15803d]" />
                  <span className="text-[10px] text-[#626d78] font-mono ml-auto">High-Visibility Light</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Metrics & Formatting */}
          <div className="p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider m-0">
              Biomedical Units &amp; Clock Format
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-2">
                <span className="text-xs font-semibold text-white block">Core Temperature Standard</span>
                <p className="text-xs text-[#8f98a0] m-0">NASA Standard 3001 uses Celsius (°C) for flight records.</p>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="!bg-[#1a9fff] !text-white !py-1 !px-3 text-xs font-bold">Celsius (°C)</button>
                  <button type="button" className="!bg-[#101822] !text-[#8f98a0] !border-[#2a475e] !py-1 !px-3 text-xs">Fahrenheit (°F)</button>
                </div>
              </div>

              <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-2">
                <span className="text-xs font-semibold text-white block">Circadian Mission Clock</span>
                <p className="text-xs text-[#8f98a0] m-0">Mission Elapsed Time (MET) synchronized with UTC standard.</p>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="!bg-[#1a9fff] !text-white !py-1 !px-3 text-xs font-bold">24-Hour UTC</button>
                  <button type="button" className="!bg-[#101822] !text-[#8f98a0] !border-[#2a475e] !py-1 !px-3 text-xs">12-Hour Local</button>
                </div>
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
              Information displayed in the top mission telemetry tray and stamped onto generated Flight Surgeon reports.
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
              Inspect database health, SQLite WAL journaling, and local enclave boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-1">
              <div className="text-[10.5px] font-mono text-[#8f98a0] uppercase">Storage Engine</div>
              <div className="text-sm font-bold text-white font-mono">SQLite 3 / IndexedDB</div>
              <div className="text-xs text-[#a4d007] font-mono">Air-gapped WAL Journal</div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-1">
              <div className="text-[10.5px] font-mono text-[#8f98a0] uppercase">Saved Check-Ins</div>
              <div className="text-sm font-bold text-white font-mono">{entries.length} Records</div>
              <div className="text-xs text-[#66c0f4] font-mono">All verified locally</div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] space-y-1">
              <div className="text-[10.5px] font-mono text-[#8f98a0] uppercase">Cloud Telemetry Uplink</div>
              <div className="text-sm font-bold text-[#a4d007] font-mono">Zero Uplink (0 KB)</div>
              <div className="text-xs text-[#8f98a0] font-mono">100% Privacy Enclave</div>
            </div>
          </div>

          <div className="p-4 rounded-[3px] bg-[#101822] border border-[#2a475e] flex flex-wrap items-center justify-between gap-4">
            <div>
              <strong className="text-xs text-white block">Download Encrypted JSON Archive</strong>
              <span className="text-[11px] text-[#8f98a0]">
                Generates a timestamped JSON backup file containing all physiological logs and revisions.
              </span>
            </div>
            <a
              href="#history"
              className="px-3.5 py-1.5 rounded-[3px] bg-[#212c3d] text-[#66c0f4] border border-[#3d4f68] hover:text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Go to History &amp; Backup ↗</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
