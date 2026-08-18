/* ═════════ DATA (embedded at build time) ═════════ */
const SCRIPTS = __CHAT__;
const VOICE   = __VOICE__;
const AUDIO   = __AUDIO__;

/* ═════════ DEVICE BUILDERS ═════════ */
function devPhoneChat(title,sub,{skin='',hstyle='',avStyle=''}={}){
  const root=document.createElement('div');
  root.innerHTML=`<div class="phone"><div class="pscr ${skin}"><div class="notch"></div>
    <div class="chat-h" ${hstyle?`style="${hstyle}"`:''}><span class="av" ${avStyle?`style="${avStyle}"`:''}>R</span><div class="t"><b>${title}</b><span><i></i>${sub}</span></div></div>
    <div class="cbody js-chat"></div>
    <div class="comply js-comply"></div>
    <div class="cinput"><span class="f">Type your message</span><span class="s js-send">➤</span></div>
  </div></div>`;
  return {root:root.firstChild,chat:root.querySelector('.js-chat'),comply:root.querySelector('.js-comply'),mode:'chat',skin};
}
function devBrowser(){
  const root=document.createElement('div');
  root.innerHTML=`<div class="browser">
    <div class="btop"><div class="bdots"><i></i><i></i><i></i></div><div class="burl">🔒 tataaig.com / motor-insurance</div></div>
    <div class="bbody">
      <div class="site">
        <div class="nav"><span class="logo">TATA <b>AIG</b></span><span class="lnk"><span>Plans</span><span>Claims</span><span>Garages</span><span>Help</span></span></div>
        <h3>Motor cover built around your car</h3>
        <p class="sub">Comprehensive protection for every driver — switch insurers without losing what you have earned.</p>
        <div class="pc3">
          <div class="pc"><div class="t">Minimum</div><h4>Third-Party Only</h4><p>Mandatory cover · liability for third-party damage</p><div class="pr">₹7,890 <span>/ yr</span></div></div>
          <div class="pc hot"><div class="t">Recommended</div><h4>Comprehensive</h4><p>Own-damage + third-party · Zero Depreciation available</p><div class="pr">₹28,500 <span>/ yr</span></div></div>
          <div class="pc"><div class="t">Full protection</div><h4>Comprehensive+</h4><p>+ Engine Secure &amp; Roadside Assistance</p><div class="pr">₹30,000 <span>/ yr</span></div></div>
        </div>
      </div>
      <div class="widget">
        <div class="wh"><span class="av">A</span><div class="t"><b>Ananya · AI Policy Advisor</b><span><i></i>Online</span></div></div>
        <div class="cbody js-chat"></div>
        <div class="comply js-comply">Tata AIG · Regulated by IRDAI · T&amp;C apply · Product details in policy wording (illustrative)</div>
      </div>
    </div></div>`;
  return {root:root.firstChild,chat:root.querySelector('.js-chat'),comply:root.querySelector('.js-comply'),mode:'chat',skin:''};
}
function devCall(sub){
  const root=document.createElement('div');
  root.innerHTML=`<div class="phone"><div class="pscr"><div class="notch"></div>
    <div class="call">
      <div class="top"><div class="cb">${sub}</div><h4>Ananya</h4><div class="ct js-timer">00:00</div></div>
      <div class="wave js-wave">${'<i></i>'.repeat(22)}</div>
      <div class="tr-h">Live call transcript</div>
      <div class="tr js-chat"></div>
      <div class="callnote">Recorded for quality &amp; compliance · Consent verified · DND-checked · TRAI compliant</div>
      <div class="cbtns"><span class="cbtn">🔇</span><span class="cbtn end">✕</span><span class="cbtn">⋯</span></div>
    </div></div></div>`;
  return {root:root.firstChild,chat:root.querySelector('.js-chat'),wave:root.querySelector('.js-wave'),timer:root.querySelector('.js-timer'),mode:'call',skin:'call'};
}
function devBuy(title){
  const root=document.createElement('div');
  root.innerHTML=`<div class="phone"><div class="pscr"><div class="notch"></div>
    <div class="buy">
      <div class="buy-h"><b>${title}</b><span class="bstep js-bstep">STEP 3 OF 6</span></div>
      <div class="buy-b js-chat"></div>
      <div class="comply">Tata AIG · Regulated by IRDAI · UIN on policy document · T&amp;C apply (illustrative)</div>
    </div></div></div>`;
  return {root:root.firstChild,chat:root.querySelector('.js-chat'),bstep:root.querySelector('.js-bstep'),mode:'chat',skin:'buy'};
}
const mkWA = (comply)=>({id:'wa',label:'🟢 WhatsApp',mk:()=>devPhoneChat('Ananya · Tata AIG ✓','Official business account',{skin:'wa',avStyle:'background:#128C7E'}),comply});
function devSite(){
  const root=document.createElement('div');
  root.innerHTML=`<div class="browser sitebuy">
    <div class="btop"><div class="bdots"><i></i><i></i><i></i></div><div class="burl">🔒 tataaig.com / buy</div></div>
    <div class="sb-h"><span class="sb-logo">TATA <b>AIG</b></span><span class="bstep js-bstep">STEP 1 OF 4</span></div>
    <div class="sb-b js-chat"></div>
    <div class="comply">Tata AIG · Website is the primary buy channel · Regulated by IRDAI · T&amp;C apply (illustrative)</div>
  </div>`;
  return {root:root.firstChild,chat:root.querySelector('.js-chat'),bstep:root.querySelector('.js-bstep'),mode:'chat',skin:'site'};
}

