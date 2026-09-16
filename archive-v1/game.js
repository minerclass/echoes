/* Dependency-free ray-cast first-person renderer and expedition controls. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { stages, createSession } = OngWorld;
  const canvas = $('world'), ctx = canvas.getContext('2d', { alpha: false });
  let session = createSession();
  let player = { x: 7.5, y: 11.4, angle: -Math.PI / 2 };
  let width = 0, height = 0, frameTime = 0, elapsed = 0, pulseTime = 0, toastUntil = 0;
  let currentTarget = null, guided = false, sound = false, audio = null, started = false;
  let reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let drag = null, refrainTimeout = null, lastPulse = -1, zBuffer = [];
  const keys = new Set();
  const fov = Math.PI / 2.65;
  const map = [
    '111111111111111',
    '111111000111111',
    '110000000000011',
    '100000000000001',
    '100000000000001',
    '100100000001001',
    '100000000000001',
    '100000000000001',
    '100100000001001',
    '100000000000001',
    '100000000000001',
    '100000000000001',
    '110000000000011',
    '111111111111111'
  ];
  const locations = [{ x: 4.7, y: 7.0 }, { x: 10.3, y: 7.0 }, { x: 7.5, y: 4.7 }];
  const portal = { x: 7.5, y: 2.1 };
  const decor = [{x:2.3,y:3.4},{x:12.7,y:3.4},{x:2.0,y:10.8},{x:13.0,y:10.8},{x:4.4,y:2.5},{x:10.6,y:2.5}];
  const dialogs = [...document.querySelectorAll('dialog')];
  const modalOpen = () => dialogs.some(d => d.open);
  function openDialog(id) {
    keys.clear(); drag = null;
    if (document.pointerLockElement) document.exitPointerLock();
    dialogs.forEach(d => { if (d.open) d.close(); });
    $(id).showModal();
  }
  function tell(text, seconds = 9) { $('toast').textContent = text; toastUntil = elapsed + seconds; }
  function tone(frequency = 440, duration = .12) {
    if (!sound) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      osc.connect(gain); gain.connect(audio.destination);
      osc.start(); osc.stop(audio.currentTime + duration);
    } catch { /* Captions retain the complete activity when audio is unavailable. */ }
  }
  function speak(text) {
    if (sound && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = .88; speechSynthesis.speak(utterance);
    }
  }
  function replayRefrain() {
    tell('RIVER → SEED → FIRE. Hold the pattern, then pulse the voices in that order.', 8);
    speak('River. Seed. Fire. River. Seed. Fire.');
    clearTimeout(refrainTimeout);
    refrainTimeout = setTimeout(() => { if (session.stage === 0 && !modalOpen()) tell('Carry the refrain. Need it again? Select Replay refrain.', 6); }, 8000);
  }
  function updateUI() {
    const stage = stages[session.stage];
    const focusedNode = document.activeElement?.dataset?.node;
    document.documentElement.style.setProperty('--accent', stage.color);
    $('stage-count').textContent = `EXPEDITION / 0${session.stage + 1} OF 05`;
    $('stage-title').textContent = stage.name;
    $('mission-text').textContent = session.solved ? 'Meaning recovered. Find the glowing portal at the far end and pulse it to continue.' : stage.mission;
    $('pips').replaceChildren(...[0, 1, 2].map(i => {
      const pip = document.createElement('span'); if (session.found.includes(i)) pip.className = 'found'; return pip;
    }));
    $('pips').setAttribute('aria-label', `${session.found.length} of 3 nodes recovered`);
    $('replay').hidden = session.stage !== 0 || session.solved;
    $('ranking').hidden = session.stage !== 3 || session.ranked;
    $('ranking').disabled = !session.found.includes(0) || !session.found.includes(1);
    $('interpret').disabled = session.found.length < 3 || session.solved;
    $('interpret').textContent = session.solved ? 'Portal open ✓' : session.found.length === 3 ? 'Make sense ↗' : `Make sense · ${session.found.length}/3`;
    $('status-line').textContent = session.solved ? 'PORTAL OPEN / follow the light' : `${session.found.length} / 3 traces recovered`;
    $('guide').hidden = !guided;
    document.body.classList.toggle('guided', guided);
    $('guided-toggle').setAttribute('aria-pressed', String(guided));
    $('guided-toggle').textContent = guided ? 'First-person mode' : 'Guided mode';
    $('guide-nodes').replaceChildren(...stage.nodes.map((node, id) => {
      const b = document.createElement('button');
      b.dataset.node = String(id);
      b.textContent = `${session.found.includes(id) ? '✓ ' : ''}${node.label}`;
      b.disabled = session.stage === 3 && id === 2 && !session.ranked;
      if (b.disabled) b.textContent = 'Hidden by ranking';
      b.addEventListener('click', () => scanNode(id)); return b;
    }));
    $('guide-exit').hidden = !session.solved;
    if (guided && focusedNode !== undefined) $('guide-nodes').children[Number(focusedNode)]?.focus({ preventScroll: true });
  }
  function prepareRoom() {
    clearTimeout(refrainTimeout);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const stage = stages[session.stage];
    player = { x: 7.5, y: 11.4, angle: -Math.PI / 2 };
    currentTarget = null; $('toast').textContent = '';
    $('brief-author').textContent = `${stage.author} / WORLD 0${session.stage + 1}`;
    $('brief-title').textContent = stage.place;
    $('brief-idea').textContent = stage.idea;
    $('brief-instruction').textContent = stage.instruction;
    updateUI(); openDialog('briefing');
  }
  function scanNode(id) {
    if (!started || modalOpen()) return;
    const result = session.scan(id);
    if (result.kind === 'blocked') return;
    pulseTime = .3;
    if (result.kind === 'retry') { tone(150, .18); tell('The refrain broke. Start again with RIVER. Replay is always available.'); }
    else {
      tone(340 + id * 130, .25);
      tell(`${stages[session.stage].nodes[id].label}: ${result.text}`, 15);
      if (session.stage === 2) speak(result.text);
    }
    updateUI();
    if (session.found.length === 3 && !session.solved) $('status-line').textContent = 'All traces recovered / select Make sense';
  }
  function enterPortal() {
    if (!session.solved) { tell('Recover the three traces and make sense of them to open this portal.'); return; }
    if (!session.advance()) return;
    tone(760, .4);
    if (session.complete) {
      $('end-notes').replaceChildren(...session.reflections.map((text, i) => {
        const li = document.createElement('li'); const strong = document.createElement('strong');
        strong.textContent = stages[i].name + ': '; li.append(strong, text); return li;
      }));
      openDialog('ending');
    } else prepareRoom();
  }
  function fire() {
    if (!started || modalOpen() || elapsed - lastPulse < .23) return;
    lastPulse = elapsed; pulseTime = .28;
    tone(200, .07);
    if (!currentTarget) { tell('Aim at the center of a glowing node. Move closer if it is out of range.', 3); return; }
    if (currentTarget.portal) enterPortal(); else scanNode(currentTarget.id);
  }
  function evidence(container) {
    container.replaceChildren(...session.found.map(id => {
      const node = stages[session.stage].nodes[id];
      const article = document.createElement('article'); article.className = 'trace';
      const title = document.createElement('strong'); title.textContent = node.label;
      const text = document.createElement('p'); text.textContent = node.text;
      article.append(title, text); return article;
    }));
  }
  function askQuestion() {
    if (session.found.length !== 3 || session.solved) return;
    const stage = stages[session.stage];
    $('question-title').textContent = stage.question;
    evidence($('question-evidence'));
    $('answer-feedback').textContent = '';
    $('return-world').textContent = 'Keep exploring';
    $('answers').replaceChildren(...stage.answers.map((answer, i) => {
      const b = document.createElement('button'); b.textContent = answer;
      b.addEventListener('click', () => {
        const correct = session.answer(i);
        $('answer-feedback').textContent = correct ? stage.feedback : stage.retry;
        if (correct) {
          [...$('answers').children].forEach(button => { button.disabled = true; });
          b.textContent = '✓ ' + answer;
          $('return-world').textContent = 'Return to the open portal ↗';
          $('return-world').focus(); tone(680, .4);
        } else { b.setAttribute('aria-label', answer + '. Try another interpretation.'); tone(190, .14); }
        updateUI();
      }); return b;
    }));
    openDialog('question');
  }
  function reset() {
    session = createSession(); elapsed = 0; lastPulse = -1; started = true;
    $('reflection').value = ''; prepareRoom();
  }
  $('start').addEventListener('click', () => { guided = false; reset(); });
  $('start-guided').addEventListener('click', () => { guided = true; reset(); });
  $('enter-room').addEventListener('click', () => {
    $('briefing').close();
    if (session.stage === 0) replayRefrain(); else tell(stages[session.stage].instruction);
  });
  $('interpret').addEventListener('click', askQuestion);
  $('return-world').addEventListener('click', () => { $('question').close(); if (session.solved) tell('Portal open. Follow the central aisle to the glowing gateway.', 7); });
  $('replay').addEventListener('click', replayRefrain);
  $('ranking').addEventListener('click', () => {
    if (session.changeRanking()) { tell('Ranking changed: local access needs. The lower-engagement account is now visible. Pulse LOCAL.'); tone(570, .3); }
    updateUI();
  });
  $('notes-button').addEventListener('click', () => {
    evidence($('notes-content'));
    if (!session.found.length) $('notes-content').textContent = 'Pulse a node to recover a trace. Its words will stay here for review.';
    openDialog('notebook');
  });
  $('pause-button').addEventListener('click', () => { if (started && !session.complete) openDialog('pause'); });
  $('guided-toggle').addEventListener('click', () => { guided = !guided; keys.clear(); updateUI(); });
  $('guide-exit').addEventListener('click', enterPortal);
  $('sound').addEventListener('click', () => {
    sound = !sound; $('sound').textContent = sound ? 'Sound on' : 'Sound off';
    $('sound').setAttribute('aria-pressed', String(sound));
    if (sound) tone(440, .2); else if ('speechSynthesis' in window) speechSynthesis.cancel();
  });
  $('reduce-motion').checked = reduceMotion;
  $('reduce-motion').addEventListener('change', event => { reduceMotion = event.target.checked; });
  $('restart').addEventListener('click', reset);
  $('play-again').addEventListener('click', reset);
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
  $('download').addEventListener('click', () => {
    const lines = ['ECHOES: Field notes', 'A conceptual learning game based on Walter Ong and Micah Miner.', '', ...session.reflections.map((text, i) => `${i + 1}. ${stages[i].name}: ${text}`), '', 'My reflection:', $('reflection').value || '(No reflection entered.)', '', 'The last two environments are Miner’s proposed extensions. These modes coexist. Game completion is not a learning assessment.'];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'echoes-field-notes.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  dialogs.forEach(d => {
    d.addEventListener('cancel', event => {
      if (['intro', 'briefing', 'ending'].includes(d.id)) event.preventDefault();
      keys.clear();
    });
    d.addEventListener('close', () => {
      if (started && !guided && !modalOpen() && !session.complete) canvas.focus({ preventScroll: true });
    });
  });
  $('mouse-look').addEventListener('click', async () => {
    $('pause').close();
    try { await canvas.requestPointerLock(); }
    catch { tell('Mouse capture is unavailable here. Drag to look or use the arrow keys.'); }
  });
  document.addEventListener('pointerlockerror', () => tell('Mouse capture is unavailable here. Drag to look or use the arrow keys.'));
  window.addEventListener('keydown', event => {
    const tag = document.activeElement?.tagName;
    if (event.code === 'Escape' && started && !modalOpen() && !session.complete) { openDialog('pause'); return; }
    if (modalOpen() || ['INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY', 'A'].includes(tag)) return;
    if (tag === 'BUTTON' && event.code === 'Space') return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) {
      event.preventDefault(); keys.add(key);
      if (event.code === 'Space' && !event.repeat) fire();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); drag = null; });
  document.addEventListener('visibilitychange', () => { keys.clear(); if (document.hidden && started && !modalOpen() && !session.complete) openDialog('pause'); });
  canvas.addEventListener('pointerdown', event => {
    if (modalOpen()) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (document.pointerLockElement === canvas) { fire(); return; }
    drag = { start: event.clientX, x: event.clientX, moved: 0 };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (modalOpen() || guided) return;
    if (document.pointerLockElement === canvas) player.angle += event.movementX * .0023;
    else if (drag) { const dx = event.clientX - drag.x; drag.moved += Math.abs(dx); player.angle += dx * .005; drag.x = event.clientX; }
  });
  canvas.addEventListener('pointerup', event => {
    if (drag && drag.moved < 7) fire(); drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  document.querySelectorAll('[data-hold]').forEach(button => {
    const key = button.dataset.hold.toLowerCase();
    button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(key); button.setPointerCapture(event.pointerId); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(key));
  });
  $('touch-pulse').addEventListener('click', fire);

  function solid(x, y) { return map[Math.floor(y)]?.[Math.floor(x)] !== '0'; }
  function canStand(x, y) { const r = .22; return !solid(x-r,y-r) && !solid(x+r,y-r) && !solid(x-r,y+r) && !solid(x+r,y+r); }
  function move(dt) {
    if (guided) return;
    const turn = Number(keys.has('arrowright')) - Number(keys.has('arrowleft'));
    player.angle += turn * dt * 1.65;
    const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    const side = Number(keys.has('d')) - Number(keys.has('a'));
    const norm = Math.hypot(forward, side) || 1;
    const speed = 2.75 * dt / norm;
    const dx = (Math.cos(player.angle) * forward - Math.sin(player.angle) * side) * speed;
    const dy = (Math.sin(player.angle) * forward + Math.cos(player.angle) * side) * speed;
    if (canStand(player.x + dx, player.y)) player.x += dx;
    if (canStand(player.x, player.y + dy)) player.y += dy;
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    // Cap render resolution while CSS keeps the canvas responsive on high-DPI displays.
    const ratio = Math.min(1, 1600 / rect.width);
    width = canvas.width = Math.round(rect.width * ratio);
    height = canvas.height = Math.round(rect.height * ratio);
  }
  window.addEventListener('resize', resize); resize();
  function rayCast(angle) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let mx = Math.floor(player.x), my = Math.floor(player.y);
    const deltaX = Math.abs(1 / dx), deltaY = Math.abs(1 / dy);
    const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    let distX = (dx < 0 ? player.x - mx : mx + 1 - player.x) * deltaX;
    let distY = (dy < 0 ? player.y - my : my + 1 - player.y) * deltaY;
    let side = 0;
    for (let i = 0; i < 60; i++) {
      if (distX < distY) { distX += deltaX; mx += sx; side = 0; }
      else { distY += deltaY; my += sy; side = 1; }
      if (map[my]?.[mx] !== '0') break;
    }
    const dist = side ? distY - deltaY : distX - deltaX;
    const edge = side ? player.x + dist * dx : player.y + dist * dy;
    return { dist: Math.max(.02, dist), side, u: edge - Math.floor(edge) };
  }
  function project(x, y, z = .65) {
    const dx = x - player.x, dy = y - player.y;
    const depth = dx * Math.cos(player.angle) + dy * Math.sin(player.angle);
    if (depth < .08) return null;
    const focal = width / (2 * Math.tan(fov / 2));
    const side = -dx * Math.sin(player.angle) + dy * Math.cos(player.angle);
    return { x: width / 2 + side * focal / depth, y: height / 2 + (.68-z) * focal / depth, scale: focal / depth, depth };
  }
  function line3d(ax, ay, bx, by, z = 0) {
    const a = project(ax, ay, z), b = project(bx, by, z);
    if (!a || !b) return;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function visible(p) {
    if (!p || p.x < -p.scale || p.x > width + p.scale) return false;
    const ix = Math.max(0, Math.min(zBuffer.length - 1, Math.floor(p.x / 3)));
    return p.depth < zBuffer[ix] + .1;
  }
  function glyph(kind, x, y, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.5, size * .035);
    if (kind === 'voice') {
      for (let j = -3; j <= 3; j++) { const h = size * (.13 + .25 * Math.cos(j * .7)); ctx.fillRect(j * size * .12 - size * .025, -h, size * .05, h * 2); }
    } else if (kind === 'page') {
      ctx.strokeRect(-size*.3,-size*.4,size*.6,size*.8);
      for (let j=0;j<4;j++) {ctx.beginPath();ctx.moveTo(-size*.18,-size*.22+j*size*.14);ctx.lineTo(size*.17,-size*.22+j*size*.14);ctx.stroke();}
    } else if (kind === 'signal') {
      ctx.beginPath();ctx.moveTo(0,size*.4);ctx.lineTo(0,-size*.1);ctx.stroke();
      for(let j=1;j<=3;j++){ctx.beginPath();ctx.arc(0,-size*.1,j*size*.15,Math.PI*1.16,Math.PI*1.84);ctx.stroke();}
      ctx.beginPath();ctx.arc(0,-size*.1,size*.035,0,Math.PI*2);ctx.fill();
    } else if(kind === 'feed') {
      for(let j=0;j<3;j++){ctx.strokeRect(-size*.35,-size*.4+j*size*.3,size*.7,size*.2);ctx.fillRect(-size*.27,-size*.35+j*size*.3,size*.09,size*.09);}
    } else {
      ctx.beginPath();for(let j=0;j<6;j++){const a=Math.PI/3*j;const px=Math.cos(a)*size*.38,py=Math.sin(a)*size*.38;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,size*.12,0,Math.PI*2);ctx.stroke();
      for(let j=0;j<6;j++){const a=Math.PI/3*j;ctx.beginPath();ctx.moveTo(Math.cos(a)*size*.14,Math.sin(a)*size*.14);ctx.lineTo(Math.cos(a)*size*.35,Math.sin(a)*size*.35);ctx.stroke();}
    }
    ctx.restore();
  }
  function drawNode(id, time) {
    if (session.stage === 3 && id === 2 && !session.ranked) return;
    const location = locations[id], stage = stages[session.stage], found = session.found.includes(id);
    const bob = reduceMotion ? 0 : Math.sin(time * 1.4 + id * 2) * .045;
    const p = project(location.x, location.y, .8 + bob);
    if (!visible(p)) return;
    const base = project(location.x, location.y, .03), s = Math.min(400, p.scale);
    ctx.save();
    const glow = ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,s*.72);
    glow.addColorStop(0,stage.color+'28');glow.addColorStop(1,stage.color+'00');ctx.fillStyle=glow;ctx.fillRect(p.x-s,p.y-s,s*2,s*2);
    ctx.strokeStyle=stage.color+'65';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(p.x,p.y+s*.32);ctx.lineTo(base.x,base.y);ctx.stroke();
    ctx.fillStyle=stage.color+'20';ctx.beginPath();ctx.ellipse(base.x,base.y,s*.36,s*.085,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.translate(p.x,p.y);const rot=reduceMotion?Math.PI/4:Math.PI/4+Math.sin(time*.4+id)*.08;
    ctx.rotate(rot);ctx.fillStyle='#102330ea';ctx.strokeStyle=stage.color;ctx.lineWidth=found?2.5:1.5;
    ctx.fillRect(-s*.27,-s*.27,s*.54,s*.54);ctx.strokeRect(-s*.27,-s*.27,s*.54,s*.54);ctx.rotate(-rot);ctx.translate(-p.x,-p.y);
    glyph(stage.symbol,p.x,p.y,s*.48,stage.color);
    const font=Math.max(11,Math.min(18,s*.09));ctx.font=`600 ${font}px Segoe UI, Arial`;
    const label=(found?'✓ ':'')+stage.nodes[id].label;
    const tw=ctx.measureText(label).width;ctx.fillStyle='#0b1b29eb';ctx.fillRect(p.x-tw/2-10,p.y+s*.43,tw+20,font+13);
    ctx.fillStyle='#eef5f1';ctx.textAlign='center';ctx.fillText(label,p.x,p.y+s*.43+font+3);
    ctx.restore();
  }
  function drawPortal(time) {
    const p=project(portal.x,portal.y,1);if(!visible(p))return;
    const s=p.scale,stage=stages[session.stage];
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle=session.solved?stage.color+'22':'#101824';ctx.fillRect(-s*.45,-s*.8,s*.9,s*1.65);
    ctx.strokeStyle=session.solved?stage.color:'#687f8a';ctx.lineWidth=Math.max(2,s*.04);ctx.strokeRect(-s*.46,-s*.82,s*.92,s*1.68);
    ctx.lineWidth=1;ctx.strokeStyle=stage.color+'88';ctx.strokeRect(-s*.36,-s*.71,s*.72,s*1.46);
    if(session.solved){
      ctx.fillStyle=stage.color+'50';
      for(let i=0;i<12;i++){const phase=reduceMotion?i/12:(time*.22+i/12)%1;ctx.fillRect(-s*.34,-s*.68+phase*s*1.4,s*.68,1);}
    }
    ctx.font=`600 ${Math.max(11,Math.min(16,s*.13))}px Segoe UI, Arial`;ctx.textAlign='center';ctx.fillStyle='#eaf2ef';ctx.fillText(session.solved?'ENTER →':'LOCKED',0,0);
    ctx.restore();
  }
  function drawDecor(obj,time) {
    const p=project(obj.x,obj.y,.75);if(!visible(p))return;
    const s=p.scale,stage=stages[session.stage];
    ctx.fillStyle=stage.dark;ctx.strokeStyle=stage.color+'50';ctx.lineWidth=1;
    ctx.fillRect(p.x-s*.16,p.y-s*.35,s*.32,s*.9);ctx.strokeRect(p.x-s*.16,p.y-s*.35,s*.32,s*.9);
    if(session.stage===0){
      ctx.fillStyle=stage.color+'dd';ctx.beginPath();ctx.moveTo(p.x-s*.16,p.y-s*.34);ctx.quadraticCurveTo(p.x-s*.14,p.y-s*.62,p.x+s*.03,p.y-s*(reduceMotion?.8:.8+Math.sin(time*4+obj.x)*.05));ctx.quadraticCurveTo(p.x+s*.2,p.y-s*.5,p.x+s*.16,p.y-s*.34);ctx.fill();
    }else glyph(stage.symbol,p.x,p.y-s*.02,s*.24,stage.color+'bb');
  }
  function drawReader(time) {
    const w=Math.min(width*.27,270), x=width*.67,y=height*.87;
    const bob=reduceMotion||!keys.size?0:Math.sin(time*7)*3;
    ctx.save();ctx.translate(x,y+bob);
    ctx.fillStyle='#12222e';ctx.strokeStyle='#77939e';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-w*.22,w*.6);ctx.lineTo(-w*.19,0);ctx.lineTo(-w*.11,-w*.2);ctx.lineTo(w*.16,-w*.2);ctx.lineTo(w*.27,0);ctx.lineTo(w*.42,w*.6);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#2d424d';ctx.fillRect(-w*.12,-w*.08,w*.33,w*.5);
    ctx.fillStyle='#07171f';ctx.fillRect(-w*.08,w*.08,w*.24,w*.2);
    ctx.strokeStyle=stages[session.stage].color;ctx.strokeRect(-w*.08,w*.08,w*.24,w*.2);
    glyph(stages[session.stage].symbol,w*.04,w*.18,w*.14,stages[session.stage].color);
    ctx.fillStyle=stages[session.stage].color;ctx.fillRect(-w*.09,-w*.23,w*.23,w*.055);
    if(pulseTime>0&&!reduceMotion){ctx.globalAlpha=pulseTime*2;ctx.strokeStyle=stages[session.stage].color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w*.025,-w*.24);ctx.lineTo(width*.5-x,height*.5-y);ctx.stroke();}
    ctx.restore();
  }
  function drawMap() {
    if(width<850)return;
    const size=6,x=width-125,y=height-205;
    ctx.fillStyle='#091b27c9';ctx.fillRect(x-13,y-13,116,113);
    map.forEach((row,my)=>[...row].forEach((wall,mx)=>{if(wall==='1'){ctx.fillStyle='#67808b66';ctx.fillRect(x+mx*size,y+my*size,size-1,size-1);}}));
    locations.forEach((p,id)=>{if(session.stage===3&&id===2&&!session.ranked)return;ctx.fillStyle=session.found.includes(id)?'#ecf3ef':stages[session.stage].color;ctx.fillRect(x+p.x*size-2,y+p.y*size-2,4,4);});
    ctx.fillStyle=session.solved?stages[session.stage].color:'#82949c';ctx.fillRect(x+portal.x*size-3,y+portal.y*size-2,6,4);
    ctx.save();ctx.translate(x+player.x*size,y+player.y*size);ctx.rotate(player.angle);ctx.fillStyle='#eff7f3';ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-3);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();ctx.restore();
  }
  function target() {
    currentTarget=null;
    const candidates=[...locations.map((p,id)=>({...p,id})),{...portal,portal:true}];
    let best=Infinity;
    for(const obj of candidates){
      if(session.stage===3&&obj.id===2&&!session.ranked)continue;
      const dx=obj.x-player.x,dy=obj.y-player.y,dist=Math.hypot(dx,dy);
      const difference=Math.atan2(Math.sin(Math.atan2(dy,dx)-player.angle),Math.cos(Math.atan2(dy,dx)-player.angle));
      if(Math.abs(difference)<.085&&dist<7.5&&dist<rayCast(Math.atan2(dy,dx)).dist+.1&&dist<best){currentTarget=obj;best=dist;}
    }
    $('reticle').classList.toggle('active',!!currentTarget);
    $('target-label').textContent=currentTarget?(currentTarget.portal?(session.solved?'PULSE / ENTER PORTAL':'PORTAL / MAKE SENSE TO UNLOCK'):`PULSE / ${stages[session.stage].nodes[currentTarget.id].label}`):'';
  }
  function draw(time) {
    if(!ctx)return;
    const stage=stages[session.stage],horizon=height/2;
    const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,stage.sky);sky.addColorStop(1,stage.dark);
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,horizon);
    const floor=ctx.createLinearGradient(0,horizon,0,height);floor.addColorStop(0,stage.floor);floor.addColorStop(1,'#0d1b25');ctx.fillStyle=floor;ctx.fillRect(0,horizon,width,height-horizon);
    // Receding floor seams and the central aisle make movement and depth legible.
    ctx.save();ctx.beginPath();ctx.rect(0,horizon,width,height-horizon);ctx.clip();ctx.strokeStyle=stage.color+'19';ctx.lineWidth=1;
    for(let x=1;x<15;x++)for(let y=1;y<13;y++){line3d(x,y,x+1,y);line3d(x,y,x,y+1);}
    ctx.strokeStyle=stage.color+'65';ctx.lineWidth=2;
    for(let y=2;y<12;y++){line3d(7,y,7,y+.55);line3d(8,y,8,y+.55);}
    ctx.restore();
    const focal=width/(2*Math.tan(fov/2));zBuffer=[];
    for(let x=0;x<width;x+=3){
      const offset=Math.atan((x-width/2)/focal),ray=rayCast(player.angle+offset);
      const distance=ray.dist*Math.cos(offset);zBuffer.push(distance);
      const wh=focal*1.6/distance,top=horizon-focal*.92/distance;
      ctx.fillStyle=stage.dark;ctx.fillRect(x,top,3,wh);
      const shade=Math.min(.84,.12+distance*.035+(ray.side?.12:0));ctx.fillStyle=`rgba(4,15,23,${shade})`;ctx.fillRect(x,top,3,wh);
      if(ray.u<.035||ray.u>.965){ctx.fillStyle='#07131c80';ctx.fillRect(x,top,3,wh);}
      ctx.fillStyle=stage.color+'65';ctx.fillRect(x,top+wh*.075,3,Math.max(1,wh*.009));
      ctx.fillStyle='#0c1b2799';ctx.fillRect(x,top+wh*.5,3,Math.max(1,wh*.01));
      ctx.fillStyle=stage.color+'35';ctx.fillRect(x,top+wh*.94,3,Math.max(1,wh*.013));
    }
    const objects=[...locations.map((p,id)=>({...p,type:'node',id})),{...portal,type:'portal'},...decor.map(p=>({...p,type:'decor'}))];
    objects.sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y));
    objects.forEach(obj=>{if(obj.type==='node')drawNode(obj.id,time);else if(obj.type==='portal')drawPortal(time);else drawDecor(obj,time);});
    if(!guided)drawReader(time);
    drawMap();
  }
  function frame(now) {
    const dt=Math.min(.05,(now-frameTime)/1000||.016);frameTime=now;
    if(!modalOpen()&&started&&!session.complete){elapsed+=dt;move(dt);target();if(toastUntil<elapsed)$('toast').textContent='';}
    pulseTime=Math.max(0,pulseTime-dt);
    draw(reduceMotion?0:elapsed);
    requestAnimationFrame(frame);
  }
  updateUI();openDialog('intro');requestAnimationFrame(frame);
})();
