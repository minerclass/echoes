/* Stage definitions, station geometry, and the task state shared by the game and its tests. */
(function(root){
'use strict';

/* Five overlapping media environments walked as one continuous corridor.
   `s` is metres travelled from the grove; `x` is metres left or right of the path. */
const stages=[
{name:'Primary orality',place:'The living grove',tag:'LISTEN · REMEMBER · MOVE',
 task:'Step through the three echoes: circle, triangle, diamond.',
 idea:'The rhythm lived in your memory and returned through performance.',color:'#ffdb98'},
{name:'Literacy',place:'The garden of lasting marks',tag:'CARRY · COMPARE · PLACE',
 task:'Carry each carved shape to its matching stone plinth.',
 idea:'The marks stay available. You can revisit and compare them.',color:'#ffe1af'},
{name:'Secondary orality',place:'The valley of distant voices',tag:'TUNE · TRANSMIT · CONNECT',
 task:'Reach the radio. Hold Q or E until the waves align, then transmit with F.',
 idea:'A human voice reaches distant listeners through a literate electronic infrastructure.',color:'#b6e8eb'},
{name:'Algorithmic secondary orality',place:'The river of attention',tag:'REROUTE · RECOVER · CARRY',
 task:'Hold or tap E to turn the circulation gate, then carry the quiet signal to the receiver.',
 idea:'The contributions are still human. The system changes whose contribution circulates.',color:'#debaff'},
{name:'Tertiary algorithmicity',place:'The world that writes itself',tag:'GENERATE · INSPECT · CROSS',
 task:'Start the fabricator. Pulse with F to inspect its bridge, then cross the supported spans.',
 idea:'The system made a path. You checked which parts of it held before trusting them.',color:'#99ffda'}];

/* ---------------------------------------------------------------------------
   Stations
   One source of truth per task: where it happens, how close the player must be
   to handle it, and where assisted walking should stop. `stop` is derived from
   the interaction radius so assistance can never halt outside its own target.
   `reachable()` is asserted for every station in session.test.cjs.
--------------------------------------------------------------------------- */
const ASSIST_STOP_CAP=1.2;
function station(name,x,s,r,approach){
  const as=s-(approach||0);
  return {name,x,s,r,ax:x,as,stop:Math.min(ASSIST_STOP_CAP,r*.3)};
}
/* Distance from the station centre at which an assisted walk comes to rest. */
function reach(st){return Math.hypot(st.ax-st.x,st.as-st.s)+st.stop;}
function reachable(st){return reach(st)<st.r;}

const echoes=[
 Object.assign(station('echo-circle',  -3,18,1.02,0),{shape:'circle'}),
 Object.assign(station('echo-diamond',  0,18,1.02,0),{shape:'diamond'}),
 Object.assign(station('echo-triangle', 3,18,1.02,0),{shape:'triangle'})];
const ECHO_ORDER=[0,2,1];   /* circle, triangle, diamond */

const glyphs=[
 Object.assign(station('carving-circle',  -4,45,2.8,1.1),{shape:'circle'}),
 Object.assign(station('carving-triangle', 4,48,2.8,1.1),{shape:'triangle'})];
const sockets=[
 Object.assign(station('plinth-circle',   3,57,2.8,1.2),{shape:'circle'}),
 Object.assign(station('plinth-triangle',-3,57,2.8,1.2),{shape:'triangle'})];

const radio   =station('radio',    0, 91,4,  1.6);
const gate    =station('gate',    -6,130,4,  1.8);
const quiet   =station('quiet',   -6,138,2.8,1.0);
const receiver=station('receiver', 0,146,3.2,1.2);
const forge   =station('forge',    0,169,4,  1.8);
const stations=[...echoes,...glyphs,...sockets,radio,gate,quiet,receiver,forge];

/* ---------------------------------------------------------------------------
   The generated bridge
   A span holds the player within SPAN_X across the path and SPAN_S along it.
   The chasm edges are derived from the outermost spans so the walkable surface
   is continuous from shore to shore: no hand-tuned numbers can drift apart.
--------------------------------------------------------------------------- */
const SPAN_X=1.65,SPAN_S=1.6,SPAN_GAP=2.65,SPAN_FIRST=177.5;
/* The path bends enough that no straight line crosses it. */
const SPAN_LANE=[0,-2.2,-2.2,0.4,2.4,1.0,0];
const bridge=SPAN_LANE.map((x,i)=>({x,s:SPAN_FIRST+i*SPAN_GAP}));
const CHASM_START=bridge[0].s-SPAN_S+.1;
const CHASM_END=bridge[bridge.length-1].s+SPAN_S-.1;

/* Convincing spans the fabricator also produced, none of which carry weight.
   session.test.cjs asserts that every one of these is unsupported. */
const decoys=bridge.slice(1,6).map(p=>({x:p.x>=0?p.x-3.6:p.x+3.6,s:p.s}));

function supported(x,s,generated){
  if(s<CHASM_START||s>CHASM_END)return true;
  return generated&&bridge.some(p=>Math.abs(x-p.x)<SPAN_X&&Math.abs(s-p.s)<SPAN_S);
}

/* ---------------------------------------------------------------------------
   Task state
--------------------------------------------------------------------------- */
function createSession(){return {
  stage:0,done:[false,false,false,false,false],
  echo:0,insideEcho:-1,
  placed:[],carry:null,
  tuning:.15,
  gateTurn:0,gateIdle:0,rerouted:false,released:false,
  generated:false,inspected:false,
  complete:false,scanUntil:0};}

function echoStep(state,id){
  if(state.stage!==0||state.done[0])return 'ignore';
  if(ECHO_ORDER[state.echo]!==id){state.echo=0;return 'retry';}
  state.echo++;
  if(state.echo===3)state.done[0]=true;
  return state.done[0]?'complete':'correct';
}
function placeGlyph(state,id){
  if(state.carry!==id||state.placed.includes(id))return false;
  state.placed.push(id);state.carry=null;
  if(state.placed.length===2)state.done[1]=true;
  return true;
}
/* The gate is turned, not switched: the lever sweeps and the stream opens with it.
   Holding sweeps it continuously; repeated presses advance it a notch at a time,
   so the same movement is available to anyone who cannot hold a key down.
   Both return true on the step that completes the turn. */
const GATE_TURN_SECONDS=1.35,GATE_NOTCHES=5,GATE_IDLE_GRACE=1.4;
function advanceGate(state,amount){
  if(state.rerouted)return false;
  state.gateTurn=Math.min(1,state.gateTurn+amount);
  state.gateIdle=0;
  if(state.gateTurn<1)return false;
  state.rerouted=true;return true;
}
function turnGate(state,dt){return advanceGate(state,dt/GATE_TURN_SECONDS);}
function nudgeGate(state){return advanceGate(state,1/GATE_NOTCHES);}
/* An abandoned lever winds back, but only after a pause long enough that a
   player working in separate presses is never fighting the decay. */
function releaseGate(state,dt){
  if(state.rerouted)return;
  state.gateIdle+=dt;
  if(state.gateIdle>GATE_IDLE_GRACE)state.gateTurn=Math.max(0,state.gateTurn-dt/(GATE_TURN_SECONDS*.8));
}

const api={stages,echoes,ECHO_ORDER,glyphs,sockets,bridge,decoys,stations,
  radio,gate,quiet,receiver,forge,
  SPAN_X,SPAN_S,CHASM_START,CHASM_END,GATE_TURN_SECONDS,GATE_NOTCHES,GATE_IDLE_GRACE,
  station,reach,reachable,createSession,echoStep,placeGlyph,turnGate,nudgeGate,releaseGate,supported};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Echoes=api;
})(typeof window!=='undefined'?window:this);