/* ═════════ CHANNEL CONFIG — WhatsApp-first defaults (voice stays for S6) ═════════ */
const CH = {
2:{def:'wa',list:[
  mkWA('WhatsApp Business API · End-to-end encrypted · General guidance only'),
  {id:'web',label:'💬 Web chat',mk:()=>devPhoneChat('Ananya','AI Vehicle Advisory Agent · Online'),comply:'General guidance on cover &amp; renewal options — always refer to your policy wording'},
  {id:'app',label:'📱 App chat',mk:()=>devPhoneChat('Ananya','Tata AIG App · Vehicle Advisor',{skin:'appc',hstyle:'background:var(--blue)'}),comply:'Tata AIG App · General guidance on cover options — refer to your policy wording'},
  {id:'voice',label:'🎙 Voice',mk:()=>devCall('Tata AIG Web · Voice session'),voice:true},
]},
3:{def:'wa',list:[
  mkWA('WhatsApp Business API · End-to-end encrypted · IRDAI-regulated product info'),
  {id:'web',label:'🌐 D2C website (SOW)',mk:devBrowser},
  {id:'app',label:'📱 App chat',mk:()=>devPhoneChat('Ananya · AI Policy Advisor','Tata AIG App · Online',{skin:'appc',hstyle:'background:var(--blue)'}),comply:'Tata AIG · Regulated by IRDAI · T&amp;C apply (illustrative)'},
  {id:'voice',label:'🎙 Voice',mk:()=>devCall('Tata AIG Web · Voice session'),voice:true},
]},
4:{def:'voice',list:[
  {id:'voice',label:'🎙 Voice call (Genesys)',mk:()=>devCall('Tata AIG · Verified caller'),voice:true},
  mkWA('WhatsApp Business API · End-to-end encrypted · Opt-out anytime: reply STOP'),
]},
5:{def:'wa',list:[
  mkWA('WhatsApp Business API · Messages secured with end-to-end encryption'),
  {id:'voice',label:'🎙 Voice call (SOW)',mk:()=>devCall('Tata AIG · Verified caller'),voice:true},
]},
6:{def:'web',list:[
  {id:'web',label:'🌐 Website (primary)',mk:devSite},
  {id:'voice',label:'🎙 Voice assist',mk:()=>devCall('Tata AIG Website · Voice assist'),voice:true},
]},
7:{def:'wa',list:[
  mkWA('Tata AIG on WhatsApp · Regulated by IRDAI · T&amp;C apply (illustrative)'),
  {id:'app',label:'📱 In-app (SOW)',mk:()=>devBuy('Complete Your Application')},
  {id:'web',label:'🌐 Web chat',mk:()=>devPhoneChat('Ananya · AI Buying Agent','tataaig.com · Online'),comply:'Tata AIG · Regulated by IRDAI · UIN on policy document · T&amp;C apply (illustrative)'},
  {id:'voice',label:'🎙 Voice',mk:()=>devCall('Tata AIG App · Voice session'),voice:true},
]},
};
const CRM_ID = {2:'crm2',3:'crm3',4:'crm4',5:'crm5',6:'crm6',7:'crm7'};
const chosen = {}; Object.keys(CH).forEach(k=>chosen[k]=CH[k].def);

