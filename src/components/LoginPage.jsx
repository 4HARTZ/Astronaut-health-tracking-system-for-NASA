import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, Orbit, ShieldCheck } from 'lucide-react';
import { DEMO_CREW, authenticateCrew } from '../auth/demoAccounts.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const account = authenticateCrew(username, password);
    if (!account) {
      setError('Those account details don’t match. Check them and try again.');
      return;
    }
    setError('');
    onLogin(account);
  }

  return (
    <main className="login-page" aria-labelledby="login-title">
      <div className="login-stars" aria-hidden="true" />
      <div className="login-orbit-art" aria-hidden="true">
        <span className="login-orbit login-orbit-one" />
        <span className="login-orbit login-orbit-two" />
        <span className="login-orbit-core"><Orbit size={34} strokeWidth={1.2} /></span>
      </div>

      <div className="login-shell">
        <section className="login-story" aria-label="Orbit crew wellness workspace">
        <a className="login-brand" href="#login-title" aria-label="Orbit home">
          <span className="login-brand-mark"><Orbit size={19} /></span>
          <span>ORBIT <small>CREW HEALTH</small></span>
        </a>

        <div className="login-story-copy">
          <span className="login-kicker">CREW HEALTH INTELLIGENCE</span>
          <h2>Wellness, seen as a whole.</h2>
          <p>Bring check-ins, body systems, and personal health history into one calm crew workspace.</p>
        </div>

        <div className="login-story-cards" aria-label="Workspace features">
          <article><span>01 · SYSTEMS</span><strong>Connected health view</strong><small>Explore how measurements contribute to each body system.</small></article>
          <article><span>02 · HISTORY</span><strong>Personal check-ins</strong><small>Review recent readings and changes over time.</small></article>
          <article><span>03 · ON DEVICE</span><strong>Separate crew spaces</strong><small>Each account uses its own local workspace.</small></article>
        </div>
        <p className="login-story-note"><span aria-hidden="true" /> LOCAL WORKSPACE <i /> ORBIT CREW WELLNESS</p>
        </section>

        <div className="login-content">
        <section className="login-card">
          <div className="login-card-heading">
            <span className="login-kicker">PERSONAL CREW WORKSPACE</span>
            <h1 id="login-title">Welcome back.</h1>
            <p>Sign in to continue to your check-ins and trends.</p>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="login-field">
              <label htmlFor="crew-account">Crew account</label>
              <select
                id="crew-account"
                autoComplete="username"
                value={username}
                onChange={(event) => { setUsername(event.target.value); setError(''); }}
                required
              >
                <option value="">Choose your account</option>
                {DEMO_CREW.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
              </select>
            </div>

            <div className="login-field">
              <label htmlFor="crew-password">Password</label>
              <div className="login-password-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="crew-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(''); }}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit">
              Continue <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>

          <div className="login-local-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Check-ins are kept in separate, on-device crew workspaces.</span>
          </div>
        </section>

        <p className="login-footer">ORBIT · A local health check-in prototype</p>
        </div>
      </div>
    </main>
  );
}
