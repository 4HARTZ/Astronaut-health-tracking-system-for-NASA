import React, { useEffect, useRef, useState } from 'react';

export default function PwaStatus({ enabled = Boolean(import.meta.env?.PROD) }) {
  const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
  if (isTauri) return null;

  const [online,setOnline]=useState(()=>navigator.onLine);
 const [status,setStatus]=useState(enabled?'Preparing offline access…':'Offline installation is available in the production build.');
 const [ready,setReady]=useState(false),[waiting,setWaiting]=useState(null);
 const [install,setInstall]=useState(null),[installed,setInstalled]=useState(()=>window.matchMedia?.('(display-mode: standalone)').matches??false);
 const [installMessage,setInstallMessage]=useState('');
 const reloadRequested=useRef(false);
 useEffect(()=>{
  const offline=()=>setOnline(false),online=()=>setOnline(true);
  const prompt=event=>{event.preventDefault();setInstall(event);};
  const complete=()=>{setInstalled(true);setInstall(null);setInstallMessage('Orbit is installed on this device.');};
  window.addEventListener('online',online);window.addEventListener('offline',offline);
  window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',complete);
  return ()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',complete);};
 },[]);
 useEffect(()=>{
  if(!enabled)return;
  if(!('serviceWorker' in navigator)){setStatus('This browser does not support offline app caching.');return;}
  let disposed=false,registration,worker;
  const activated=()=>{
   if(worker?.state==='redundant'&&!disposed&&!registration.active)setStatus('Offline setup did not complete. Reconnect and reload to try again.');
   if(worker?.state==='activated'&&!disposed){setReady(true);setStatus('Ready for offline use on this device.');}
   if(worker?.state==='installed'&&navigator.serviceWorker.controller&&!disposed)setWaiting(registration.waiting);
  };
  const found=()=>{worker?.removeEventListener('statechange',activated);worker=registration.installing;worker?.addEventListener('statechange',activated);activated();};
  const controlled=()=>{
   if(reloadRequested.current){window.location.reload();return;}
   if(!disposed){setReady(true);setStatus('Offline access is ready. If the app was updated in another window, reload after saving your work.');}
  };
  navigator.serviceWorker.addEventListener('controllerchange',controlled);
  navigator.serviceWorker.register(`${import.meta.env?.BASE_URL??'/'}sw.js`,{updateViaCache:'none'}).then(reg=>{
   if(disposed)return;
   registration=reg;
   if(reg.active){setReady(true);setStatus('Ready for offline use on this device.');}
   if(reg.waiting)setWaiting(reg.waiting);
   reg.addEventListener('updatefound',found);found();
   // Check once per launch; failure leaves the cached app usable.
   reg.update().catch(()=>{});
  }).catch(()=>{if(!disposed)setStatus('Offline setup failed. Reconnect and reload to try again; your saved records are unchanged.');});
  return ()=>{disposed=true;registration?.removeEventListener('updatefound',found);worker?.removeEventListener('statechange',activated);navigator.serviceWorker.removeEventListener('controllerchange',controlled);};
 },[enabled]);
 async function requestInstall(){
  if(!install)return;
  try{await install.prompt();const choice=await install.userChoice;setInstallMessage(choice.outcome==='accepted'?'Installation requested. Follow your browser’s instructions.':'Installation dismissed. You can install later from the browser menu.');}
  catch{setInstallMessage('Use your browser’s install or Add to Home Screen menu.');}
  setInstall(null);
 }
 function update(){
  if(!window.confirm('Apply the update and reload Orbit? Save or finish your check-in first. Unsaved form inputs will be lost.'))return;
  reloadRequested.current=true;waiting.postMessage({type:'ACTIVATE_UPDATE'});
 }
 return <section className="panel pwa-status" aria-label="App installation and offline access"><div><strong>{online?'Connection available':'Offline'} · {installed?'Installed app':'Orbit on your device'}</strong><p role="status">{!online&&!ready?'Offline access has not been confirmed yet. Keep this page open until setup succeeds.':status}</p><p className="hint">Records stay on this device; there is no cloud sync. External research links need a connection.</p></div>
 <div className="pwa-actions">{install&&<button type="button" onClick={requestInstall}>Install Orbit</button>}{waiting&&<button type="button" onClick={update}>Update ready — reload</button>}<details><summary>How to install &amp; use offline</summary><p>Open the production app once while connected and wait for “Ready for offline use”. In Chrome or Edge, use Install app in the browser menu or address bar. On iPhone or iPad, open in Safari and use Share → Add to Home Screen.</p><p>After setup, reopen the same address or installed app without a connection. Your measurements, charts, edits, and backups work locally. Browser support varies; this in-app preview may not offer installation.</p><p>Clearing site data removes the offline copy and saved records. Export backups regularly. Unsaved check-in drafts are lost on reload.</p></details>{installMessage&&<p role="status">{installMessage}</p>}</div></section>;
}
