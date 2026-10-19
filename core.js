(function(root){
'use strict';
const DAY=86400000;
const fresh=()=>({version:2,attempts:[],reviews:{},notes:{}});
function dayKey(time=Date.now()){return new Date(time+9*3600000).toISOString().slice(0,10);}
function record(state,q,choice,now=Date.now()){
 if(!Number.isInteger(choice)||choice<0||choice>=q.options.length)throw Error('답안을 선택해 주세요.');
 const correct=choice===q.answer;
 const attempt={id:now+'-'+Math.random().toString(36).slice(2),qid:q.id,exam:q.exam,subject:q.subject,choice,correct,at:now};
 state.attempts.push(attempt);
 let r=state.reviews[q.id];
 if(!correct){state.reviews[q.id]={anchor:now,stage:0,due:now+DAY,resolved:false};}
 else if(r&&!r.resolved&&now>=r.due){
  r.stage++;
  if(r.stage>=3){r.resolved=true;r.due=null;}
  else r.due=Math.max(r.anchor+[1,3,7][r.stage]*DAY,now+DAY);
 }
 return attempt;
}
function summary(state,questions,now=Date.now()){
 const ids=new Set(questions.map(q=>q.id)),a=state.attempts.filter(x=>ids.has(x.qid));
 const days=new Set(a.map(x=>dayKey(x.at)));let streak=0,t=now;
 if(!days.has(dayKey(t)))t-=DAY;
 while(days.has(dayKey(t))){streak++;t-=DAY;}
 return {total:a.length,unique:new Set(a.map(x=>x.qid)).size,correct:a.filter(x=>x.correct).length,today:a.filter(x=>dayKey(x.at)===dayKey(now)).length,streak,due:questions.filter(q=>state.reviews[q.id]&&!state.reviews[q.id].resolved&&state.reviews[q.id].due<=now).length};
}
function validateState(s,questions){
 if(!s||s.version!==2||!Array.isArray(s.attempts)||!s.reviews||!s.notes||Array.isArray(s.reviews)||Array.isArray(s.notes))throw Error('지원하지 않는 백업 형식입니다.');
 const map=new Map(questions.map(q=>[q.id,q]));
 for(const a of s.attempts){const q=map.get(a.qid);if(!q||a.exam!==q.exam||a.subject!==q.subject||!Number.isInteger(a.choice)||a.choice<0||a.choice>=q.options.length||a.correct!==(a.choice===q.answer)||!Number.isFinite(a.at)||a.at<0||typeof a.id!=='string')throw Error('풀이 기록이 올바르지 않습니다.');}
 for(const [id,r] of Object.entries(s.reviews)){if(!map.has(id)||!r||!Number.isInteger(r.stage)||r.stage<0||r.stage>3||!Number.isFinite(r.anchor)||typeof r.resolved!=='boolean'||(r.resolved?(r.due!==null||r.stage!==3):(!Number.isFinite(r.due)||r.stage>=3||r.due<r.anchor)))throw Error('복습 기록이 올바르지 않습니다.');}
 for(const [id,n]of Object.entries(s.notes)){if(!map.has(id)||typeof n!=='string'||n.length>5000)throw Error('메모가 올바르지 않습니다.');}
 return {version:2,attempts:s.attempts,reviews:s.reviews,notes:s.notes};
}
const api={DAY,fresh,dayKey,record,summary,validateState};
if(typeof module!=='undefined')module.exports=api;else root.CoachCore=api;
})(typeof window!=='undefined'?window:this);
