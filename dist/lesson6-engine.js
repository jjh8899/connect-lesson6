import {questions} from './lesson6-data.js';
export const sections=[{id:'warmup',title:'Warm-up',ko:'감정 깨우기',icon:'☺'},{id:'listening',title:'Listening',ko:'듣고 공감하기',icon:'◖'},{id:'reading',title:'Reading',ko:'읽고 이해하기',icon:'▤'},{id:'collocation',title:'Collocation',ko:'표현 연결하기',icon:'⌘'},{id:'review',title:'Self-review',ko:'나의 배움 확인',icon:'✦'}];
export function createProfile(name){return {name,answers:{},drafts:{},hints:{},heard:{},scripts:{},warm:{},reflection:{},section:'warmup',position:{listening:0,reading:0,collocation:0},created:new Date().toISOString()};}
export function isComplete(q,value){return q.type==='match'?Array.isArray(value)&&value.length===q.pairs.length&&value.every(v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<q.pairs.length):value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<q.options.length;}
export function grade(q,value){return isComplete(q,value)&&(q.type==='match'?value.every((v,i)=>Number(v)===i):Number(value)===q.answer);}
export function answer(profile,q,value,{skip=false,practice=false}={}){
 if(!skip&&!isComplete(q,value))return {error:'missing'};
 const previous=profile.answers[q.id],correct=!skip&&grade(q,value);
 if(previous&&!practice)return {result:previous,duplicate:true};
 const result={firstCorrect:previous?.firstCorrect??correct,correct,firstPoints:previous?.firstPoints??(correct?q.points:0),skipped:skip,firstSkipped:previous?.firstSkipped??skip,response:value,attempts:(previous?.attempts||0)+1,hint:Boolean(profile.hints[q.id]),script:Boolean(profile.scripts[q.id]),at:new Date().toISOString()};
 profile.answers[q.id]=result;delete profile.drafts[q.id];return {result};
}
export function totals(profile,area){const pool=questions.filter(q=>!area||q.area===area);return {score:pool.reduce((n,q)=>n+(profile.answers[q.id]?.firstCorrect?q.points:0),0),max:pool.reduce((n,q)=>n+q.points,0),done:pool.filter(q=>profile.answers[q.id]).length,count:pool.length};}
export function mistakes(profile){return questions.filter(q=>profile.answers[q.id]&&!profile.answers[q.id].correct);}
export const stickers=['🔎 단서 탐정','💬 공감 친구','🔗 표현 수집가','🎧 집중 리스너','🌱 성장 메이커','🌟 연결 마스터'];
export function rewards(profile){
 const results=questions.map(q=>profile.answers[q.id]).filter(Boolean);
 const attempted=results.filter(r=>!r.skipped).length;
 return {attempted,earned:stickers.slice(0,Math.floor(attempted/3)),remaining:attempted>=18?0:3-attempted%3,recovered:results.filter(r=>r.correct&&!r.firstCorrect&&r.attempts>1).length};
}
export function recommendation(profile){const pending=sections.filter(s=>['listening','reading','collocation'].includes(s.id)).find(s=>totals(profile,s.id).done<totals(profile,s.id).count);if(pending)return {area:pending.id,message:`아직 풀지 않은 ${pending.title} 문항을 이어서 풀어보세요.`};const weak=['listening','reading','collocation'].sort((a,b)=>totals(profile,a).score/totals(profile,a).max-totals(profile,b).score/totals(profile,b).max)[0];return {area:weak,message:mistakes(profile).length?`${sections.find(s=>s.id===weak).title}의 근거와 표현을 한 번 더 살펴보세요.`:'모든 문제를 이해했어요. 친구에게 가장 기억에 남는 표현을 말해 보세요.'};}
