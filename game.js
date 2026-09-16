/* Continuous embodied play: movement, carrying, tuning, circulation, and verification. */
(() => {
'use strict';
const $=id=>document.getElementById(id), M=Echoes, canvas=$('world');
let view;
try { if(!window.THREE)throw new Error('The local 3D renderer did not load.'); view=createEchoScene(canvas); }
catch(error){$('load-error').hidden=false;$('error-message').textContent=error.message;return;}
let state=M.createSession(), player={x:0,s:3,y:0,vy:0,yaw:0,pitch:0};
let time=0,last=0,started=false,assisted=false,sound=false,audio=null,ambient=null,ambientGain=null;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,drag=null,captionEnd=0,revealEnd=0,echoStart=0;
let nearest=null,lastStep=-1,lastPulse=-1,uiClock=0,restingSince=-1,lost=false;
const keys=new Set(),dialogs=[...document.querySelectorAll('dialog')];
const paused=()=>dialogs.some(d=>d.open);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=p=>Math.hypot(player.x-p.x,player.s-p.s);
/* Skip DOM writes that change nothing: updateUI runs several times a second. */
const setText=(id,value)=>{const el=$(id);if(el.textContent!==value)el.textContent=value;};
function focusWorld(){if(!paused())canvas.focus({preventScroll:true});}
function modal(id){keys.clear();drag=null;if(document.pointerLockElement)document.exitPointerLock();dialogs.forEach(d=>d.open&&d.close());$(id).showModal();if(audio)audio.suspend().catch(()=>{});}
function close(id){$(id).close();focusWorld();if(sound&&audio)audio.resume().catch(()=>{});}
function say(text,seconds=7){$('caption').textContent=text;captionEnd=time+seconds;}
function makeAudio(){
  if(audio)return;
  try{audio=new (window.AudioContext||window.webkitAudioContext)();ambient=audio.createOscillator();ambientGain=audio.createGain();ambient.type='sine';ambient.frequency.value=82;ambientGain.gain.value=.014;ambient.connect(ambientGain);ambientGain.connect(audio.destination);ambient.start();}catch{sound=false;}
}
function tone(frequency,duration=.3,volume=.07,type='sine'){
  if(!sound)return;makeAudio();if(!audio)return;audio.resume().catch(()=>{});
  const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,audio.currentTime);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);
}
function audioState(){makeAudio();if(audio){if(sound&&!paused())audio.resume().catch(()=>{});else audio.suspend().catch(()=>{});}$('audio').textContent=sound?'Sound on':'Sound off';$('audio').setAttribute('aria-pressed',String(sound));}
function setAssist(value){assisted=value;restingSince=-1;$('assist').setAttribute('aria-pressed',String(value));$('assist').textContent=value?'Trail assist on':'Trail assist';}
function reset(assist=false){state=M.createSession();player={x:0,s:3,y:0,vy:0,yaw:0,pitch:0};time=0;echoStart=0;lastStep=-1;lastPulse=-1;started=true;keys.clear();setAssist(assist);$('reflection').value='';dialogs.forEach(d=>d.open&&d.close());sound=$('start-audio').checked;audioState();focusWorld();updateUI();say('Listen to the grove: circle, triangle, diamond. Walk onto those three stones.');}
function complete(index){if(state.done[index])return;state.done[index]=true;tone(523,.55);say(M.stages[index].idea+' The trail ahead is open.',9);updateUI();}
function echoReplay(){echoStart=time;tone(262,.3);say('Circle, then triangle, then diamond. Walk the pattern. E replays the echo.',8);}