/* ═════════ CORE STATE ═════════ */
let cur=0, runId=0, secTimer=null, soundOn=true, curSrc=null;
let beats=[], beatIdx=0, busy=false, autoOn=false;
const N=9;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const el=h=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild;};
const $=id=>document.getElementById(id);

const dots=$('dots');
for(let i=0;i<N;i++){const d=document.createElement('button');d.className='dot'+(i===0?' on':'');d.onclick=()=>go(i);dots.appendChild(d);}

Object.keys(CH).forEach(n=>{
  const holder=$('ch'+n); if(!holder)return;
  CH[n].list.forEach(c=>{
    const b=document.createElement('button');
    b.className='chbtn'+(c.id===CH[n].def?' on':'');
    b.textContent=c.label;
    b.onclick=()=>{chosen[n]=c.id;holder.querySelectorAll('.chbtn').forEach(x=>x.classList.toggle('on',x===b));if(cur===+n)startScene(+n);};
    holder.appendChild(b);
  });
});

function stopAll(){
  runId++; busy=false; setAuto(false);
  if(secTimer){clearInterval(secTimer);secTimer=null;}
  if(curSrc){try{curSrc.stop();}catch(e){} curSrc=null;}
  if(window.speechSynthesis) speechSynthesis.cancel();
}
function go(n){
  if(n<0||n>N-1)return;
  stopAll();
  cur=n;
  document.querySelectorAll('.slide').forEach(s=>s.classList.toggle('on',+s.dataset.i===n));
  document.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('on',i===n));
  beats=[];beatIdx=0;
  if(n===1) startMkt();
  else if(SCRIPTS[String(n)]) startScene(n);
  else updateBeatUI();
}
function replay(){ if(cur===1){stopAll();startMkt();} else if(SCRIPTS[String(cur)]){stopAll();startScene(cur);} }

