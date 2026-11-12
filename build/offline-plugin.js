import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
// Generate a worker from the final bundle so every release caches its exact files.
export function offlineApp(){
 return {name:'orbit-offline',apply:'build',enforce:'post',generateBundle(_options,bundle){
  const files=[...Object.keys(bundle),'manifest.webmanifest','icons/orbit-192.png','icons/orbit-512.png','icons/orbit-maskable.png','icons/apple-touch-icon.png'];
  const version=createHash('sha256');
  for(const item of Object.values(bundle))version.update(item.type==='asset'?item.source:item.code);
  for(const file of files.filter(f=>f.startsWith('icons/')||f==='manifest.webmanifest'))version.update(readFileSync(new URL(`../public/${file}`,import.meta.url)));
  const template=readFileSync(new URL('../src/service-worker.js',import.meta.url),'utf8');
  this.emitFile({type:'asset',fileName:'sw.js',source:template.replace('__VERSION__',version.digest('hex').slice(0,16)).replace('__FILES__',JSON.stringify(files))});
 }};
}
