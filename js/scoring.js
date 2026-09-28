/* Raw-score thresholds transcribed from uploaded 1.jpg (high) / 2.jpg (low).
 * This preserves the supplied workbook's 0–3 inputs and SUM keys, including low DP omission #28.
 * Low workbook and norm sheet are not reconciled: outputs are explicitly reference-only.
 */
(function(root){
 'use strict';
 const choices={low:[['4','만 4세'],['5','만 5세'],['6','만 6세'],['G1','초1'],['G2','초2']],high:Array.from({length:9},(_,i)=>[String(i+10),(i+10)+'세'])};
 // Low levels: 1 below first threshold; then 2 stable, 3 attention, 4 caution, 5 risk, 6 very high.
 // Each array: minimum raw score for Lv2, Lv3, Lv4, Lv5, Lv6.
 const low={
  IN:{4:[16,20,31,36,38],5:[19,31,39,51,59],6:[16,29,39,45,50],G1:[20,36,41,44,50],G2:[20,35,42,48,51]},
  HI:{4:[14,18,23,24,29],5:[14,18,22,27,37],6:[14,16,20,24,29],G1:[14,20,27,32,37],G2:[15,22,30,39,46]},
  DP:{4:[7,8,10,13,15],5:[7,9,12,16,18],6:[7,9,10,13,16],G1:[8,12,15,18,19],G2:[7,13,17,20,22]},
  MA:{4:[4,7,8,10,12],5:[5,9,10,12,13],6:[5,10,12,13,13],G1:[4,8,10,13,14],G2:[6,10,13,14,15]},
  ODD:{4:[8,10,12,14,16],5:[8,11,14,18,20],6:[8,11,13,15,18],G1:[9,15,19,20,23],G2:[10,17,20,21,23]}
 };
 // A blank risk row (MA 6세) has no distinct integer score. Both cutoffs at 13 means Lv5 is unreachable, matching the sheet.
 const high={
  M:{young:{IN:[12,17],HI:[11,16],ODD:[10,14],'IN+HI':[22,32]},older:{IN:[12,17],HI:[8,12],ODD:[10,14],'IN+HI':[18,26]}},
  F:{young:{IN:[10,14],HI:[9,13],ODD:[9,13],'IN+HI':[17,24]},older:{IN:[10,14],HI:[6,9],ODD:[9,13],'IN+HI':[14,21]}}
 };
 function validISO(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const [y,m,d]=s.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d}
 function birthISO(input,test){if(!validISO(test)||!/^\d{6}$/.test(input||''))return null;const yy=Number(input.slice(0,2)),mm=input.slice(2,4),dd=input.slice(4,6);let iso=(2000+yy)+'-'+mm+'-'+dd;if(iso>test)iso=(1900+yy)+'-'+mm+'-'+dd;return validISO(iso)&&iso<=test?iso:null}
 function ageAt(b,t){if(!validISO(b)||!validISO(t)||b>t)return null;return Number(t.slice(0,4))-Number(b.slice(0,4))-(t.slice(5)<b.slice(5)?1:0)}
 function autoGrade(type,age){return type==='high'?String(Math.max(10,Math.min(18,age))):age<=4?'4':age===5?'5':age===6?'6':age===7?'G1':'G2'}
 function applied(form){const age=ageAt(form.birthISO,form.testDate);if(age===null)throw new Error('생년월일과 검사일을 확인해 주세요.');const min=form.type==='low'?4:10,max=form.type==='low'?8:18;const outside=age<min||age>max;const key=outside?autoGrade(form.type,age):form.grade;const item=choices[form.type]?.find(x=>x[0]===key);if(!item)throw new Error('학년 기준을 선택해 주세요.');return {actualAge:age,key,label:item[1],outside,reason:outside?'실제 나이가 선택 검사지 범위 밖이므로 '+item[1]+' 기준을 참고 적용했습니다.':''}}
 function raw(type,answers){const source=root.ADHD_DATA[type];if(answers.length!==source.questions.length||Array.from(answers).some(v=>!Number.isInteger(v)||v<0||v>3))throw new Error('모든 문항을 확인해 주세요.');const out={};for(const [code,nums] of Object.entries(source.keys))out[code]=nums.reduce((s,n)=>s+answers[n-1],0);if(type==='high')out['IN+HI']=out.IN+out.HI;return out}
 function level(type,code,score,key,sex){const cuts=type==='low'?low[code][key]:high[sex][Number(key)<=12?'young':'older'][code];let lv=1;for(let i=0;i<cuts.length;i++)if(score>=cuts[i])lv=i+2;return lv}
 function calculate(form,answers){const rule=applied(form),scores=raw(form.type,answers);const codes=form.type==='low'?['IN','HI','DP','MA','ODD']:['IN','HI','ODD','IN+HI'];return {rule,maxLevel:form.type==='low'?6:3,items:codes.map(code=>({code,level:level(form.type,code,scores[code],rule.key,form.sex),raw:scores[code]})),reference:form.type==='low'||rule.outside}}
 root.ADHD_SCORE={choices,low,high,validISO,birthISO,ageAt,autoGrade,applied,raw,level,calculate};
})(typeof window!=='undefined'?window:globalThis);