/* ═════════ Neural voice playback — Web Audio (autoplay-proof) ═════════ */
let actx=null; const audioBuf={};
function ensureCtx(){
  if(!actx){const AC=window.AudioContext||window.webkitAudioContext; if(AC){try{actx=new AC();}catch(e){actx=null;}}}
  return actx;
}
async function unlockAudio(){
  const c=ensureCtx();
  if(c&&c.state==='suspended'){try{await c.resume();}catch(e){}}
  if(c&&c.state==='running') hideGate();
  return c&&c.state==='running';
}
document.addEventListener('pointerdown',()=>{unlockAudio();},true);
document.addEventListener('keydown',()=>{unlockAudio();},true);
function b64buf(b64){const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function getBuf(key){
  if(audioBuf[key])return Promise.resolve(audioBuf[key]);
  const c=ensureCtx(); if(!c||!AUDIO[key])return Promise.resolve(null);
  return new Promise(res=>{
    try{ c.decodeAudioData(b64buf(AUDIO[key]), buf=>{audioBuf[key]=buf;res(buf);}, ()=>res(null)); }
    catch(e){res(null);}
  });
}
function showGate(){const g=$('sndgate');if(g)g.style.display='inline-flex';}
function hideGate(){const g=$('sndgate');if(g)g.style.display='none';}
async function gateClick(){ if(await unlockAudio()){hideGate();replay();} }
async function testVoice(){
  if(!(await unlockAudio())){showGate();return;}
  const buf=await getBuf('sc4_0'); if(!buf)return;
  if(curSrc){try{curSrc.stop();}catch(e){}}
  const s=actx.createBufferSource();s.buffer=buf;s.connect(actx.destination);curSrc=s;
  s.onended=()=>{if(curSrc===s)curSrc=null;};
  s.start();
}
function toggleSound(){
  soundOn=!soundOn;
  const b=$('sndbtn');
  b.classList.toggle('off',!soundOn);
  b.textContent=soundOn?'🔊 Voice on':'🔇 Voice off';
  if(!soundOn){if(curSrc){try{curSrc.stop();}catch(e){}curSrc=null;} if(window.speechSynthesis)speechSynthesis.cancel();}
  else unlockAudio();
}
let vAnanya=null,vRaj=null;
function pickVoices(){
  if(!window.speechSynthesis)return;
  const vs=speechSynthesis.getVoices();
  const inV=vs.filter(v=>/en[-_]IN/i.test(v.lang));
  const enV=vs.filter(v=>/^en/i.test(v.lang));
  vAnanya=inV.find(v=>/female|Heera|Kalpana|Veena|Neerja/i.test(v.name))||inV[0]||enV.find(v=>/female|Zira|Samantha/i.test(v.name))||enV[0]||null;
  vRaj=inV.find(v=>/male|Ravi|Hemant|Prabhat/i.test(v.name))||inV[1]||enV.find(v=>/male|David|Daniel/i.test(v.name))||enV[1]||vAnanya;
}
if(window.speechSynthesis){pickVoices();speechSynthesis.onvoiceschanged=pickVoices;}
async function speak(text,who,key){
  if(!soundOn) return false;
  if(key&&AUDIO[key]){
    const c=ensureCtx();
    if(c){
      if(c.state==='suspended'){try{await c.resume();}catch(e){}}
      if(c.state==='running'){
        const buf=await getBuf(key);
        if(buf){
          return await new Promise(res=>{
            const s=c.createBufferSource();s.buffer=buf;s.connect(c.destination);
            curSrc=s;let done=false;
            s.onended=()=>{if(!done){done=true;if(curSrc===s)curSrc=null;res(true);}};
            try{s.start();}catch(e){done=true;res(false);}
            setTimeout(()=>{if(!done){done=true;res(true);}},buf.duration*1000+1500);
          });
        }
      } else { showGate(); return false; }
    }
    const ok=await new Promise(res=>{
      const a=new Audio('data:audio/mpeg;base64,'+AUDIO[key]);
      let done=false;const fin=v=>()=>{if(!done){done=true;res(v);}};
      a.onended=fin(true);a.onerror=fin(false);
      a.play().then(()=>{},()=>{showGate();fin(false)();});
      setTimeout(fin(true),20000);
    });
    if(ok)return true;
  }
  if(!window.speechSynthesis)return false;
  return await new Promise(res=>{
    const u=new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g,''));
    u.voice=who==='ai'?vAnanya:vRaj;
    u.rate=1.04;u.pitch=who==='ai'?1.12:0.86;
    let done=false;const fin=()=>{if(!done){done=true;res(true);}};
    u.onend=fin;u.onerror=fin;
    setTimeout(fin,Math.min(16000,900+text.length*58));
    speechSynthesis.speak(u);
  });
}

