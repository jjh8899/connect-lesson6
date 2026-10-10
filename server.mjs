import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tracks} from './dist/lesson6-data.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const files=new Set(['index.html','lesson6.js','lesson6.css','lesson6-data.js','lesson6-engine.js',...tracks.map(t=>t.audio),...['intro','dohun','dami','seoha','mina'].map(n=>`audio/reading-${n}.wav`)]);
const security={'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"};
export const server=http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,security);return res.end('Method not allowed');}
  const route=new URL(req.url,'http://localhost').pathname,file=route==='/'?'index.html':route.slice(1);
  if(!files.has(file)){res.writeHead(404,security);return res.end('Not found');}
  const data=await readFile(path.join(root,file)),headers={...security,'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wav':'audio/wav'})[path.extname(file)],'Accept-Ranges':'bytes'};
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start=0,end=data.length-1;
   if(match&&(match[1]||match[2])){if(!match[1])start=Math.max(0,data.length-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}}else start=data.length;
   if(start>=data.length||start>end||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{...headers,'Content-Range':`bytes */${data.length}`});return res.end();}
   res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});return res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
  }
  res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500,security);res.end('Unable to serve file');}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Connect Lesson 6: http://127.0.0.1:'+(process.env.PORT||4173)));
