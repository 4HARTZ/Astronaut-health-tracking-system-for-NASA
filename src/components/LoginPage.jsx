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

      <div className="login-content">
        <a className="login-brand" href="#login-title" aria-label="Orbit home">
          <span className="login-brand-mark"><Orbit size={19} /></span>
          <span>ORBIT <small>CREW HEALTH</small></span>
        </a>

        <section className="login-card">
          <div className="login-card-heading">
            <span className="login-kicker">PERSONAL CREW WORKSPACE</span>
            <h1 id="login-title">Welcome back.</h1>
            <p>Sign in to continue to your check-ins and trends.</p>
          </div>

          <form onSubmit={submit} noValidate>
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
    </main>
  );
}