/* ═════════ RENDER HELPERS ═════════ */
function crmRow(crmEl,c){
  if(!c||!crmEl)return;
  crmEl.appendChild(el(`<div class="crow ${c.cls||''}">${c.x}</div>`));
  crmEl.scrollTop=1e6;
}
function bubble(st,skin){
  const src=st.src?`<span class="src">⛨ ${st.src}</span>`:'';
  const tick=(skin==='wa'&&st.k)?`<span class="tick">${st.k} ✓✓</span>`:'';
  return el(`<div class="m ${st.t==='bot'?'bot':'usr'}">${st.x}${src}${tick}</div>`);
}

/* ═════════ BEAT COMPILER — every → is one beat ═════════ */
function compileBeats(steps,dev,crmEl,id){
  const box=dev.chat, skin=dev.skin, out=[];
  const add=(type,fn)=>out.push({type,fn});
  for(const st of steps){
    if(st.t==='note') add('note',async()=>{
      box.appendChild(el(`<div class="note">${st.x}</div>`));box.scrollTop=1e6;crmRow(crmEl,st.crm);});
    else if(st.t==='sys') add('sys',async()=>{
      box.appendChild(el(`<div class="tl sy"><p>${st.x}</p></div>`));box.scrollTop=1e6;crmRow(crmEl,st.crm);});
    else if(st.t==='bot'){
      add('bot',async()=>{
        const ty=el('<div class="typing"><i></i><i></i><i></i></div>');
        box.appendChild(ty);box.scrollTop=1e6;
        await sleep(700); if(id!==runId){ty.remove();return;}
        ty.remove();
        const b=bubble(st,skin);
        if(st.btns) b.appendChild(el(`<div class="qr">${st.btns.opts.map(o=>`<i>${o}</i>`).join('')}</div>`));
        box.appendChild(b);box.scrollTop=1e6;
        crmRow(crmEl,st.crm);
        if(st.btns) st._qr=b.querySelector('.qr');
      });
      if(st.btns) add('pick',async()=>{
        const qr=st._qr; if(!qr)return;
        qr.querySelectorAll('i').forEach((it,ix)=>it.classList.add(ix===st.btns.pick?'sel':'dim'));
        await sleep(500); if(id!==runId)return;
        const label=st.btns.opts[st.btns.pick].replace(/\s*(👴|☎️|→|👇)\s*$/,'');
        box.appendChild(el(`<div class="m usr">${label}${skin==='wa'?'<span class="tick">✓✓</span>':''}</div>`));
        box.scrollTop=1e6;
      });
    
      if(st.sheet) add('sheet',async()=>{
        const host = box.closest('.pscr') || box.closest('.widget') || box.parentElement;
        const sh = el(`<div class="sheet-wrap"><div class="sheet-scrim"></div><div class="sheet">
          <div class="sheet-h">${st.sheet.title}</div>
          ${st.sheet.opts.map(o=>`<div class="sheet-row"><i></i><span>${o}</span></div>`).join('')}
          <div class="sheet-cancel">CANCEL</div></div></div>`);
        host.appendChild(sh);box.scrollTop=1e6;
        await sleep(900); if(id!==runId){sh.remove();return;}
        sh.querySelectorAll('.sheet-row')[st.sheet.pick].classList.add('sel');
        await sleep(650); if(id!==runId){sh.remove();return;}
        sh.classList.add('closing');
        await sleep(280); sh.remove();
        const label=st.sheet.opts[st.sheet.pick];
        box.appendChild(el(`<div class="m usr">${label}${skin==='wa'?'<span class="tick">✓✓</span>':''}</div>`));
        box.scrollTop=1e6;
      });
    }
    else if(st.t==='snote') add('note',async()=>{ crmRow(crmEl,st.crm); });
    else if(st.t==='doc') add('doc',async()=>{
      const cls = skin==='wa' ? 'doc-in wa-doc' : 'doc-in';
      const a=el(`<div class="${cls}"><div class="af"><span class="pdf">PDF</span><div class="an"><b>${st.name}</b><span>${st.size} · PDF · tap to view</span></div></div><span class="tick">${st.k||''}</span></div>`);
      box.appendChild(a);box.scrollTop=1e6;
      crmRow(crmEl,st.crm);});
    else if(st.t==='usr') add('usr',async()=>{
      box.appendChild(bubble(st,skin));box.scrollTop=1e6;crmRow(crmEl,st.crm);});
    else if(st.t==='card') add('card',async()=>{
      box.appendChild(el(`<div class="icard ${st.cls||''}">${st.html}</div>`));box.scrollTop=1e6;crmRow(crmEl,st.crm);});
    else if(st.t==='upload') add('upload',async()=>{
      const a=el(`<div class="attach"><div class="af"><span class="pdf">PDF</span><div class="an"><b>${st.name}</b><span>${st.size} · PDF</span></div></div><div class="abar"><i></i></div><span class="tick">${st.k} 🕓</span></div>`);
      box.appendChild(a);box.scrollTop=1e6;
      const bar=a.querySelector('.abar i'),tick=a.querySelector('.tick');
      for(let p=0;p<=100;p+=10){if(id!==runId)return;bar.style.width=p+'%';await sleep(110);}
      a.querySelector('.abar').style.display='none';
      tick.textContent=`${st.k} ✓✓`;
      crmRow(crmEl,st.crm);});
    else if(st.t==='ai'||st.t==='cu') add('voice',async()=>{
      const isAI=st.t==='ai';
      box.appendChild(el(`<div class="tl ${st.t}"><div class="w">${isAI?'KIARA · AI':'ARJUN'}</div><p>${st.x}</p></div>`));
      box.scrollTop=1e6;
      crmRow(crmEl,st.crm);
      if(dev.wave)dev.wave.classList.toggle('on',isAI);
      const spoke=await speak(st.x,st.t,st.key);
      if(id!==runId)return;
      if(!spoke)await sleep(Math.min(6000,700+st.x.length*34));
      if(dev.wave)dev.wave.classList.remove('on');});
    else if(st.t==='cta') add('cta',async()=>{
      box.appendChild(el(`<div class="icard" style="padding:8px"><div class="cta js-pay">${st.x}</div></div>`));
      box.scrollTop=1e6;});
    else if(st.t==='press') add('press',async()=>{
      const b=box.querySelector('.js-pay');
      if(b){b.classList.add('pressed');b.textContent='Processing payment…';}
      if(dev.bstep)dev.bstep.textContent='STEP 6 OF 6';
      await sleep(1400);
      if(b)b.closest('.icard').remove();});
    /* ── website buy-flow beats ── */
    else if(st.t==='wstep') add('wstep',async()=>{
      if(dev.bstep)dev.bstep.textContent=st.x;});
    else if(st.t==='wbot') add('wbot',async()=>{
      const ty=el('<div class="typing"><i></i><i></i><i></i></div>');
      box.appendChild(ty);box.scrollTop=1e6;await sleep(600);if(id!==runId){ty.remove();return;}
      ty.remove();
      box.appendChild(el(`<div class="wmsg">${st.x}</div>`));box.scrollTop=1e6;});
    else if(st.t==='wpick') add('wpick',async()=>{
      const row=el(`<div class="wpickrow">${st.opts.map((o,i)=>`<button class="wopt${i===st.pick?' pk':''}">${o}</button>`).join('')}</div>`);
      box.appendChild(row);box.scrollTop=1e6;
      await sleep(500);if(id!==runId)return;
      row.querySelectorAll('.wopt').forEach((b,i)=>{b.classList.toggle('chosen',i===st.pick);b.classList.toggle('faded',i!==st.pick);});
      crmRow(crmEl,st.crm);});
    else if(st.t==='wplans') add('wplans',async()=>{
      const row=el(`<div class="wplans">${st.opts.map((o,i)=>`<div class="wplan${i===st.pick?' pk':''}">${o.tag?`<span class="wtag">${o.tag}</span>`:''}<b>${o.name}</b><span class="ws">${o.sub}</span><div class="wpr">${o.price}<i>/yr</i></div></div>`).join('')}</div>`);
      box.appendChild(row);box.scrollTop=1e6;
      await sleep(600);if(id!==runId)return;
      row.querySelectorAll('.wplan').forEach((p,i)=>{if(i!==st.pick)p.classList.add('faded');});
      crmRow(crmEl,st.crm);});
    else if(st.t==='wcard') add('wcard',async()=>{
      box.appendChild(el(`<div class="icard ${st.cls||''}">${st.html}</div>`));box.scrollTop=1e6;crmRow(crmEl,st.crm);});
    else if(st.t==='wcta') add('wcta',async()=>{
      box.appendChild(el(`<div class="icard" style="padding:8px"><div class="cta js-pay">${st.x}</div></div>`));box.scrollTop=1e6;});
    else if(st.t==='wpress') add('wpress',async()=>{
      const b=box.querySelector('.js-pay');
      if(b){b.classList.add('pressed');b.textContent='Processing payment…';}
      await sleep(1400);if(b)b.closest('.icard').remove();});
    else if(st.t==='wnote') add('wnote',async()=>{
      box.appendChild(el(`<div class="note">${st.x}</div>`));box.scrollTop=1e6;crmRow(crmEl,st.crm);});
  }
  return out;
}

