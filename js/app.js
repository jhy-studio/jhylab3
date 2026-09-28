(function(){
'use strict';

const S=window.ADHD_SCORE;
const D=window.ADHD_DATA;
const $=id=>document.getElementById(id);
const answerLabels=['아니다','조금 아니다','조금 그렇다','그렇다'];
const codeColors={IN:'#dce8c9',HI:'#f4cfad',DP:'#e2d7e8',MA:'#efe2a7',ODD:'#cfe0e4','IN+HI':'#ead9c2'};
const canvasSans='"Gowun Dodum","Malgun Gothic",sans-serif';
const canvasSerif='"Gowun Batang","Batang",serif';
const canvasFont=(weight,size,family=canvasSans)=>weight+' '+size+'px '+family;

function today(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function blankForm(org=''){
  return {type:'low',grade:'4',name:'',sex:'',birth:'',testDate:today(),org};
}

const state={view:'home',form:blankForm(),answers:[],page:0,progressFrom:0,result:null,busy:false};
let renderToken=0;
let exportURL=null;
let loadingTimer=null;

function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function asset(k){
  const fallback={
    homeScene:'assets/scenes/home-final.png',
    resultScene:'assets/scenes/result-garden.png',
    carrot:'assets/ui/carrot-marker.png',
    brandLogo:'assets/ui/adhd-brand-logo.png',
    startButton:'assets/ui/start-button-final.png',
    setupScene:'assets/scenes/child-info-bg.png',
    nextButton:'assets/ui/next-button.png',
    prevButton:'assets/ui/prev-button.png',
  };
  return window.ADHD_ASSETS?.[k]||fallback[k];
}

function stepIndex(){
  return state.view==='home'?0:state.view==='setup'?1:state.view==='test'?2:3;
}

function topbar(){
  const active=stepIndex();
  return '<header class="topbar"><div class="wordmark"><img class="brand-logo" src="'+asset('brandLogo')+'" alt="ADHD 주의력·행동평가"></div><div class="top-status"><span class="step-dots" aria-hidden="true">'+[0,1,2,3].map(i=>'<i class="'+(i===active?'active':'')+'"></i>').join('')+'</span><span class="pill">K-ADHD-SC4</span></div></header>';
}

function footer(){
  return '<footer class="footnote">ADHD 주의력·행동평가</footer>';
}

function home(){
  return '<section class="panel hero-card screen">'
    +'<img class="hero-final-bg" src="'+asset('homeScene')+'" alt="ADHD 주의력·행동평가">'
    +'<button class="hero-final-start" data-action="setup" aria-label="시작하기"><img src="'+asset('startButton')+'" alt="시작하기"></button>'
  +'</section>';
}

function select(id,label,options,value,extraClass=''){
  return '<div class="field '+extraClass+'"><label for="'+id+'">'+label+'</label><select id="'+id+'">'+options.map(([v,l])=>'<option value="'+v+'" '+(v===value?'selected':'')+'>'+l+'</option>').join('')+'</select></div>';
}

function input(id,label,value,extra='',extraClass=''){
  return '<div class="field '+extraClass+'"><label for="'+id+'">'+label+'</label><input id="'+id+'" value="'+esc(value)+'" '+extra+' autocomplete="off"></div>';
}

function typeSelector(value){
  const items=[['low','저학년용','만 4·5·6세 / 초1·초2'],['high','고학년용','10세부터 18세']];
  return '<fieldset class="type-fieldset"><legend>검사 구분</legend><div class="type-selector">'+items.map(([v,title,desc])=>'<div class="type-option"><input type="radio" name="type" id="type-'+v+'" value="'+v+'" '+(value===v?'checked':'')+'><label for="type-'+v+'"><span><strong>'+title+'</strong><span>'+desc+'</span></span></label></div>').join('')+'</div></fieldset>';
}

function setup(){
  const f=state.form;
  const typeItems=[['low','저학년용'],['high','고학년용']];
  return '<section class="setup-visual screen">'
    +'<img class="setup-visual-bg" src="'+asset('setupScene')+'" alt="아동 기본정보">'
    +'<div class="setup-live-controls">'
      +'<fieldset class="setup-control setup-control-type"><legend class="sr-only">유형</legend><div class="setup-segmented">'+typeItems.map(([v,l])=>'<span class="setup-segment"><input type="radio" name="type" id="type-'+v+'" value="'+v+'" '+(f.type===v?'checked':'')+'><label for="type-'+v+'">'+l+'</label></span>').join('')+'</div></fieldset>'
      +'<div class="setup-control setup-control-grade"><label class="sr-only" for="grade">학년도</label><select id="grade">'+S.choices[f.type].map(([v,l])=>'<option value="'+v+'" '+(v===f.grade?'selected':'')+'>'+l+'</option>').join('')+'</select></div>'
      +'<div class="setup-control setup-control-name"><label class="sr-only" for="name">아동 이름</label><input id="name" value="'+esc(f.name)+'" maxlength="40" placeholder="아동 이름을 입력해 주세요." autocomplete="off"></div>'
      +'<fieldset class="setup-control setup-control-sex"><legend class="sr-only">성별</legend><div class="setup-segmented setup-sex-segmented"><span class="setup-segment"><input type="radio" name="sexChoice" id="sex-m" value="M" '+(f.sex==='M'?'checked':'')+'><label for="sex-m">남아</label></span><span class="setup-segment"><input type="radio" name="sexChoice" id="sex-f" value="F" '+(f.sex==='F'?'checked':'')+'><label for="sex-f">여아</label></span></div><select id="sex" class="sr-only" tabindex="-1" aria-hidden="true"><option value=""></option><option value="M" '+(f.sex==='M'?'selected':'')+'>남</option><option value="F" '+(f.sex==='F'?'selected':'')+'>여</option></select></fieldset>'
      +'<div class="setup-control setup-control-birth"><label class="sr-only" for="birth">생년월일</label><input id="birth" value="'+esc(f.birth)+'" inputmode="numeric" maxlength="6" placeholder="예: 200315 (6자리)" autocomplete="off"></div>'
      +'<div class="setup-control setup-control-date"><label class="sr-only" for="testDate">검사일</label><input id="testDate" value="'+esc(f.testDate)+'" type="date"></div>'
      +'<div class="setup-control setup-control-org"><label class="sr-only" for="org">기관명</label><input id="org" value="'+esc(f.org)+'" maxlength="60" placeholder="기관명을 입력해 주세요." autocomplete="off"></div>'
    +'</div>'
    +'<div id="ageInfo" class="sr-only">생년월일을 입력하면 만 나이와 적용 기준을 확인할 수 있습니다.</div>'
    +'<div id="error" class="setup-visual-error" role="alert"></div>'
    +'<div class="setup-nav-images">'
      +'<button class="setup-nav-image setup-prev-image" data-action="home" aria-label="이전"><img src="'+asset('prevButton')+'" alt="이전"></button>'
      +'<button class="setup-nav-image setup-next-image" data-action="start" aria-label="다음"><img src="'+asset('nextButton')+'" alt="다음"></button>'
    +'</div>'
  +'</section>';
}

function questions(){return D[state.form.type].questions;}
function pageQuestions(){return questions().slice(state.page*8,state.page*8+8);}
function pageProgress(){
  const totalPages=Math.max(1,Math.ceil(questions().length/8));
  const currentPage=Math.min(totalPages,state.page+1);
  const completedPages=Math.max(0,Math.min(totalPages,state.page));
  const ratio=completedPages/totalPages;
  const percent=Math.round(ratio*100);
  return {currentPage,totalPages,completedPages,ratio,percent};
}

function updateProgressUI(animate=true){
  if(state.view!=='test')return;
  const root=$('progressRoot');
  const fill=$('progressFill');
  const text=$('progressText');
  const percentEl=$('progressPercent');
  if(!root||!fill||!text||!percentEl)return;
  const {currentPage,totalPages,completedPages,ratio,percent}=pageProgress();
  const fromPages=Math.max(0,Math.min(totalPages,Number.isFinite(state.progressFrom)?state.progressFrom:completedPages));
  const fromRatio=fromPages/totalPages;
  const fromPercent=Math.round(fromRatio*100);
  text.textContent=''+currentPage+' / '+totalPages+' 페이지';
  percentEl.innerHTML='<span class="percent-value">'+percent+'%</span>';
  root.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow',String(completedPages));
  root.querySelector('[role="progressbar"]')?.setAttribute('aria-valuemax',String(totalPages));
  root.style.setProperty('--ratio',animate?fromRatio:ratio);
  fill.style.width=(animate?fromPercent:percent)+'%';
  root.classList.remove('is-animating');
  if(animate&&fromRatio!==ratio){
    requestAnimationFrame(()=>{
      root.classList.add('is-animating');
      root.style.setProperty('--ratio',ratio);
      fill.style.width=percent+'%';
      percentEl.classList.remove('progress-pop');
      void percentEl.offsetWidth;
      percentEl.classList.add('progress-pop');
      state.progressFrom=completedPages;
    });
  }else{
    root.style.setProperty('--ratio',ratio);
    fill.style.width=percent+'%';
    percentEl.classList.remove('progress-pop');
    state.progressFrom=completedPages;
  }
}

function test(){
  const qs=questions();
  const list=pageQuestions();
  const {currentPage,totalPages}=pageProgress();
  return '<section class="questionnaire-frame screen"><div class="questionnaire-paper"><div class="q-headline"><div><p class="eyebrow q-kicker">02 / QUESTIONNAIRE</p><h2>평소 아이의 모습은 어떤가요?</h2><p class="small">'+list[0].no+'–'+list.at(-1).no+'번 · 전체 '+qs.length+'문항</p></div></div><div class="progress-block"><div class="progress-copy"><span id="progressText">'+currentPage+' / '+totalPages+' 페이지</span><strong id="progressPercent"><span class="percent-value">0%</span></strong></div><div class="carrot-progress" id="progressRoot" style="--ratio:0"><div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="'+totalPages+'" aria-valuenow="0" aria-label="완료한 페이지 진행률"><i class="progress-fill" id="progressFill" style="width:0%"></i></div><span class="progress-marker" aria-hidden="true"></span></div></div><div class="questions">'+list.map(q=>'<article class="question" id="q-'+q.no+'"><div class="q-title"><span class="number">'+q.no+'</span><span id="label-'+q.no+'">'+esc(q.text)+'</span></div><div class="options" role="radiogroup" aria-labelledby="label-'+q.no+'">'+answerLabels.map((label,v)=>'<div class="option"><input type="radio" name="q'+q.no+'" id="a-'+q.no+'-'+v+'" data-no="'+q.no+'" value="'+v+'" '+(state.answers[q.no-1]===v?'checked':'')+'><label for="a-'+q.no+'-'+v+'">'+label+'</label></div>').join('')+'</div></article>').join('')+'</div><div id="error" class="error" role="alert"></div><div class="q-footer"><button class="btn" data-action="prev">← 이전</button><span class="page-count">'+(state.page+1)+' / '+Math.ceil(qs.length/8)+' 페이지</span><button class="btn primary" data-action="next">'+(state.page===Math.ceil(qs.length/8)-1?'결과 보기':'다음 →')+'</button></div><button class="text-btn test-edit" data-action="setup">기본정보 수정</button></div></section>';
}

function loading(){
  return '<section class="panel loading-card screen" aria-live="polite"><div class="loading-inner"><p class="eyebrow">ASSESSMENT RESULT IS PREPARING</p><img class="loading-carrot" src="'+asset('carrot')+'" alt=""><h2>관찰 기록을 정리하고 있어요</h2><p class="lead">응답을 바탕으로 평가 결과를 정리하는 중입니다.</p><div class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></div></div></section>';
}

function recordPairs(){
  const f=state.form;
  const r=state.result.rule;
  return [
    ['검사 구분',f.type==='low'?'저학년용':'고학년용'],
    ['적용 기준',r.label+(f.type==='high'?' · '+(f.sex==='M'?'남아':'여아'):'')],
    ['아동 이름',f.name],
    ['성별',f.sex==='M'?'남':'여'],
    ['생년월일',f.birthISO],
    ['실제 나이','만 '+r.actualAge+'세'],
    ['검사일',f.testDate],
    ['기관명',f.org||'—']
  ];
}

function groupQuestions(code){
  return questions().filter(q=>code==='IN+HI'?q.code==='IN'||q.code==='HI':q.code===code);
}

function result(){
  const r=state.result;
  const metadata=recordPairs().map(([k,v])=>'<div class="meta-item"><b>'+k+'</b><span>'+esc(v)+'</span></div>').join('');
  const groups=r.items.map(i=>'<section class="group"><div class="group-title" style="background:'+codeColors[i.code]+'"><h3>'+i.code+' - Lv'+i.level+'</h3><span>'+groupQuestions(i.code).length+'문항</span></div>'+groupQuestions(i.code).map(q=>'<div class="review-row"><span>'+q.no+'</span><span>'+esc(q.text)+'</span><span class="answer '+(state.answers[q.no-1]>=2?'strong':'')+'">'+answerLabels[state.answers[q.no-1]]+'</span></div>').join('')+'</section>').join('');
  const rangeNote=r.rule.outside?'<p class="reference-note">'+esc(r.rule.reason)+' 범위 밖 연령의 해석에는 제한이 있습니다.</p>':'';
  const lowNote=state.form.type==='low'?'<p class="reference-note">제공된 저학년 자료 기준의 참고 환산입니다. 원본 문항 점수와 규준표의 일치 여부를 담당자가 확인해야 합니다.</p>':'';
  return '<section class="panel result-panel screen"><div class="print-page result-page-one"><div class="result-intro"><div><p class="eyebrow">03 / RESULT RECORD</p><h2>ADHD 주의력·행동평가 결과</h2><p class="small">담당자의 설명과 함께 확인하는 결과 기록지입니다.</p></div><span class="pill">'+questions().length+' / '+questions().length+' 응답</span></div><div class="result-toolbar"><button class="btn primary" data-action="save">A4 이미지 저장</button><button class="btn" data-action="print">A4 인쇄 / PDF</button></div><div id="saveStatus" class="save-feedback" role="status"></div><div class="meta-grid">'+metadata+'</div>'+rangeNote+lowNote+'<div class="result-visual"><canvas id="resultCanvas" class="result-canvas" width="1200" height="1320" role="img" aria-label="각 코드의 레벨을 표시한 평가 결과"></canvas><div class="codes">'+r.items.map(i=>'<span class="code-badge" style="background:'+codeColors[i.code]+'">'+i.code+' - Lv'+i.level+'</span>').join('')+'</div></div><p class="reference-note screen-storage-note">점수와 응답은 서버나 브라우저에 자동 저장되지 않습니다. 보관이 필요하면 결과 이미지를 다운로드해 주세요.</p><span class="print-page-number">1 / 2</span></div><div class="print-page result-page-two"><div class="records-heading"><div><p class="eyebrow">RESPONSE RECORD</p><h3>코드별 응답 기록</h3><p class="small">같은 코드의 문항을 모아 확인할 수 있습니다.</p></div><span class="pill">적용 기준 '+esc(r.rule.label)+'</span></div><div class="records-grid">'+groups+'</div><p class="reference-note result-disclaimer">검사 결과만으로 진단을 확정하지 않습니다.</p><span class="print-page-number">2 / 2</span></div><div class="actions result-actions"><button class="btn" data-action="edit">응답 수정</button><button class="btn soft" data-action="reset">새 검사</button></div><div class="print-a4-stage" aria-hidden="true"><canvas id="a4PrintCanvas" width="2480" height="3508"></canvas></div></section>';
}

function render(scroll=true){
  document.body.dataset.screen=state.view;
  const token=++renderToken;
  const view=state.view==='home'?home():state.view==='setup'?setup():state.view==='test'?test():state.view==='loading'?loading():result();
  $('app').innerHTML=topbar()+view+footer();
  if(state.view==='setup')ageInfo(false);
  if(state.view==='test')requestAnimationFrame(()=>updateProgressUI(true));
  if(state.view==='result')Promise.all([paintResult($('resultCanvas')),createExport($('a4PrintCanvas'))]).catch(()=>{if(renderToken===token)$('saveStatus').textContent='결과 그림을 불러오지 못했습니다. 이미지 저장 시 다시 시도합니다.';});
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}

function show(view){
  if(loadingTimer&&view!=='loading'){clearTimeout(loadingTimer);loadingTimer=null;}
  state.view=view;
  render();
}

function readForm(){
  const type=document.querySelector('input[name="type"]:checked')?.value||state.form.type;
  const out={type};
  for(const id of ['grade','name','sex','birth','testDate','org'])out[id]=$(id)?.value.trim()||'';
  return out;
}

function error(msg,id){
  const box=$('error');
  if(!box)return;
  box.textContent=msg;
  box.classList.add('show');
  if(id)$(id)?.focus();
  $('live').textContent=msg;
}

function ageInfo(auto){
  const f=readForm();
  const iso=S.birthISO(f.birth,f.testDate);
  if(!iso){$('ageInfo').textContent='생년월일 6자리와 검사일을 입력해 주세요. 예: 920516';return;}
  const age=S.ageAt(iso,f.testDate);
  if(auto&&$('grade')){
    $('grade').value=S.autoGrade(f.type,age);
    f.grade=$('grade').value;
  }
  const r=S.applied({...f,birthISO:iso});
  $('ageInfo').textContent='생년월일 '+iso+' / 만 '+age+'세 / 적용 기준 '+r.label+(r.outside?' (범위 밖 참고 적용)':'');
}

function start(){
  const f=readForm();
  if(!f.name)return error('아동 이름을 입력해 주세요.','name');
  if(!f.sex)return error('성별을 선택해 주세요.','sex');
  if(!S.validISO(f.testDate))return error('검사일을 확인해 주세요.','testDate');
  f.birthISO=S.birthISO(f.birth,f.testDate);
  if(!f.birthISO)return error('생년월일을 실제 날짜 6자리로 입력해 주세요. 예: 920516','birth');
  if(state.form.type!==f.type&&state.answers.some(v=>v!==null)&&!confirm('검사지 변경 시 기존 응답이 초기화됩니다. 계속할까요?'))return;
  const reset=state.form.type!==f.type||state.answers.length!==D[f.type].questions.length;
  state.form=f;
  if(reset)state.answers=Array(D[f.type].questions.length).fill(null);
  state.result=null;
  state.page=0;
  state.progressFrom=0;
  show('test');
}

function finish(){
  try{state.result=S.calculate(state.form,state.answers);}
  catch(e){error(e.message);return;}
  state.view='loading';
  render();
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  loadingTimer=setTimeout(()=>{loadingTimer=null;if(state.view==='loading')show('result');},reduced?280:1150);
}

function next(){
  const missing=pageQuestions().filter(q=>state.answers[q.no-1]===null);
  if(missing.length){
    error('미응답 문항 '+missing.map(q=>q.no).join(', ')+'번을 확인해 주세요.');
    for(const q of missing)$('q-'+q.no).classList.add('missing');
    const el=$('q-'+missing[0].no);
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.querySelector('input').focus({preventScroll:true});
    return;
  }
  if(state.page<Math.ceil(questions().length/8)-1){state.progressFrom=state.page;state.page++;render();}
  else finish();
}

function reset(){
  if(!confirm('현재 응답과 개인정보를 지우고 새 검사를 시작할까요?'))return;
  const org=state.form.org;
  state.form=blankForm(org);
  state.answers=[];
  state.result=null;
  state.page=0;
  state.progressFrom=0;
  if(exportURL)URL.revokeObjectURL(exportURL);
  exportURL=null;
  show('home');
}

document.addEventListener('input',e=>{
  if(state.view==='setup'&&e.target.id==='birth'){
    e.target.value=e.target.value.replace(/\D/g,'').slice(0,6);
    ageInfo(true);
  }
});

document.addEventListener('change',e=>{
  if(state.view==='setup'){
    if(e.target.name==='sexChoice'){
      if($('sex'))$('sex').value=e.target.value;
    }
    if(e.target.name==='type'){
      const f=readForm();
      $('grade').innerHTML=S.choices[f.type].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
      ageInfo(true);
    }else if(e.target.id==='testDate')ageInfo(true);
    else if(e.target.id==='grade')ageInfo(false);
  }
  if(e.target.matches('input[data-no]')){
    const no=Number(e.target.dataset.no);
    state.answers[no-1]=Number(e.target.value);
    state.result=null;
    $('q-'+no).classList.remove('missing');
  }
});

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');
  if(!b)return;
  const act=b.dataset.action;
  if(state.busy&&act!=='save')return;
  if(act==='setup')show('setup');
  else if(act==='home'){if(state.view==='setup')state.form={...state.form,...readForm()};show('home');}
  else if(act==='start')start();
  else if(act==='prev'){if(state.page===0)show('setup');else{state.progressFrom=state.page;state.page--;render();}}
  else if(act==='next')next();
  else if(act==='edit'){state.page=0;state.progressFrom=0;show('test');}
  else if(act==='reset')reset();
  else if(act==='print')printA4(b);
  else if(act==='save')saveImage(b);
});

const imageCache={};
function loadImage(k){
  if(!imageCache[k])imageCache[k]=new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src=asset(k);
  }).catch(e=>{delete imageCache[k];throw e;});
  return imageCache[k];
}

