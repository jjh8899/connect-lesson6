import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {questions,tracks,stories,readingComments} from './dist/lesson6-data.js';
import {createProfile,isComplete,grade,answer,totals,mistakes,recommendation} from './dist/lesson6-engine.js';
test('20 four-option B1 questions; reading 2+2+1; exact 100 point allocation',()=>{
 assert.equal(questions.length,20);assert.equal(new Set(questions.map(q=>q.id )).size,20);
 for(const cat of ['Comprehension','Expression','Matching'])assert.equal(questions.filter(q=>q.area==='reading'&&q.category===cat).length,cat==='Matching'?1:2);
 for(const [area,count,max] of [['reading',5,25],['listening',7,35],['collocation',8,40]]){const t=totals(createProfile('a'),area);assert.equal(t.count,count);assert.equal(t.max,max);}
 assert(questions.every(q=>q.level==='B1'&&q.type==='choice'&&q.options.length===4&&new Set(q.options).size===4&&q.points===5&&q.hint));assert.equal(totals(createProfile('a')).max,100);
});
test('valid, missing and malformed submissions, including all matching pairs',()=>{
 for(const q of questions){const solution=q.type==='match'?q.pairs.map((_,i)=>i):q.answer;assert(grade(q,solution));for(const empty of [null,undefined,'',[],['','','']])assert(!grade(q,empty));if(q.type==='match'){assert(!grade(q,[0,1,null]));assert(!grade(q,[0,0,0]));assert(!isComplete(q,[0,1,99]));}else assert(!grade(q,(q.answer+1)%q.options.length));}
});
test('first score, repeat protection, skipped work and independent student data',()=>{
 const a=createProfile('A'),b=createProfile('B'),q=questions.find(q=>q.type==='choice');
 assert.equal(answer(a,q,null).error,'missing');assert.equal(totals(a).done,0);
 answer(a,q,null,{skip:true});assert.equal(totals(a).score,0);assert.equal(mistakes(a).length,1);
 answer(a,q,q.answer,{practice:true});assert.equal(totals(a).score,0);assert.equal(mistakes(a).length,0);assert.equal(totals(b).done,0);
 for(const x of questions){const value=x.type==='match'?x.pairs.map((_,i)=>i):x.answer;answer(b,x,value);answer(b,x,value);}
 assert.equal(totals(b).score,100);assert.equal(totals(b).done,20);assert.equal(b.answers[q.id].attempts,1);
 assert.equal(recommendation(createProfile('C')).area,'listening');
});
test('all 17 generated audio files exist, are PCM waveforms with non-silent frames',async()=>{
 const files=[...tracks.map(t=>t.audio),...['intro','dohun','dami','seoha','mina'].map(n=>`audio/reading-${n}.wav`)];assert.equal(files.length,17);
 for(const file of files){const data=await readFile(new URL('./dist/'+file,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert(data.length>100000);let offset=12,pcm=null;while(offset+8<=data.length){const type=data.toString('ascii',offset,offset+4),len=data.readUInt32LE(offset+4);if(type==='data'){pcm=data.subarray(offset+8,offset+8+len);break;}offset+=8+len+(len%2);}assert(pcm&&pcm.some(x=>x!==0),file+' is silent');}
 assert(stories.every(s=>Array.isArray(readingComments[s.name])));
});

test('old 14-question scores cannot inflate the revised assessment',()=>{const p=createProfile('old');p.answers['b1-r1']={firstPoints:10,correct:true};assert.equal(totals(p).score,0);assert.equal(totals(p).done,0);const q=questions[0];answer(p,q,q.answer);assert.equal(totals(p).score,5);});

test('stickers reward distinct attempted questions, not skips or duplicate attempts',async()=>{
 const {rewards}=await import('./dist/lesson6-engine.js');const p=createProfile('stickers');
 for(const q of questions.slice(0,3))answer(p,q,q.answer);
 assert.equal(rewards(p).earned.length,1);
 answer(p,questions[0],questions[0].answer,{practice:true});assert.equal(rewards(p).attempted,3);
 const q=questions[3];answer(p,q,null,{skip:true});assert.equal(rewards(p).attempted,3);
 answer(p,q,q.answer,{practice:true});assert.equal(rewards(p).attempted,4);assert.equal(rewards(p).recovered,1);
 assert.equal(totals(p).score,15);
 for(const q of questions.slice(4))answer(p,q,q.answer);
 assert.equal(rewards(p).earned.length,6);assert.equal(rewards(p).remaining,0);
});

test("five reading questions have five distinct passages",()=>{const r=questions.filter(q=>q.area==="reading");assert.equal(new Set(r.map(q=>q.ref)).size,5);assert.equal(new Set(r.map(q=>stories.find(s=>s.name===q.ref).text)).size,5);});

test('each reading has selectable expressions with meanings, classifications and sources',async()=>{
 const {readingHighlights,expressionNotes,extraPhrases,phrases}=await import('./dist/lesson6-data.js');
 for(const story of stories){const chunks=readingHighlights[story.name];assert(chunks.length>0,story.name);for(const chunk of chunks){assert(story.text.toLowerCase().includes(chunk.toLowerCase()),chunk);const note=expressionNotes[chunk.toLowerCase()];assert(note?.title&&note.description&&note.kind&&note.sourceUrl.startsWith('https://'),chunk);}}
 assert.equal(phrases.length,8);assert.equal(extraPhrases.length,5);assert.equal(questions.filter(q=>q.area==='collocation').length,8);
 assert.equal(expressionNotes['in the middle of'].kind,'고정 표현 틀');assert.equal(expressionNotes['make a big difference'].kind,'관용 표현');
});