function startScene(n){
  stopAll();
  const id=runId;
  const cfg=CH[n], chan=cfg.list.find(c=>c.id===chosen[n]);
  const stage=$('stage'+n);
  stage.innerHTML='';
  const dev=chan.mk();
  stage.appendChild(dev.root);
  if(dev.comply&&chan.comply)dev.comply.innerHTML=chan.comply;
  const crmEl=$(CRM_ID[n]); crmEl.innerHTML='';
  const steps = chan.voice ? VOICE[String(n)] : SCRIPTS[String(n)];
  if(chan.voice){steps.filter(s=>s.key).slice(0,4).forEach(s=>getBuf(s.key));}
  if(dev.mode==='call') startClock(dev.timer,id);
  beats=compileBeats(steps,dev,crmEl,id);
  beatIdx=0;
  updateBeatUI();
}

/* ═════════ MARKETING SCENE as beats ═════════ */
function showSrc(which,label){
  ['scrG','scrF','scrP'].forEach(s=>{const n=$(s);if(n)n.classList.toggle('show',s===which);});
  const l=$('srclabel');if(l)l.textContent=label;
}
function startMkt(){
  stopAll();
  const id=runId;
  ['mk1','mk2','mk3','mk4','mk5'].forEach(m=>$(m).classList.remove('lit'));
  $('mkad').classList.remove('show');
  showSrc('none','CAMPAIGN PREVIEW');
  const crmEl=$('crm1');crmEl.innerHTML='';
  const B=(type,fn)=>({type,fn});
  beats=[
    B('mkt',async()=>{$('mk1').classList.add('lit');crmRow(crmEl,{x:'<b>Campaign CMP-2214 approved</b> · objective: motor renewal &amp; NCB retention · budget split Google/Meta/partners',cls:''});}),
    B('mkt',async()=>{$('mk2').classList.add('lit');crmRow(crmEl,{x:'Google + Meta clicks & 2 demand partners ingested · deduped → <b>unified lead profiles (UDP/CDP)</b> · scored',cls:''});}),
    B('mkt',async()=>{$('mk3').classList.add('lit');crmRow(crmEl,{x:'<b>Cohort C-206</b> · car owners with renewal due &amp; strong NCB history · 52,400 · propensity 0.79 · Tata AIG ✓',cls:'ok'});}),
    B('mkt',async()=>{$('mk4').classList.add('lit');showSrc('scrG','LIVE · GOOGLE SEARCH AD');crmRow(crmEl,{x:'Serving on <b>Google Search</b> · kw "car insurance renewal online"',cls:''});}),
    B('mkt',async()=>{crmRow(crmEl,{x:'<b>Lead captured · Google ad</b> · TATAAIG-40881 · attribution: CMP-2214/google-cpc',cls:'ok'});}),
    B('mkt',async()=>{showSrc('scrF','LIVE · FACEBOOK FEED AD');crmRow(crmEl,{x:'Serving on <b>Facebook/Instagram</b> · lookalike of converters',cls:''});}),
    B('mkt',async()=>{crmRow(crmEl,{x:'<b>Lead captured · Facebook ad</b> · TATAAIG-40922 · attribution: CMP-2214/meta-feed',cls:'ok'});}),
    B('mkt',async()=>{$('mk5').classList.add('lit');showSrc('scrP','LIVE · PARTNER APP TILE');crmRow(crmEl,{x:'Serving on <b>CRED</b> · partner-app tile · cohort C-206',cls:''});await sleep(500);if(id!==runId)return;$('mkad').classList.add('show');}),
    B('mkt',async()=>{const t=$('mktap');t.classList.remove('go');void t.offsetWidth;t.classList.add('go');crmRow(crmEl,{x:'<b>CLICK → Vikram · CRED tile · TATAAIG-40217</b> · attribution CMP-2214/C-206 stored → funnel',cls:'ok'});}),
  ];
  beatIdx=0;
  updateBeatUI();
}

