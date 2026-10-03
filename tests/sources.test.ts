import test from 'node:test';import assert from 'node:assert/strict';
import {officialSources} from '../lib/sources';
test('source completion order cannot crowd primary company events out with macro or fallback feeds',async()=>{
 const original=globalThis.fetch;
 const feed=(host:string)=>`<rss><channel>${[1,2].map(n=>`<item><link>https://${host}/news/event-${n}</link><pubDate>Fri, 02 Oct 2026 12:00:00 GMT</pubDate></item>`).join('')}</channel></rss>`;
 globalThis.fetch=(async(url:Parameters<typeof fetch>[0])=>{
  const u=String(url);
  if(u.endsWith('releases.xml')){await new Promise(r=>setTimeout(r,15));return new Response(feed('nvidianews.nvidia.com'));}
  if(u.endsWith('/feed/'))return new Response(feed('blogs.nvidia.com'));
  if(u.endsWith('press_all.xml'))return new Response(feed('www.federalreserve.gov'));
  return new Response(`<html><title>Official test article</title><article>${u} ${'Source fixture for provenance ordering only. '.repeat(8)}</article></html>`);
 }) as typeof fetch;
 try{const result=await officialSources('NVDA');assert.equal(result.evidence.length,4);assert.deepEqual(result.evidence.map(e=>new URL(e.url).hostname),['nvidianews.nvidia.com','nvidianews.nvidia.com','www.federalreserve.gov','www.federalreserve.gov']);}finally{globalThis.fetch=original;}
});
