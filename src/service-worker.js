/* Generated at build time. Cache only the public app shell, never health records. */
const VERSION = '__VERSION__';
const FILES = __FILES__;
const SCOPE = self.registration.scope;
const PREFIX = `orbit-shell:${SCOPE}:`;
const CACHE = `${PREFIX}${VERSION}`;
const urls = FILES.map(path => new URL(path, SCOPE).href);
const shell = new URL('index.html', SCOPE).href;
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // addAll is atomic: a failed download leaves the previous worker in service.
  await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
 })());
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
 })());
});
self.addEventListener('message', event => {
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
});
self.addEventListener('fetch', event => {
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==new URL(SCOPE).origin)return;
 const navigation=request.mode==='navigate'&&url.href.startsWith(SCOPE);
 if(!navigation&&!urls.includes(url.href))return;
 event.respondWith((async () => {
  const cache=await caches.open(CACHE);
  // These are versioned, public app files, identical for every request origin.
  // Preview servers can send Vary: Origin; module/style requests may carry an
  // Origin header that the precache download did not, despite the same URL.
  const cached=await cache.match(navigation?shell:request,{ignoreVary:true});
  return cached||fetch(request);
 })());
});