/* ---------------------------------------------------------------------------
   Assisted navigation
   Every target carries its own stop distance. For a task station that distance
   comes from the station's own interaction radius, so assistance always comes
   to rest inside the range where the task can actually be handled.
--------------------------------------------------------------------------- */
const APPROACH=st=>({x:st.ax,s:st.as,stop:st.stop});
const WAYPOINT=(x,s,stop=1.2)=>({x,s,stop});
const ECHO_STAGING=14.6;   /* a clear line south of the three stones */
function nextTarget(){
 const st=state.stage;
 if(state.done[st])return WAYPOINT(0,[34,74,114,154,202][st],.6);
 if(st===0){
   /* Line up south of the target stone first, so crossing to it never clips a neighbour. */
   const want=M.echoes[M.ECHO_ORDER[state.echo]];
   if(Math.abs(player.x-want.x)>.6&&player.s>ECHO_STAGING+.4)return WAYPOINT(player.x,ECHO_STAGING,.3);
   if(Math.abs(player.x-want.x)>.6)return WAYPOINT(want.x,ECHO_STAGING,.3);
   return APPROACH(want);
 }
 if(st===1){const i=state.carry===null?[0,1].find(v=>!state.placed.includes(v)):state.carry;return APPROACH(state.carry===null?M.glyphs[i]:M.sockets[i]);}
 if(st===2)return APPROACH(M.radio);
 if(st===3){
   if(!state.rerouted)return APPROACH(M.gate);
   if(state.carry!=='quiet')return APPROACH(M.quiet);
   return APPROACH(M.receiver);
 }
 if(!state.generated||!state.inspected)return APPROACH(M.forge);
 const span=M.bridge.find(p=>p.s>player.s+.7);
 return span?WAYPOINT(span.x,span.s,.25):WAYPOINT(0,202,.6);
}
function interaction(){
 const st=state.stage;
 if(st===0)return {label:'Walk onto the echo stones. E replays',kind:'echo'};
 if(st===1&&!state.done[1]){
   if(state.carry===null){const id=M.glyphs.findIndex((p,i)=>!state.placed.includes(i)&&distance(p)<p.r);if(id>=0)return {label:'E lifts the '+M.glyphs[id].shape+' carving',kind:'pickup',id};}
   else {const id=M.sockets.findIndex(p=>distance(p)<p.r);if(id>=0)return {label:'E places it on the '+M.sockets[id].shape+' plinth',kind:'place',id};}
 }
 if(st===2&&!state.done[2]&&distance(M.radio)<M.radio.r)return {label:'Hold Q or E to tune. F transmits',kind:'radio'};
 if(st===3&&!state.done[3]){
   if(!state.rerouted&&distance(M.gate)<M.gate.r)return {label:'Hold or tap E to turn the circulation gate',kind:'gate'};
   if(state.rerouted&&state.carry!=='quiet'&&distance(M.quiet)<M.quiet.r)return {label:'E lifts the quiet human signal',kind:'quiet'};
   if(state.carry==='quiet'&&distance(M.receiver)<M.receiver.r)return {label:'E releases the signal into circulation',kind:'release'};
 }
 if(st===4&&!state.generated&&distance(M.forge)<M.forge.r)return {label:'E starts the fabricator',kind:'generate'};
 if(st===4&&state.generated&&!state.inspected&&player.s>160)return {label:'F inspects what the fabricator made',kind:'inspect'};
 return null;
}
/* Held interactions are driven from move(); a single tap should not complete them. */
const HELD=new Set(['radio']);
function interact(){
 if(!started||paused())return;nearest=interaction();
 if(!nearest){say('Move close to a marked object to handle it.',3);return;}
 switch(nearest.kind){
 case 'echo':echoReplay();break;
 case 'pickup':state.carry=nearest.id;tone(330,.25);say('The mark travels with you. Find its matching plinth.',4);break;
 case 'place':if(M.placeGlyph(state,nearest.id)){tone(440,.4);if(state.done[1])say(M.stages[1].idea+' The trail ahead is open.',8);else say('One durable mark is in place. Bring the other.',5);}else{tone(150,.2);say('The shapes do not match. The mark stays available to compare.',5);}break;
 case 'radio':state.tuning=clamp(state.tuning+.04,0,1);tone(180+state.tuning*400,.06,.025);break;
 case 'gate':if(M.nudgeGate(state))gateOpened();else{tone(210+state.gateTurn*180,.12,.035,'triangle');say('The lever moves a notch. Keep turning it.',3);}break;
 case 'quiet':state.carry='quiet';tone(520,.35);say('You are carrying the quiet signal. Take it to the receiver ahead.',6);break;
 case 'release':state.carry=null;state.released=true;complete(3);break;
 case 'generate':state.generated=true;tone(110,.7,.06,'triangle');say('The fabricator made a convincing bridge. Pulse with F to reveal which parts have support.',9);break;
 case 'inspect':pulse();break;
 }
 updateUI();focusWorld();
}
function gateOpened(){tone(440,.45);say('The stream spreads out. A quiet human contribution can now circulate.',7);updateUI();}
function pulse(){
 if(!started||paused()||time-lastPulse<.3)return;lastPulse=time;view.scan(player.x,player.s,time);tone(420,.32,.06,'triangle');
 if(state.stage===2&&!state.done[2]&&distance(M.radio)<M.radio.r){if(Math.abs(state.tuning-.63)<.065){complete(2);if(sound&&'speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance('The bridge is open. Welcome, everyone.'));}}else say('The waves are still apart. Hold Q or E, or use the dial buttons, then transmit again.',5);}
 else if(state.stage===4&&state.generated&&player.s>160){state.inspected=true;state.scanUntil=time+9;say('Solid light marks the supported spans. The faint side spans have no foundations. Follow the supported path.',7);}
 else if(state.stage===0)echoReplay();
 updateUI();
}
function progressLine(){
 switch(state.stage){
 case 0:return state.echo+' / 3 echoes remembered';
 case 1:return state.placed.length+' / 2 marks placed';
 case 2:return state.done[2]?'Voice transmitted':'Turn the dial until the two waves align';
 case 3:
   if(state.done[3])return 'Quiet signal restored to circulation';
   if(state.carry==='quiet')return 'Carrying the quiet signal. Take it to the receiver';
   if(state.rerouted)return 'Gate open. The quiet signal waits on the left bank';
   return 'Brightest does not mean most important';
 default:
   if(!state.generated)return 'Fabricator ahead';
   return state.inspected?'Bridge inspected. Cross the supported spans':'Bridge generated. Inspect it with F';
 }
}
function updateUI(){
 const st=M.stages[state.stage];document.documentElement.style.setProperty('--accent',st.color);
 setText('stage-number','0'+(state.stage+1)+' / 05');setText('stage-name',st.name);setText('stage-place',st.place);
 setText('task-tag',st.tag);setText('objective',state.done[state.stage]?'Follow the trail. Watch the landscape change.':st.task);
 setText('task-progress',progressLine());
 setText('distance',Math.round(player.s)+' m');$('journey-progress').style.width=Math.min(100,player.s/2)+'%';
 nearest=interaction();
 setText('interaction',nearest?nearest.label:assisted?'Following the trail...':'');
 setText('action',nearest?.kind==='radio'?'Tune up  E':nearest?.kind==='gate'?'Hold  E':nearest?.kind==='echo'?'Replay  E':'Interact  E');
 $('tuner').hidden=nearest?.kind!=='radio';
 setText('frequency',Math.abs(state.tuning-.63)<.065?'Waves aligned. Transmit with F':Math.round(state.tuning*100)+' MHz');
}
function drawScope(){
 const c=$('scope'),ctx=c.getContext('2d');ctx.clearRect(0,0,320,80);for(let line=0;line<2;line++){ctx.strokeStyle=line?'#ffdab0':'#9cecf1';ctx.lineWidth=2;ctx.beginPath();const frequency=line?state.tuning:.63;for(let x=0;x<320;x++){const y=40+Math.sin(x*(.025+frequency*.07)-time*2)*24;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
}
function move(dt){
 const manual=['w','a','s','d','arrowup','arrowdown'].some(k=>keys.has(k));if(manual&&assisted)setAssist(false);
 let dx=0,ds=0,moving=false;
 if(assisted){const p=nextTarget(),len=distance(p);
   if(len>p.stop){dx=(p.x-player.x)/len;ds=(p.s-player.s)/len;const desired=Math.atan2(dx,ds);const delta=Math.atan2(Math.sin(desired-player.yaw),Math.cos(desired-player.yaw));player.yaw+=delta*Math.min(1,dt*3);player.pitch*=Math.max(0,1-dt*3);moving=true;restingSince=-1;}
   else if(restingSince<0)restingSince=time;
 }else{
   player.yaw+=(Number(keys.has('arrowright'))-Number(keys.has('arrowleft')))*dt*1.8;
   const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),side=Number(keys.has('d'))-Number(keys.has('a'));
   dx=Math.sin(player.yaw)*f+Math.cos(player.yaw)*side;ds=Math.cos(player.yaw)*f-Math.sin(player.yaw)*side;const len=Math.hypot(dx,ds)||1;dx/=len;ds/=len;moving=!!(f||side);
 }
 const speed=3.8;player.x=clamp(player.x+dx*dt*speed,-8,8);player.s=clamp(player.s+ds*dt*speed,1,205);
 const gate=[26,66,106,150,175.4][state.stage];if(!state.done[state.stage]&&!(state.stage===4&&state.generated)&&player.s>gate)player.s=gate;
 if(state.stage<4&&state.done[state.stage]&&player.s>[32,72,112,152][state.stage]){state.stage++;$('chapter-reveal').textContent=M.stages[state.stage].name;$('chapter-reveal').classList.add('show');revealEnd=time+3.4;say(M.stages[state.stage].task,7);updateUI();}
 if(state.stage===0&&!state.done[0]){
   const pad=M.echoes.findIndex(p=>distance(p)<p.r);
   if(pad>=0&&state.insideEcho!==pad){state.insideEcho=pad;const result=M.echoStep(state,pad);tone([262,392,330][pad],.45);if(result==='retry')say('The echo broke. Begin again with the circle. E replays the pattern.',5);if(result==='complete')say(M.stages[0].idea+' A wooden crossing rises from the river.',8);updateUI();}
   if(pad<0)state.insideEcho=-1;
 }
 if(nearest?.kind==='radio'){
   if(keys.has('q'))state.tuning=clamp(state.tuning-dt*.22,0,1);if(keys.has('e'))state.tuning=clamp(state.tuning+dt*.22,0,1);
 }
 /* Holding sweeps the lever; single presses are handled in interact() as notches. */
 if(nearest?.kind==='gate'&&keys.has('e')){
   const notch=Math.floor(state.gateTurn*M.GATE_NOTCHES);
   if(M.turnGate(state,dt))gateOpened();
   else if(Math.floor(state.gateTurn*M.GATE_NOTCHES)!==notch)tone(210+state.gateTurn*180,.1,.03,'triangle');
 }else if(!state.rerouted)M.releaseGate(state,dt);
 /* Assistance that arrives with nothing to handle releases itself instead of waiting silently. */
 if(assisted&&restingSince>0&&time-restingSince>2&&!interaction()&&!state.done[state.stage]){
   setAssist(false);say('Trail assist stopped here and found nothing to handle. Move with W A S D and look around.',8);
 }
 const onSupport=M.supported(player.x,player.s,state.generated);
 if(player.y>0||player.vy>0||!onSupport){player.vy-=11*dt;player.y+=player.vy*dt;if(player.y<=0&&onSupport){player.y=0;player.vy=0;}}
 if(player.y< -4){player.x=0;player.s=171;player.y=0;player.vy=0;player.yaw=0;player.pitch=0;setAssist(false);say('That span had no support. You are back on solid ground. Pulse again and follow the supported path.',9);}
 if(state.stage===4&&player.s>198&&!state.complete){state.done[4]=true;state.complete=true;setAssist(false);modal('ending');}
 if(moving&&time-lastStep>.43){tone(90+Math.random()*24,.065,.017,'triangle');lastStep=time;}
}
function beginEchoSound(){const age=time-echoStart;if(age<4.2){const phase=Math.floor(age/1.4);return M.ECHO_ORDER[phase];}return -1;}
$('begin').onclick=()=>reset(false);$('begin-assisted').onclick=()=>reset(true);
$('audio').onclick=()=>{sound=!sound;audioState();focusWorld();};$('assist').onclick=()=>{setAssist(!assisted);focusWorld();};
$('pause-button').onclick=()=>modal('pause');$('resume').onclick=()=>close('pause');$('restart').onclick=()=>reset(assisted);$('again').onclick=()=>reset(false);
$('replay-echo').onclick=()=>{close('pause');echoReplay();};$('motion').checked=reduced;$('motion').onchange=e=>{reduced=e.target.checked;};
$('action').onclick=interact;$('pulse').onclick=pulse;
$('tune-down').onclick=()=>{state.tuning=clamp(state.tuning-.04,0,1);tone(180+state.tuning*400,.08,.03);updateUI();};$('tune-up').onclick=()=>{state.tuning=clamp(state.tuning+.04,0,1);tone(180+state.tuning*400,.08,.03);updateUI();};
$('mouse-lock').onclick=async()=>{close('pause');try{await canvas.requestPointerLock();}catch{say('Drag to look. Pointer capture is unavailable in this browser.',5);}};
$('save').onclick=()=>{const text='Echoes: From forest to signal\n\n'+M.stages.map(s=>s.name+': '+s.idea).join('\n\n')+'\n\nReflection:\n'+$('reflection').value;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='echoes-reflection.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(!paused()&&started)modal('pause');return;}if(paused()||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 const key=e.key.toLowerCase();if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown',' ','e','q','f'].includes(key)){e.preventDefault();keys.add(key);if(!e.repeat){if(key==='f')pulse();if(key==='e'&&!HELD.has(interaction()?.kind))interact();if(key===' '&&player.y===0&&M.supported(player.x,player.s,state.generated))player.vy=4.8;}}
});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden&&started&&!paused())modal('pause');});
dialogs.forEach(d=>{d.addEventListener('cancel',e=>{if(d.id!=='pause')e.preventDefault();else{if(sound&&audio)audio.resume().catch(()=>{});setTimeout(focusWorld,0);}});});
canvas.addEventListener('pointerdown',e=>{if(paused())return;focusWorld();if(document.pointerLockElement===canvas){pulse();return;}drag={x:e.clientX,y:e.clientY,amount:0};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(paused())return;let dx=0,dy=0;if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(drag){dx=e.clientX-drag.x;dy=e.clientY-drag.y;drag.amount+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;}if(dx||dy){player.yaw+=dx*.003;player.pitch=clamp(player.pitch-dy*.003,-.85,.85);}});
canvas.addEventListener('pointerup',e=>{if(drag&&drag.amount<7)pulse();drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});canvas.addEventListener('pointercancel',()=>drag=null);
/* Pointer versions of the held keys, including E on the action button so touch can hold the gate. */
for(const button of [...document.querySelectorAll('[data-key]'),$('action')]){
  const key=button.dataset.key||'e';
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);button.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(key));
}
let lastBird=0,lastEcho=-1;
function frame(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;
 if(started&&!paused()&&!state.complete){time+=dt;move(dt);if(time>captionEnd&&$('caption').textContent)$('caption').textContent='';if(time>revealEnd)$('chapter-reveal').classList.remove('show');if(time-lastBird>5.1&&player.s<110){tone(1100+Math.random()*600,.16,.012);lastBird=time;}const echo=beginEchoSound();if(echo!==lastEcho&&echo>=0&&state.stage===0)tone([262,392,330][echo],.5,.07);lastEcho=echo;if(ambient)ambient.frequency.setTargetAtTime(82+player.s*.32,audio.currentTime,.4);uiClock+=dt;if(uiClock>.12){updateUI();uiClock=0;}}
 if(lost)return;
 if(!$('tuner').hidden)drawScope();view.update(time,player,state,reduced,started?beginEchoSound():-1);requestAnimationFrame(frame);
}
/* A lost context stops the loop and clears any dialog, so the alert is the thing on screen. */
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;keys.clear();dialogs.forEach(d=>d.open&&d.close());$('error-message').textContent='The graphics connection was interrupted. Reload the page to restart, or open the lighter version.';$('load-error').hidden=false;$('load-error').querySelector('a').focus();});
updateUI();modal('intro');requestAnimationFrame(frame);
})();
