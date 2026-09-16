/* Procedural 3D scenery: one continuous landscape, no image or model downloads. */
window.createEchoScene = function(canvas) {
  'use strict';
  const T = THREE, W = Echoes;
  const renderer = new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  const scene=new T.Scene();scene.background=new T.Color('#cadfc6');scene.fog=new T.Fog('#cadfc6',30,118);
  const camera=new T.PerspectiveCamera(70,1,.12,320);camera.rotation.order='YXZ';scene.add(camera);
  const hemi=new T.HemisphereLight('#e5f3da','#54694d',2.2);scene.add(hemi);
  const sunLight=new T.DirectionalLight('#ffe6ba',2.8);sunLight.position.set(-25,40,10);scene.add(sunLight);
  let seed=4517;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const materials=new Map();
  function material(color,glow=false){const key=String(color)+'/'+glow;if(!materials.has(key))materials.set(key,glow?new T.MeshBasicMaterial({color}):new T.MeshLambertMaterial({color,flatShading:true}));return materials.get(key);}
  const boxGeo=new T.BoxGeometry(1,1,1),coneGeo=new T.ConeGeometry(1,1,7),rockGeo=new T.DodecahedronGeometry(1,0),
        sphereGeo=new T.IcosahedronGeometry(1,1),cylGeo=new T.CylinderGeometry(.5,.5,1,7);
  function mesh(geometry,color,x,y,s,sx=1,sy=1,sz=1,glow=false,parent=scene){const m=new T.Mesh(geometry,material(color,glow));m.position.set(x,y,-s);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const box=(color,x,y,s,w,h,d,glow=false,parent=scene)=>mesh(boxGeo,color,x,y,s,w,h,d,glow,parent);
  function ring(color,x,y,s,r=.8,horizontal=false,parent=scene){const m=mesh(new T.TorusGeometry(r,.045,6,48),color,x,y,s,1,1,1,true,parent);if(horizontal)m.rotation.x=Math.PI/2;return m;}
  function shape(kind,color,x,y,s,size=.5,parent=scene){
    let m;if(kind==='circle')m=ring(color,x,y,s,size,false,parent);
    else if(kind==='triangle') {m=mesh(new T.ConeGeometry(size,size*1.55,3),color,x,y,s,1,1,.2,true,parent);m.rotation.z=Math.PI;}
    else {m=box(color,x,y,s,size,size,.09,true,parent);m.rotation.z=Math.PI/4;}
    return m;
  }
  function instances(geometry,entries,glow=false){
    if(!entries.length)return null;
    const m=new T.InstancedMesh(geometry,glow?new T.MeshBasicMaterial():new T.MeshLambertMaterial({flatShading:true}),entries.length);
    const d=new T.Object3D();
    entries.forEach((e,i)=>{d.position.set(e.x,e.y,-e.s);d.rotation.set(0,e.rot||0,0);d.scale.set(e.w,e.h,e.d);d.updateMatrix();m.setMatrixAt(i,d.matrix);m.setColorAt(i,new T.Color(e.color));});
    scene.add(m);return m;
  }

  /* ------------------------------------------------------------------
     Palette. One continuous slide from forest to signal; every surface
     reads its colour from the same distance ramp so nothing switches
     abruptly from one environment to the next.
  ------------------------------------------------------------------ */
  const earth=new T.Color('#759356'), cyber=new T.Color('#13243b');
  const SKY_TOP_DAY=new T.Color('#6f9fc6'),SKY_LOW_DAY=new T.Color('#cadfc6');
  const SKY_TOP_NIGHT=new T.Color('#070c1c'),SKY_LOW_NIGHT=new T.Color('#1d2b46');
  const ramp=s=>T.MathUtils.smoothstep(s,65,183);
  const tintA=new T.Color(),tintB=new T.Color();
  function tint(a,b,s){return tintA.set(a).lerp(tintB.set(b),ramp(s)).getHex();}

  /* Sky dome. It rides with the camera and meets the fog exactly at the
     horizon, so the far distance never shows a seam. */
  const skyGeo=new T.SphereGeometry(280,18,14);
  const skyColors=new Float32Array(skyGeo.attributes.position.count*3);
  skyGeo.setAttribute('color',new T.BufferAttribute(skyColors,3));
  const skyDome=new T.Mesh(skyGeo,new T.MeshBasicMaterial({side:T.BackSide,vertexColors:true,fog:false,depthWrite:false}));
  skyDome.renderOrder=-1;scene.add(skyDome);
  const skyTop=new T.Color(),skyLow=new T.Color(),skyMix=new T.Color();
  let skyPainted=-1;
  function paintSky(blend){
    skyTop.copy(SKY_TOP_DAY).lerp(SKY_TOP_NIGHT,blend);
    skyLow.copy(SKY_LOW_DAY).lerp(SKY_LOW_NIGHT,blend);
    const pos=skyGeo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const h=T.MathUtils.smoothstep(pos.getY(i)/280,-.05,.75);
      skyMix.copy(skyLow).lerp(skyTop,h);
      skyColors[i*3]=skyMix.r;skyColors[i*3+1]=skyMix.g;skyColors[i*3+2]=skyMix.b;
    }
    skyGeo.attributes.color.needsUpdate=true;
    skyPainted=blend;
  }
  paintSky(0);

  /* ------------------------------------------------------------------
     Ground. Drawn in two runs whose edges are the chasm edges the support
     test uses, so the visible lip and the walkable lip are the same line.
  ------------------------------------------------------------------ */
  function groundRun(from,to){
    for(let s=from;s<to;s+=4){
      const len=Math.min(4,to-s),mid=s+len/2;
      box(tint(earth.getHex(),cyber.getHex(),mid),0,-.23,mid,90,.45,len+.05);
      box(tint('#c4b88a','#253c50',mid),0,.015,mid,8,.045,len+.04);
    }
  }
  groundRun(-10,W.CHASM_START);
  groundRun(W.CHASM_END,222);
  box('#061826',0,-15,115,130,1,300);

  /* Forest that thins but never disappears; the far trees take on the
     colour of the infrastructure growing among them. */
  const trunks=[],crowns=[],grasses=[],rocks=[];
  for(let i=0;i<225;i++){
    const s=-10+rand()*182,x=(rand()<.5?-1:1)*(8+rand()*27),h=4+rand()*7;
    if(s>105&&rand()<(s-105)/100)continue;
    const cy=s>120;
    trunks.push({x,y:h*.32,s,w:.4,h:h*.65,d:.4,color:cy?'#43646d':'#655842'});
    crowns.push({x,y:h*.69,s,w:h*.34,h:h*.75,d:h*.34,color:cy?'#467a7b':['#315e44','#427749','#65834a','#386a50'][Math.floor(rand()*4)]});
    crowns.push({x,y:h*.99,s,w:h*.24,h:h*.57,d:h*.24,color:cy?'#75a29b':'#547e4b'});
  }
  instances(new T.CylinderGeometry(.6,.9,1,6),trunks);instances(coneGeo,crowns);
  for(let i=0;i<410;i++){const s=rand()*147,x=(rand()<.5?-1:1)*(4.6+rand()*16);grasses.push({x,y:.23,s,w:.2+rand()*.15,h:.3+rand()*.6,d:.2,color:s>100?'#5b9990':['#809955','#9ba85e','#a7af6f'][Math.floor(rand()*3)]});}
  instances(coneGeo,grasses);
  for(let i=0;i<90;i++){const h=.3+rand()*.7;rocks.push({x:(rand()<.5?-1:1)*(6+rand()*21),y:h*.35,s:rand()*170,w:h*1.4,h,d:h,color:'#869285',rot:rand()*6});}instances(rockGeo,rocks);
  for(let i=0;i<28;i++){const x=(i%2?-1:1)*(32+rand()*35),h=15+rand()*35;mesh(coneGeo,tint('#77928a','#1b2f44',i*8),x,h*.37,i*8,h*.7,h,h*.8);}

  /* ------------------------------------------------------------------
     The path edge. One unbroken series of markers from the grove to the
     far shore. The form each marker takes is chosen by how far along it
     stands, with a ragged offset so no two transitions line up: cairns
     become carved posts, posts become masts, masts become light.
  ------------------------------------------------------------------ */
  const cairnE=[],postE=[],capE=[],mastE=[],crossE=[],barE=[];
  const nearStation=(x,s)=>W.stations.some(st=>Math.abs(st.x-x)<3.4&&Math.abs(st.s-s)<3.4);
  for(let s=10;s<202;s+=6){
    if(s>W.CHASM_START-4&&s<W.CHASM_END+2)continue;
    for(const side of [-1,1]){
      const x=side*(5.0+rand()*.7);
      if(nearStation(x,s))continue;
      const form=(s+(rand()-.5)*30)/200,rot=rand()*6;
      if(form<.28){const h=.5+rand()*.5;cairnE.push({x,y:h*.45,s,w:h*1.5,h,d:h*1.3,rot,color:tint('#8c9384','#4c5f6b',s)});}
      else if(form<.55){const h=1.5+rand()*.7;postE.push({x,y:h/2,s,w:.34,h,d:.34,rot,color:tint('#b3a582','#3d5364',s)});
        capE.push({x,y:h+.13,s,w:.6,h:.16,d:.6,rot,color:tint('#d8cba1','#4a6377',s)});}
      else if(form<.8){const h=3.4+rand()*1.6;mastE.push({x,y:h/2,s,w:.2,h,d:.2,rot:0,color:tint('#6d7f7f','#2f4a5c',s)});
        crossE.push({x,y:h*.82,s,w:1.9,h:.12,d:.12,rot:0,color:tint('#8fa093','#3b5a6d',s)});}
      else {const h=2.2+rand()*1.4;mastE.push({x,y:h/2,s,w:.16,h,d:.16,rot:0,color:'#284356'});
        barE.push({x,y:h+.5,s,w:.14,h:1.1,d:.14,rot:0,color:s>170?'#7dffdd':'#a98bf0'});}
    }
  }
  instances(rockGeo,cairnE);instances(boxGeo,postE);instances(boxGeo,capE);
  instances(cylGeo,mastE);instances(boxGeo,crossE);instances(boxGeo,barE,true);

  /* Boughs lean over the opening path and, further on, become the gantries
     that carry cable across it. The overhead line is never broken. */
  for(let i=0;i<10;i++){
    const s=5+i*10.5,side=i%2?1:-1,x=side*7.4,h=5.4+rand()*2.2;
    mesh(cylGeo,'#5c5039',x,h/2,s,.5,h,.5);
    const bough=mesh(cylGeo,'#63563e',x-side*2.1,h-.4,s,.3,5.2,.3);
    bough.rotation.z=side*1.12;
    mesh(coneGeo,i<7?'#3c6b4d':'#42736e',x-side*4.1,h-1.2,s,2.6,2.2,2.6);
  }
  for(let i=0;i<8;i++){
    const s=118+i*11;
    for(const side of [-1,1])mesh(cylGeo,'#33566a',side*7.2,4.6,s,.34,9.2,.34);
    box('#3f6b80',0,9,s,14.8,.22,.22);
    for(const x of [-4.4,0,4.4])box(s>168?'#6cf3d2':'#9b82e0',x,8.5,s,.1,.9,.1,true);
  }

  /* Sun, and the cold glow that replaces it. */
  const sunMat=new T.MeshBasicMaterial({color:'#ffe7ae',transparent:true,opacity:1,fog:false});
  const sun=new T.Mesh(sphereGeo,sunMat);sun.position.set(-37,31,-71);sun.scale.setScalar(5);scene.add(sun);
  const glowMat=new T.MeshBasicMaterial({color:'#8fd8ff',transparent:true,opacity:0,fog:false});
  const coldGlow=new T.Mesh(sphereGeo,glowMat);coldGlow.position.set(30,38,-200);coldGlow.scale.setScalar(6.5);scene.add(coldGlow);

  /* Archive: a small open colonnade with carved, persistent shapes. */
  for(const x of [-6,6])for(const s of [43,49,55,61]){box('#bdb493',x,1.8,s,.65,3.6,.65);box('#c8c2a5',x,3.7,s,1.2,.28,1.2);}
  box('#b5b098',0,4,62,13,.45,.8);
  for(let i=0;i<5;i++)shape(['circle','triangle','diamond'][i%3],'#4f6b65',-4+i*2,3.95,61.5,.32);
  /* Shallow river, wood crossing raised by the first memory task. */
  box('#548d96',0,-.03,29,90,.045,5.5);
  const woodBridge=new T.Group();scene.add(woodBridge);
  for(let i=0;i<15;i++)box('#957a50',0,.2,26.5+i*.37,7,.18,.29,false,woodBridge);
  for(const x of [-3.6,3.6])box('#756145',x,.8,29,.13,1.25,5.6,false,woodBridge);

  const echoObjects=W.echoes.map((p,i)=>{const group=new T.Group();scene.add(group);mesh(new T.CylinderGeometry(1.35,1.5,.25,12),'#9eaa81',p.x,.1,p.s,1,1,1,false,group);const halo=ring(['#ffdb98','#99d3c3','#eec098'][i],p.x,.32,p.s,1.1,true,group);const symbol=shape(p.shape,'#ffdfa2',p.x,1.35,p.s,.36,group);return {group,halo,symbol};});
  const glyphObjects=W.glyphs.map(p=>{const group=new T.Group();scene.add(group);box('#cebd95',p.x,.8,p.s,.85,.95,.23,false,group);shape(p.shape,'#456159',p.x,.85,p.s-.14,.25,group);ring('#f8d796',p.x,.12,p.s,1,true,group);return group;});
  const socketObjects=W.sockets.map(p=>{const group=new T.Group();scene.add(group);box('#a8a58c',p.x,.55,p.s,1.55,1.1,1.3,false,group);const symbol=shape(p.shape,'#ffe4a5',p.x,1.6,p.s,.42,group);return {group,symbol};});
  const held=new T.Group();camera.add(held);box('#cdbc95',.55,-.48,1.15,.36,.42,.08,false,held);const heldShape=shape('circle','#46665b',.55,-.46,1.09,.11,held);held.visible=false;

  /* A waist-high console the player looks down into, rather than a slab to stand in front of. */
  const radioGroup=new T.Group();scene.add(radioGroup);
  box('#3c545a',0,.55,91,2.9,1.1,1.6,false,radioGroup);
  for(const x of [-1.3,1.3])box('#2a3c42',x,.24,90.4,.2,.48,.2,false,radioGroup);
  box('#4a656e',0,1.16,90.95,3,.14,1.8,false,radioGroup);
  box('#425d67',0,1.62,91.6,3,.95,.18,false,radioGroup);
  box('#b0cebe',0,1.66,91.48,1.9,.46,.06,false,radioGroup);
  for(let i=0;i<6;i++)box('#2b3f45',-1.3+i*.13,1.5,91.46,.055,.5,.05,false,radioGroup);
  mesh(cylGeo,'#ffc896',0,1.26,90.6,.5,.1,.5,true,radioGroup);
  const needle=box('#193432',0,1.33,90.6,.045,.025,.42,true,radioGroup);
  const dish=ring('#d5ded1',0,11,93,2);dish.rotation.y=.4;
  for(const x of [-2.8,2.8])box('#456976',x,5,93,.18,10,.18);
  for(let i=0;i<9;i++){const b=box('#5c7f84',0,1+i,93,5.7,.09,.09);b.rotation.z=(i%2?1:-1)*.35;}
  const recipients=[];
  for(let i=0;i<8;i++){const x=(i%2?-1:1)*(9+rand()*10),s=86+rand()*21;box('#637d7b',x,1.3,s,3,2.6,3);mesh(new T.ConeGeometry(2.4,1.7,4),'#526364',x,3.2,s,1,1,1);const lamp=box('#395b65',x,1.55,s-1.53,1,.7,.07,true);recipients.push({lamp,delay:Math.hypot(x,s-91)*.06});}
  const radioWaves=Array.from({length:4},()=>ring('#a2e7e8',0,6,93,1));

  /* Towers grow denser while trees persist among them. */
  const towers=[],windows=[];
  for(let i=0;i<120;i++){const s=106+rand()*115,x=(rand()<.5?-1:1)*(9+rand()*35),h=3+(s-100)*.16+rand()*14,w=2+rand()*3;towers.push({x,y:h/2,s,w,h,d:w,color:['#24434d','#284756','#253c50'][i%3]});for(let j=0;j<5;j++)windows.push({x:x-w/2+.1,y:h*(j+1)/6,s:s-w/2-.025,w:.07,h:.7,d:.03,color:i%2?'#86e6da':'#ba9aec'});}
  instances(boxGeo,towers);const windowMesh=instances(boxGeo,windows,true);

  const gateGroup=new T.Group();scene.add(gateGroup);
  box('#324954',W.gate.x,1,W.gate.s,1.4,2,1.4,false,gateGroup);
  const lever=box('#edc3ff',W.gate.x,2.3,W.gate.s,.13,1,.13,true,gateGroup);
  ring('#dcaaff',W.gate.x,.15,W.gate.s,1.5,true);
  const quiet=new T.Group();scene.add(quiet);mesh(sphereGeo,'#ffd9a1',W.quiet.x,1.3,W.quiet.s,.4,.4,.4,true,quiet);ring('#ffdaa7',W.quiet.x,.1,W.quiet.s,1.25,true,quiet);
  const receiver=ring('#d9c8ff',W.receiver.x,1.3,W.receiver.s,1.2);box('#4f6476',W.receiver.x,.25,W.receiver.s,3,.5,2);
  const stream=[];for(let i=0;i<34;i++){const group=new T.Group();scene.add(group);box(i%3?'#987ef0':'#74d3dc',0,0,0,.55,.7,.09,true,group);box('#ecf5eb',0,.17,-.055,.12,.12,.03,true,group);box('#d5e5e3',0,-.13,-.055,.3,.025,.02,true,group);stream.push(group);}
  const streamVeil=[];for(let i=0;i<6;i++)streamVeil.push(box('#8c75c0',-4+i*1.6,2,136,.06,4,.07,true));

  const forge=new T.Group();scene.add(forge);box('#2b565b',W.forge.x,1,W.forge.s,2.4,2,1.2,false,forge);
  const core=mesh(new T.OctahedronGeometry(.7),'#85ffdf',W.forge.x,2.8,W.forge.s,1,1,1,true,forge);ring('#7afde1',W.forge.x,.14,W.forge.s,1.8,true);
  const supports=W.bridge.map(p=>{const g=new T.Group();scene.add(g);box('#447f84',p.x,0,p.s,3.3,.18,3.2,false,g);const edge=box('#99ffe3',p.x,.11,p.s,3.1,.025,3.05,true,g);edge.material=new T.MeshBasicMaterial({color:'#99ffe3',transparent:true,opacity:.38});box('#33545d',p.x,-7,p.s,.35,14,.35,false,g);return {g,edge};});
  const decoys=W.decoys.map(p=>{const m=box('#a9fbeb',p.x,.02,p.s,2.7,.1,2.7,true);m.material=new T.MeshBasicMaterial({color:'#a9fbeb',transparent:true,opacity:.68});return m;});
  mesh(cylGeo,'#4f7975',0,2.5,211,.7,5,.7);
  mesh(coneGeo,'#73bb99',0,6,211,4,6,4);ring('#aaffd8',0,.25,204,3,true);
  const scanRing=ring('#c6ffe9',0,.3,0,1,true);scanRing.visible=false;

  /* A soft column of light stands over whichever station is the current
     objective, so the next thing to handle is visible from a distance. */
  function beacon(st,color){
    const m=mesh(cylGeo,color,st.x,7,st.s,2.3,14,2.3,true);
    m.material=new T.MeshBasicMaterial({color,transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide});
    m.visible=false;return m;
  }
  const beacons={radio:beacon(W.radio,'#a8ecf0'),gate:beacon(W.gate,'#e3b8ff'),
    quiet:beacon(W.quiet,'#ffd9a1'),receiver:beacon(W.receiver,'#d9c8ff'),forge:beacon(W.forge,'#85ffdf')};
  function activeStation(state){
    if(state.stage===2&&!state.done[2])return 'radio';
    if(state.stage===3&&!state.done[3]){if(!state.rerouted)return 'gate';if(state.carry!=='quiet')return 'quiet';return 'receiver';}
    if(state.stage===4&&!state.generated)return 'forge';
    return null;
  }

  /* Drifting pollen becomes luminous data dust down the trail. */
  const positions=new Float32Array(600);for(let i=0;i<200;i++){positions[i*3]=(rand()-.5)*40;positions[i*3+1]=1+rand()*14;positions[i*3+2]=-rand()*225;}
  const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(positions,3));
  const dustMat=new T.PointsMaterial({color:'#e4f0be',size:.06,transparent:true,opacity:.65});
  scene.add(new T.Points(dustGeo,dustMat));
  const DUST_DAY=new T.Color('#e4f0be'),DUST_NIGHT=new T.Color('#9de6ff');

  let scanAt=-100,transmitAt=-100;
  function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}resize();window.addEventListener('resize',resize);
  function scan(x,s,time){scanRing.position.set(x,.28,-s);scanAt=time;}

  const sky=new T.Color();
  function update(time,player,state,reduced,echoFlash){
    const blend=T.MathUtils.smoothstep(player.s,30,190);
    sky.copy(SKY_LOW_DAY).lerp(SKY_LOW_NIGHT,blend);
    scene.background.copy(sky);scene.fog.color.copy(sky);
    if(Math.abs(blend-skyPainted)>.02)paintSky(blend);
    skyDome.position.set(player.x,0,-player.s);
    hemi.intensity=2.2-blend*1.35;sunLight.intensity=2.8-blend*2.35;
    sunMat.opacity=1-T.MathUtils.smoothstep(player.s,60,130);
    glowMat.opacity=T.MathUtils.smoothstep(player.s,110,180)*.75;
    dustMat.color.copy(DUST_DAY).lerp(DUST_NIGHT,blend);
    camera.position.set(player.x,1.72+player.y,-player.s);camera.rotation.y=-player.yaw;camera.rotation.x=player.pitch;

    held.visible=state.carry!==null;held.rotation.z=reduced?0:Math.sin(time*2)*.035;
    if(held.visible)heldShape.material=material(state.carry==='quiet'?'#f5c9ff':'#42665e',true);
    glyphObjects.forEach((g,i)=>{g.visible=state.carry!==i&&!state.placed.includes(i);});
    socketObjects.forEach((o,i)=>{o.symbol.scale.setScalar(state.placed.includes(i)?1.6:1);});
    echoObjects.forEach((o,i)=>{const completed=W.ECHO_ORDER.slice(0,state.echo).includes(i);o.halo.scale.setScalar(i===echoFlash?1.4:1);o.symbol.position.y=1.35+(reduced?0:Math.sin(time*2+i)*.1);o.symbol.material=material(completed?'#cbffcb':i===echoFlash?'#ffffff':'#f2d3a1',true);});
    woodBridge.position.y=state.done[0]?0:-2.2;

    needle.rotation.y=-state.tuning*4+2;dish.rotation.y=state.tuning*2-1;
    if(state.done[2]&&transmitAt<0)transmitAt=time;
    if(!state.done[2])transmitAt=-100;
    radioWaves.forEach((w,i)=>{w.visible=state.done[2];const scale=1+((time*.4+i/4)%1)*23;w.scale.setScalar(scale);});
    /* The reply travels outward: each listener answers when the wave reaches it. */
    recipients.forEach(r=>{const lit=state.done[2]&&time-transmitAt>r.delay;r.lamp.material=material(lit?'#ffdb95':'#395b65',true);});

    /* The lever sweeps with the hold, and the veil opens by the same amount. */
    lever.rotation.z=-.6+state.gateTurn*1.2;
    quiet.visible=state.carry!=='quiet'&&!state.done[3];
    receiver.rotation.z=reduced?0:time*.2;
    streamVeil.forEach((o,i)=>{o.visible=state.gateTurn<1;o.scale.y=Math.max(.02,1-state.gateTurn*(.55+i*.09));});
    stream.forEach((o,i)=>{const phase=(time*.055+i/34)%1;o.position.set(state.rerouted?Math.sin(i*2.4)*7:Math.sin(i)*1.8,1.7+Math.sin(i)*1.4,-(114+phase*37));o.rotation.y=Math.sin(time*.3+i)*.2;});

    core.rotation.y=reduced?0:time*.5;core.rotation.z=reduced?0:time*.15;
    const scanning=state.scanUntil>time;
    supports.forEach(({g,edge})=>{g.visible=state.generated;edge.material.opacity=scanning?.9:.28;});
    decoys.forEach((m,i)=>{m.visible=state.generated;m.material.opacity=scanning?.06:(.5+(reduced?0:Math.sin(time*4+i)*.13));});
    const scanAge=time-scanAt;scanRing.visible=scanAge<1.5;scanRing.scale.setScalar(1+scanAge*13);

    const active=activeStation(state);
    for(const key in beacons){const on=key===active;const m=beacons[key];m.visible=on;if(on)m.material.opacity=reduced?.1:.08+Math.sin(time*1.6)*.025;}

    renderer.render(scene,camera);
  }
  return {renderer,scene,camera,update,scan};
};
