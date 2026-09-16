const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('./world-data.js');

/* Walk a straight leg between two points and assert every sampled step holds. */
function legHolds(a,b,generated=true){
  const steps=Math.max(40,Math.ceil(Math.hypot(b.x-a.x,b.s-a.s)/.02));
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,s=a.s+(b.s-a.s)*t;
    if(!M.supported(x,s,generated))return {x:+x.toFixed(2),s:+s.toFixed(2)};
  }
  return null;
}

test('walking the wrong echo resets the remembered sequence',()=>{
  const s=M.createSession();
  assert.equal(M.echoStep(s,0),'correct');
  assert.equal(M.echoStep(s,1),'retry');
  assert.equal(s.echo,0);
  M.ECHO_ORDER.forEach(i=>M.echoStep(s,i));
  assert.equal(s.done[0],true);
});

test('a carried mark only fits its matching plinth',()=>{
  const s=M.createSession();s.stage=1;s.carry=0;
  assert.equal(M.placeGlyph(s,1),false);
  assert.equal(s.carry,0);
  assert.equal(M.placeGlyph(s,0),true);
  assert.equal(s.carry,null);
  s.carry=1;
  assert.equal(M.placeGlyph(s,1),true);
  assert.equal(s.done[1],true);
});

/* The defect this guards against: assisted walking used to stop at a hand-tuned
   distance that had drifted outside the interaction radius, so the player
   arrived at the receiver and was never offered the action. */
test('assisted walking always comes to rest inside the interaction radius',()=>{
  for(const st of M.stations){
    const rest=M.reach(st);
    assert.ok(M.reachable(st),
      `${st.name}: assistance rests ${rest.toFixed(2)}m from the centre but the interaction radius is only ${st.r}m`);
    assert.ok(st.r-rest>=.3,
      `${st.name}: only ${(st.r-rest).toFixed(2)}m of margin; approach and radius are too close to drift safely`);
  }
});

test('every station keeps its approach point on the walkable corridor',()=>{
  for(const st of M.stations){
    assert.ok(Math.abs(st.ax)<=8,`${st.name}: approach x is outside the player's movement clamp`);
    assert.ok(M.supported(st.ax,st.as,false),`${st.name}: approach point stands over the chasm`);
  }
});

test('generated decoys provide no support and every real span is walkable',()=>{
  assert.equal(M.supported(0,171,false),true);
  assert.equal(M.supported(0,181,false),false);
  for(const p of M.bridge)assert.equal(M.supported(p.x,p.s,true),true);
  for(const d of M.decoys)assert.equal(M.supported(d.x,d.s,true),false,`decoy at ${d.x},${d.s} carries weight`);
  for(let i=0;i<M.bridge.length-1;i++){
    const hole=legHolds(M.bridge[i],M.bridge[i+1]);
    assert.equal(hole,null,`leg ${i} drops the player at ${JSON.stringify(hole)}`);
  }
});

/* The defect this guards against: a one-metre unsupported gap sat between the
   last span and the far shore, so the ending trigger past 198m could not be
   reached without falling. */
test('the generated path is continuous from shore to shore',()=>{
  const first=M.bridge[0],last=M.bridge[M.bridge.length-1];
  assert.equal(legHolds({x:first.x,s:M.CHASM_START-4},first),null,'the near shore does not meet the first span');
  assert.equal(legHolds(last,{x:0,s:199}),null,'the last span does not meet the far shore');
  assert.equal(M.supported(0,199,true),true,'the ending trigger at 198m stands over nothing');
});

test('no straight line crosses the chasm, so the inspected path has to be followed',()=>{
  for(const x of [-2.2,-1,0,1,2.4]){
    const hole=legHolds({x,s:M.CHASM_START},{x,s:M.CHASM_END});
    assert.notEqual(hole,null,`a straight walk down x=${x} crosses unaided`);
  }
});

test('the circulation gate is turned over time, not switched by one press',()=>{
  const held=M.createSession();
  assert.equal(M.turnGate(held,.016),false,'a single frame completed the turn');
  assert.equal(held.rerouted,false);
  let frames=1;
  while(!held.rerouted&&frames<600){M.turnGate(held,.016);frames++;}
  assert.equal(held.rerouted,true);
  assert.ok(frames*.016>=M.GATE_TURN_SECONDS*.9,'the sweep finished faster than its stated duration');
});

/* Repeated presses have to reach the same place as a continuous hold, so the
   task stays available to anyone who cannot hold a key down. */
test('repeated presses turn the gate as far as holding does',()=>{
  const s=M.createSession();
  for(let i=1;i<M.GATE_NOTCHES;i++){
    assert.equal(M.nudgeGate(s),false,`press ${i} completed the turn early`);
    assert.equal(s.rerouted,false);
  }
  assert.equal(M.nudgeGate(s),true,'the last press did not complete the turn');
  assert.equal(s.rerouted,true);
  assert.equal(s.gateTurn,1);
});

test('a gate left part-turned winds back, but not while it is being worked',()=>{
  const s=M.createSession();
  M.nudgeGate(s);
  const held=s.gateTurn;
  /* Inside the grace period a player pressing again loses nothing. */
  M.releaseGate(s,M.GATE_IDLE_GRACE*.5);
  assert.equal(s.gateTurn,held,'the lever slipped back between presses');
  M.releaseGate(s,M.GATE_IDLE_GRACE);
  M.releaseGate(s,4);
  assert.equal(s.gateTurn,0,'an abandoned lever never returned');
  assert.equal(s.rerouted,false);
});

test('a fresh session clears every carried and generated thing',()=>{
  const s=M.createSession();
  assert.deepEqual(s.done,[false,false,false,false,false]);
  assert.equal(s.carry,null);
  assert.deepEqual(s.placed,[]);
  assert.equal(s.gateTurn,0);
  assert.equal(s.rerouted,false);
  assert.equal(s.generated,false);
  assert.equal(s.inspected,false);
  assert.equal(s.complete,false);
});