function round(ctx,x,y,w,h,r,fill,stroke,lineWidth=2){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.lineTo(x+w-rr,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);
  ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);
  ctx.quadraticCurveTo(x,y,x+rr,y);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}

function wrap(ctx,text,width){
  const lines=[];
  let line='';
  for(const c of String(text)){
    if(ctx.measureText(line+c).width>width&&line){lines.push(line);line='';}
    line+=c;
  }
  lines.push(line);
  return lines;
}

function textLines(ctx,text,x,y,width,lineHeight){
  const lines=wrap(ctx,text,width);
  for(const l of lines){ctx.fillText(l,x,y);y+=lineHeight;}
  return y;
}

async function paintResult(canvas){
  if(document.fonts?.ready)await document.fonts.ready;
  const scene=await loadImage('resultScene');
  if(!canvas||!state.result)return;
  const ctx=canvas.getContext('2d');
  const r=state.result;
  canvas.width=1200;
  canvas.height=1320;
  ctx.fillStyle='#f6f8f1';
  ctx.fillRect(0,0,1200,1320);
  ctx.fillStyle='#e88950';
  ctx.beginPath();ctx.arc(58,62,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#40352d';
  ctx.font=canvasFont(800,39,canvasSerif);
  ctx.fillText('ADHD 주의력·행동평가',82,75);
  ctx.fillStyle='#73786f';
  ctx.font=canvasFont(400,21);
  ctx.fillText(state.form.name+' · '+r.rule.label+(state.form.type==='high'?' · '+(state.form.sex==='M'?'남아':'여아'):''),82,111);
  ctx.drawImage(scene,50,150,1100,1100);

  const top=435;
  const bottom=865;
  const n=r.maxLevel;
  const h=(bottom-top)/n;
  const anchors=[[435,682,987],[540,651,1012],[700,628,1022],[865,635,1013]];
  function bounds(y){
    let a=anchors[0],b=anchors.at(-1);
    for(let i=1;i<anchors.length;i++)if(y<=anchors[i][0]){a=anchors[i-1];b=anchors[i];break;}
    const t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));
    return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  }

  for(let level=n;level>=1;level--){
    const y=top+(n-level)*h;
    const mid=y+h/2;
    const codes=r.items.filter(i=>i.level===level);
    const [left,right]=bounds(mid);
    if(level>1){
      const [lineLeft,lineRight]=bounds(y+h);
      ctx.strokeStyle='#70462f';
      ctx.lineWidth=3.5;
      ctx.beginPath();ctx.moveTo(lineLeft+12,y+h);ctx.lineTo(lineRight-12,y+h);ctx.stroke();
    }
    round(ctx,1045,mid-22,105,44,22,'#fff8eb','#b99676',2);
    ctx.fillStyle='#5e4637';
    ctx.font=canvasFont(800,22);
    ctx.textAlign='center';
    ctx.fillText('Lv '+level,1097,mid+8);
    ctx.textAlign='left';
    ctx.strokeStyle='#9a806b';
    ctx.lineWidth=1.5;
    ctx.setLineDash([5,6]);
    ctx.beginPath();ctx.moveTo(right+5,mid);ctx.lineTo(1040,mid);ctx.stroke();
    ctx.setLineDash([]);

    if(codes.length){
      const maxCols=Math.min(3,codes.length);
      const rows=Math.ceil(codes.length/3);
      const chipH=31;
      const gapY=5;
      const totalH=rows*chipH+(rows-1)*gapY;
      const startY=mid-totalH/2;
      codes.forEach((item,index)=>{
        const row=Math.floor(index/3);
        const col=index%3;
        const count=Math.min(3,codes.length-row*3);
        const available=Math.max(150,right-left-34);
        const gapX=6;
        const chipW=Math.min(90,(available-gapX*(count-1))/count);
        const rowW=count*chipW+(count-1)*gapX;
        const x=left+(right-left-rowW)/2+col*(chipW+gapX);
        const cy=startY+row*(chipH+gapY);
        round(ctx,x,cy,chipW,chipH,12,codeColors[item.code],'rgba(92,68,49,.55)',1.4);
        ctx.fillStyle='#403b34';
        ctx.font=canvasFont(800,17);
        ctx.textAlign='center';
        ctx.fillText(item.code,x+chipW/2,cy+21);
        ctx.textAlign='left';
      });
    }
  }

  ctx.fillStyle='#74796f';
  ctx.font=canvasFont(400,18);
  ctx.fillText('적용 기준: '+r.rule.label+' / 실제 나이: 만 '+r.rule.actualAge+'세',55,1280);
  ctx.font=canvasFont(400,15);
  ctx.fillText('담당자의 설명과 함께 확인해 주세요.',55,1307);
  if(r.rule.outside){ctx.textAlign='right';ctx.fillText('범위 밖 연령 · 참고 적용',1145,1280);ctx.textAlign='left';}
  canvas.setAttribute('aria-label',r.items.map(i=>i.code+' Lv'+i.level).join(', ')+' / 적용 기준 '+r.rule.label);
}