/* ═════════ STEPPING ═════════ */
async function nextStep(){
  if(busy)return;
  if(!beats.length){ go(cur+1); return; }        // title / close slides
  if(beatIdx>=beats.length){ go(cur+1); return; } // stage finished
  busy=true;
  const id=runId;
  try{ await beats[beatIdx].fn(); }catch(e){}
  if(id===runId) beatIdx++;
  busy=false;
  updateBeatUI();
}
const AUTO_GAP={note:900,sys:900,bot:1300,pick:700,usr:1000,card:2300,upload:600,cta:1300,press:600,voice:260,mkt:1600};
function setAuto(v){
  autoOn=v;
  const b=$('autobtn'); if(b){b.classList.toggle('playing',v);b.innerHTML=v?'❚❚ Pause':'▶ Auto';}
}
async function toggleAuto(){
  if(autoOn){setAuto(false);return;}
  setAuto(true);
  const id=runId;
  while(autoOn && id===runId && beatIdx<beats.length){
    const t=beats[beatIdx].type;
    await nextStep();
    if(!autoOn||id!==runId)break;
    await sleep(AUTO_GAP[t]||1000);
  }
  if(id===runId) setAuto(false);
}
function updateBeatUI(){
  const lbl=$('beatlbl'), btn=$('stepbtn');
  if(!lbl||!btn)return;
  if(!beats.length){ lbl.textContent = cur===0?'Press → to begin':(cur===N-1?'End — → to replay':'');
    btn.innerHTML = cur===N-1 ? '↺ Replay <kbd>→</kbd>' : 'Next stage <kbd>→</kbd>'; return; }
  if(beatIdx>=beats.length){ lbl.textContent='Stage complete'; btn.innerHTML='Next stage <kbd>→</kbd>'; }
  else { lbl.textContent=`Step ${beatIdx+1} of ${beats.length}`; btn.innerHTML='Next step <kbd>→</kbd>'; }
}
function startClock(nEl,id){
  let s=0;nEl.textContent='00:00';
  secTimer=setInterval(()=>{
    if(id!==runId){clearInterval(secTimer);return;}
    s++;nEl.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  },1000);
}

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();if(cur===N-1&&!beats.length){go(0);}else nextStep();}
  if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1);}
  if(e.key.toLowerCase()==='r'){replay();}
  if(e.key.toLowerCase()==='m'){toggleSound();}
  if(e.key.toLowerCase()==='a'){toggleAuto();}
  if(e.key>='0'&&e.key<='7'){go(+e.key);}
});
updateBeatUI();