async function buildResultVisualCanvas(){
  const visual=document.createElement('canvas');
  visual.width=1200;
  visual.height=1320;
  await paintResult(visual);
  return visual;
}

async function createExport(targetCanvas){
  const resultVisual=await buildResultVisualCanvas();
  const brandLogo=await loadImage('brandLogo');
  const c=targetCanvas||document.createElement('canvas');
  c.width=2480;
  c.height=3508;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#f7faf5';
  ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#eaf5f3';
  ctx.fillRect(0,0,c.width,34);
  const logoW=560, logoH=Math.round(logoW*brandLogo.height/brandLogo.width);
  ctx.drawImage(brandLogo,110,58,logoW,logoH);
  ctx.fillStyle='#738071';ctx.font=canvasFont(400,25);ctx.textAlign='left';ctx.fillText('검사 결과 요약',110,250);

  const pairs=recordPairs();
  const infoX=110,infoY=290,infoW=2260,infoCols=4,cellW=infoW/infoCols,cellH=102;
  pairs.forEach(([label,value],index)=>{
    const col=index%infoCols,row=Math.floor(index/infoCols);
    const x=infoX+col*cellW,y=infoY+row*cellH;
    round(ctx,x,y,cellW-10,cellH-10,16,index%2?'#fbfcf8':'#f2f6ed','#d8dfd2',1.5);
    ctx.fillStyle='#7a7d74';ctx.font=canvasFont(700,18);ctx.fillText(label,x+22,y+30);
    ctx.fillStyle='#403f39';ctx.font=canvasFont(800,28);
    const valueLines=wrap(ctx,String(value),cellW-44).slice(0,2);
    valueLines.forEach((line,i)=>ctx.fillText(line,x+22,y+64+i*27));
  });

  const visualX=110,visualY=522,visualW=1120,visualH=1232;
  round(ctx,visualX-12,visualY-12,visualW+24,visualH+24,28,'#ffffff','#d8dfd2',2);
  ctx.drawImage(resultVisual,visualX,visualY,visualW,visualH);

  const summaryX=1280,summaryY=510,summaryW=1090,summaryH=1256;
  round(ctx,summaryX,summaryY,summaryW,summaryH,30,'#fffdf8','#d8dfd2',2);
  ctx.fillStyle='#657e55';ctx.font=canvasFont(800,24);ctx.fillText('CODE LEVEL',summaryX+54,summaryY+64);
  ctx.fillStyle='#40352d';ctx.font=canvasFont(800,43,canvasSerif);ctx.fillText('척도별 관찰 위치',summaryX+54,summaryY+119);
  ctx.fillStyle='#74796f';ctx.font=canvasFont(400,24);ctx.fillText('적용 기준 '+state.result.rule.label,summaryX+54,summaryY+163);
  let codeY=summaryY+218;
  state.result.items.forEach(item=>{
    round(ctx,summaryX+50,codeY,summaryW-100,92,22,codeColors[item.code],'rgba(82,71,59,.18)',1.6);
    ctx.fillStyle='#403b34';ctx.font=canvasFont(800,34);ctx.fillText(item.code,summaryX+82,codeY+58);
    ctx.textAlign='right';ctx.fillText('Lv '+item.level,summaryX+summaryW-82,codeY+58);ctx.textAlign='left';
    codeY+=110;
  });

  const responseTop=1888,responseBottom=3390,columns=3,gap=28;
  const colW=(2260-gap*(columns-1))/columns;
  let recordLayout=null;
  for(const fontSize of [30,29,28,27,26,25,24,23]){
    const lineHeight=fontSize+9;
    ctx.font=canvasFont(400,fontSize);
    const colItems=Array.from({length:columns},()=>[]);
    const heights=Array(columns).fill(0);
    const prepared=state.result.items.map(item=>{
      const rows=groupQuestions(item.code).map(q=>{
        const lines=wrap(ctx,q.text,colW-232);
        return {q,lines,height:Math.max(52,lines.length*lineHeight+16)};
      });
      const height=58+rows.reduce((sum,row)=>sum+row.height,0);
      return {item,rows,height};
    }).sort((a,b)=>b.height-a.height);
    for(const group of prepared){
      const col=heights.indexOf(Math.min(...heights));
      colItems[col].push(group);
      heights[col]+=group.height+18;
    }
    recordLayout={fontSize,lineHeight,colItems,heights};
    if(Math.max(...heights)<=responseBottom-responseTop)break;
  }

  ctx.fillStyle='#40352d';ctx.font=canvasFont(800,38,canvasSerif);ctx.fillText('코드별 응답 기록',110,1770);
  recordLayout.colItems.forEach((items,col)=>{
    const x=110+col*(colW+gap);
    let y=responseTop;
    for(const group of items){
      round(ctx,x,y,colW,group.height,18,'#fffefa','#d8dfcf',1.5);
      round(ctx,x,y,colW,58,18,codeColors[group.item.code],null);
      ctx.fillStyle='#344239';ctx.font=canvasFont(800,29);ctx.fillText(group.item.code+' - Lv'+group.item.level,x+20,y+38);
      ctx.textAlign='right';ctx.font=canvasFont(700,19);ctx.fillText(group.rows.length+'문항',x+colW-18,y+36);ctx.textAlign='left';
      let rowY=y+58;
      group.rows.forEach((row,index)=>{
        if(index%2===1){ctx.fillStyle='#fafbf6';ctx.fillRect(x+1,rowY,colW-2,row.height);}
        ctx.fillStyle='#718064';ctx.font=canvasFont(800,21);ctx.fillText(String(row.q.no),x+18,rowY+34);
        ctx.fillStyle='#42443e';ctx.font=canvasFont(400,recordLayout.fontSize);
        row.lines.forEach((line,i)=>ctx.fillText(line,x+58,rowY+32+i*recordLayout.lineHeight));
        ctx.fillStyle=state.answers[row.q.no-1]>=2?'#9b603e':'#686b63';ctx.font=canvasFont(800,21);ctx.textAlign='right';ctx.fillText(answerLabels[state.answers[row.q.no-1]],x+colW-16,rowY+34);ctx.textAlign='left';
        ctx.strokeStyle='#e6e9df';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+12,rowY+row.height);ctx.lineTo(x+colW-12,rowY+row.height);ctx.stroke();
        rowY+=row.height;
      });
      y+=group.height+18;
    }
  });
  ctx.fillStyle='#7a7e75';ctx.font=canvasFont(400,19);ctx.fillText('생성일 '+today(),110,3460);
  ctx.textAlign='right';ctx.fillText('검사 결과 요약',2370,3460);ctx.textAlign='left';
  c.setAttribute?.('data-record-overflow',Math.max(...recordLayout.heights)>(responseBottom-responseTop)?'true':'false');
  c.setAttribute?.('data-record-font-size',String(recordLayout.fontSize));
  return c;
}

async function printA4(button){
  if(state.busy)return;
  state.busy=true;
  button.disabled=true;
  const status=$('saveStatus');
  if(status)status.textContent='A4 인쇄 화면을 준비하고 있습니다…';
  try{
    await createExport($('a4PrintCanvas'));
    if(status)status.textContent='';
    window.print();
  }catch(e){
    if(status)status.textContent='인쇄 화면을 준비하지 못했습니다. '+e.message;
  }finally{
    state.busy=false;
    button.disabled=false;
  }
}

async function saveImage(button){
  if(state.busy)return;
  state.busy=true;
  button.disabled=true;
  $('saveStatus').textContent='결과 이미지를 만들고 있습니다…';
  try{
    const c=await createExport();
    const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('이미지 생성에 실패했습니다.')),'image/png'));
    if(exportURL)URL.revokeObjectURL(exportURL);
    exportURL=URL.createObjectURL(blob);
    const filename='ADHD_'+state.form.name.replace(/[\\/:*?"<>|]/g,'_')+'_'+state.form.testDate+'_A4.png';
    const a=document.createElement('a');
    a.href=exportURL;
    a.download=filename;
    document.body.append(a);
    a.click();
    a.remove();
    $('saveStatus').textContent='다운로드를 요청했습니다. 기기의 다운로드 폴더에서 저장 여부를 확인해 주세요.';
  }catch(e){
    $('saveStatus').textContent='이미지를 저장하지 못했습니다. '+e.message;
  }finally{
    state.busy=false;
    button.disabled=false;
  }
}

window.addEventListener('pagehide',()=>{
  if(loadingTimer)clearTimeout(loadingTimer);
  state.answers=[];
  state.result=null;
  state.form=blankForm();
  state.view='home';
  if(exportURL)URL.revokeObjectURL(exportURL);
  exportURL=null;
});

window.addEventListener('pageshow',e=>{if(e.persisted)render();});
if(window.__ADHD_ENABLE_QA__){
  window.__ADHD_QA__={state,home,setup,test,loading,result,recordPairs,paintResult,createExport,render};
}
render();
})();
