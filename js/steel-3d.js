// The DOM remains the source of truth for dimensions, content and interaction.
(async () => {
  let THREE;
  try { THREE = await import('three'); } catch (_) { document.documentElement.classList.add('webgl-fallback'); return; }
  const board = document.querySelector('.steel-board');
  const stats = window.__zh3d = {renders:0, rebuilds:0, resizes:0};
  let renderer;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'steel-canvas'; canvas.setAttribute('aria-hidden', 'true');
    renderer = new THREE.WebGLRenderer({canvas, antialias:(devicePixelRatio || 1) < 1.5, alpha:true, preserveDrawingBuffer:true});
    board.prepend(canvas);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); document.documentElement.classList.remove('webgl-ready'); document.documentElement.classList.add('webgl-fallback'); });
    canvas.addEventListener('webglcontextrestored', () => { layoutKey=''; resize(); });
  } catch (_) { document.documentElement.classList.add('webgl-fallback'); return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .91;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,20000);
  const root = new THREE.Group(); scene.add(root);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0xb6b6b6);
  function softbox(x,y,z,w,h,power) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(power),side:THREE.DoubleSide}));
    panel.position.set(x,y,z); panel.lookAt(0,0,0); studio.add(panel);
  }
  softbox(-4,5,5,9,8,1.4); softbox(5,2,4,8,9,.75); softbox(0,-5,3,10,7,.45);
  const environment = pmrem.fromScene(studio, .12); scene.environment = environment.texture;
  const ambient = new THREE.AmbientLight(0xffffff, .65); scene.add(ambient);
  const light = new THREE.DirectionalLight(0xfffbf4, .85); light.castShadow = true;
  light.shadow.mapSize.set(2048,2048); light.shadow.bias = -.00012; light.shadow.normalBias = .3; light.shadow.radius = 3;
  root.add(light); root.add(light.target);
  const broadLight = new THREE.PointLight(0xffffff, 1, 0, 2); root.add(broadLight);
  let boardMesh, traceMesh, boardMaterial, clipMesh, paperMeshes=[];
  // Light looks sit on an ivory wall, so a baked shadow layer goes under the 3D canvas.
  const shadowLayer=document.createElement('canvas');
  shadowLayer.className='steel-shadow';shadowLayer.setAttribute('aria-hidden','true');board.prepend(shadowLayer);
  const surfaceUniforms={boardWidth:{value:1},steelGain:{value:1},fillHoles:{value:0}};
  let metrics, lastScroll = 0, resizeTimer = 0, layoutKey = '';
  function remove(mesh) { if (!mesh) return; root.remove(mesh); mesh.geometry.dispose(); }
  function outlineInto(target, points, radius) {
    window.__zhGeometry.roundedCommands(points, radius).forEach((c, j) => {
      if (j === 0) target.moveTo(c.entry[0], -c.entry[1]); else target.lineTo(c.entry[0], -c.entry[1]);
      target.quadraticCurveTo(c.corner[0], -c.corner[1], c.exit[0], -c.exit[1]);
    });
    target.closePath();
    return target;
  }
  // A thin strip that widens along a concave arc where it meets a plate.
  function traceShape(route, radius, width, [flareA, flareB]) {
    const a=route[0], b=route[1], y=route[route.length-2], z=route[route.length-1], overlap=4;
    const push=(from,to)=>{const len=Math.hypot(to[0]-from[0],to[1]-from[1])||1;return [to[0]+(to[0]-from[0])/len*overlap,to[1]+(to[1]-from[1])/len*overlap];};
    const poly=[push(b,a),...route.slice(1,-1),push(y,z)], line=[poly[0]];
    for (let i=1;i<poly.length-1;i++) {
      const p0=poly[i-1], c=poly[i], p1=poly[i+1], l0=Math.hypot(p0[0]-c[0],p0[1]-c[1]), l1=Math.hypot(p1[0]-c[0],p1[1]-c[1]), r=Math.min(radius,l0/2,l1/2);
      const e=[c[0]+(p0[0]-c[0])/l0*r,c[1]+(p0[1]-c[1])/l0*r], x=[c[0]+(p1[0]-c[0])/l1*r,c[1]+(p1[1]-c[1])/l1*r];
      for (let t=0;t<=1.0001;t+=1/14) line.push([(1-t)*(1-t)*e[0]+2*(1-t)*t*c[0]+t*t*x[0],(1-t)*(1-t)*e[1]+2*(1-t)*t*c[1]+t*t*x[1]]);
    }
    line.push(poly[poly.length-1]);
    const lengths=[0]; for (let i=1;i<line.length;i++) lengths.push(lengths[i-1]+Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]));
    const total=lengths[lengths.length-1], at=s=>{let i=1;while(i<lengths.length-1&&lengths[i]<s)i++;const f=(s-lengths[i-1])/((lengths[i]-lengths[i-1])||1);return [line[i-1][0]+(line[i][0]-line[i-1][0])*f,line[i-1][1]+(line[i][1]-line[i-1][1])*f];};
    const left=[], right=[];
    for (let s=0;;) {
      const d1=Math.max(0,s-overlap), d2=Math.max(0,total-overlap-s), arc=(d,f)=>f>0&&d<f?f*(1-Math.sqrt(Math.max(0,1-Math.pow(1-d/f,2)))):0, extra=Math.max(arc(d1,flareA),arc(d2,flareB));
      const here=at(s), ahead=at(Math.min(total,s+.5)), behind=at(Math.max(0,s-.5)), dx=ahead[0]-behind[0], dy=ahead[1]-behind[1], len=Math.hypot(dx,dy)||1, half=width/2+extra;
      left.push(new THREE.Vector2(here[0]-dy/len*half,-(here[1]+dx/len*half)));
      right.push(new THREE.Vector2(here[0]+dy/len*half,-(here[1]-dx/len*half)));
      if (s>=total) break;
      s=Math.min(total,s+(d1<flareA+2||d2<flareB+2?.7:3));
    }
    return new THREE.Shape([...left,...right.reverse()]);
  }
  function rebuild() {
    const b=board.getBoundingClientRect(), M=window.__zhModules;
    if (!M || !b.width || !b.height) return;
    stats.rebuilds++;
    const w=b.width, h=b.height, columns=M.columns, pitch=M.pitch;
    surfaceUniforms.boardWidth.value=w;
    surfaceUniforms.steelGain.value=document.documentElement.dataset.look?.86:1;
    surfaceUniforms.fillHoles.value=document.documentElement.dataset.look?1:0;
    metrics={w,h,pitch,columns};
    remove(boardMesh); remove(traceMesh); remove(clipMesh); boardMaterial?.dispose(); paperMeshes.forEach(mesh=>{mesh.material.dispose();remove(mesh);}); paperMeshes=[];
    const shapes=M.plates.map(plate=>{
      const shape=outlineInto(new THREE.Shape(),plate.outline,plate.r);
      (plate.holes||[]).forEach(hole=>shape.holes.push(outlineInto(new THREE.Path(),hole,plate.sr)));
      (plate.vents||[]).forEach(v=>{const vent=new THREE.Path();vent.absarc(v.x,-v.y,v.r,0,Math.PI*2,true);shape.holes.push(vent);});
      return shape;
    });
    M.nodes.forEach(n=>{const disc=new THREE.Shape();disc.absarc(n.x,-n.y,M.nodeRadius,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(n.x,-n.y,M.nodeHoleRadius,0,Math.PI*2,true);disc.holes.push(hole);shapes.push(disc);});
    const geometry=new THREE.ExtrudeGeometry(shapes,{depth:5,bevelEnabled:true,bevelThickness:2,bevelSize:2,bevelOffset:-2,bevelSegments:6,curveSegments:12,steps:1});
    // Trace tops share the plates' z, so the join reads as one piece of steel.
    const traceGeometry=new THREE.ExtrudeGeometry(M.traces.map(route=>traceShape(route.pts,16,M.traceWidth,route.flare)),{depth:5.8,bevelEnabled:true,bevelThickness:.6,bevelSize:.6,bevelOffset:-.6,bevelSegments:1,curveSegments:2,steps:1});
    traceGeometry.translate(0,0,.6);
    const uv=geometry.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)/512,uv.getY(i)/512);
    const holeUniforms={layoutPitch:{value:pitch},heroPitch:{value:M.heroPitch},contactTop:{value:M.perforatedBottom},contactBottom:{value:M.bottomRow}};
    boardMaterial=new THREE.MeshStandardMaterial({color:0xbababa,metalness:.5,roughness:.68,envMapIntensity:.8});
    boardMaterial.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,holeUniforms,surfaceUniforms);
      // The trace passes behind each ring node, so its opening stays clear to the wall.
      // Each plate is lit as its own object, brighter toward its upper left.
      const boxes=M.plates.map(plate=>{const xs=plate.outline.map(q=>q[0]),ys=plate.outline.map(q=>q[1]),x=Math.min(...xs),y=Math.min(...ys);return new THREE.Vector4(x,y,Math.max(...xs)-x,Math.max(...ys)-y);});
      shader.uniforms.plateBox={value:boxes};
      shader.uniforms.nodeSpots={value:M.nodes.map(n=>new THREE.Vector2(n.x,-n.y))}; shader.uniforms.nodeHole={value:M.nodeHoleRadius-2};
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform vec2 nodeSpots[${M.nodes.length}];\nuniform float nodeHole;\nuniform vec4 plateBox[${M.plates.length}];`).replace('#include <normal_fragment_begin>',`for(int i=0;i<${M.nodes.length};i++){if(distance(boardPosition,nodeSpots[i])<nodeHole) discard;}\n#include <normal_fragment_begin>`);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 boardPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nboardPosition = position.xy;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 boardPosition;\nuniform float layoutPitch;\nuniform float heroPitch;\nuniform float contactTop;\nuniform float contactBottom;\nuniform float boardWidth;\nuniform float steelGain;\nuniform float fillHoles;\nvec2 holeOffset(float pitch){return mod(vec2(boardPosition.x,-boardPosition.y),pitch)-pitch*0.5;}');
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat hy=-boardPosition.y; float pitch=hy<contactTop?heroPitch:layoutPitch; vec2 hp=holeOffset(pitch); bool perforated=hy<contactTop; if(hy>=contactTop){ float row=(hy-contactBottom)/pitch; float nearest=floor(row+0.5); perforated=nearest==0.0; hp.y=(row-nearest)*pitch; } float hd=length(hp); if(perforated && hd<pitch*0.115 && fillHoles<.5) discard;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nif(perforated && hd<pitch*0.15 && abs(vNormal.z)>0.5){ float rim=1.0-smoothstep(pitch*0.115,pitch*0.15,hd); vec2 radial=normalize(hp+0.00001); normal=normalize(normal+vec3(radial.x,-radial.y,0.0)*rim*0.10); }');
      // Display-space calibration shared by plate faces, traces and both kinds of bevel.
      shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
        vec2 world=vec2(boardPosition.x,-boardPosition.y);
        float local=0., glow=0.;
        for(int i=0;i<${M.plates.length};i++){ vec2 q=(world-plateBox[i].xy)/plateBox[i].zw; if(q.x>=0.&&q.x<=1.&&q.y>=0.&&q.y<=1.){ local=.04-.08*(q.x*.6+q.y*.4); glow=.1*exp(-dot(q,q)*2.4); break; } }
        float t=(world.x+world.y*.55)/(boardWidth*1.15);
        float fine=fract(sin(dot(floor(world),vec2(12.9898,78.233)))*43758.5453)-.5;
        float coarse=fract(sin(dot(floor(world/3.),vec2(39.346,11.135)))*24634.6345)-.5;
        float brushed=fract(sin(dot(vec2(floor(world.y*.8),floor(world.x/70.)),vec2(91.17,47.53)))*17143.13)-.5;
        float reflected=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
        float rimWeight=perforated ? 1.0-smoothstep(pitch*.115,pitch*.15,hd) : 0.0;
        float holeR=pitch*.115;
        vec2 holeDir=hp/max(hd,.001);
        float facing=dot(holeDir,vec2(.7071));
        // A chamfer around each small hole: shaded on the upper left, catching light on the lower right.
        float lip=perforated&&hd>=holeR ? (1.-smoothstep(holeR,holeR*1.45,hd))*facing*.12 : 0.;
        float calibrated=.715+local+glow+.012*sin(t*2.4+.6)+fine*.02+coarse*.012+brushed*.022+(reflected-.82)*rimWeight*.45+lip;
        if(abs(vNormal.z)>.98) gl_FragColor.rgb=vec3(clamp(calibrated,.56,.9))*steelGain;
        else { float edgeLight=clamp(.66+.3*(vNormal.y-vNormal.x)*.7071,.42,.97); gl_FragColor.rgb=vec3(edgeLight); }
        if(perforated && hd<holeR && fillHoles>.5) gl_FragColor=vec4(vec3(mix(.1,.3,smoothstep(-.9,.9,facing*hd/holeR))),1.);`);

    };
    boardMesh=new THREE.Mesh(geometry,boardMaterial); boardMesh.receiveShadow=true; root.add(boardMesh);
    traceMesh=new THREE.Mesh(traceGeometry,boardMaterial); root.add(traceMesh);
    // White card stock: thin, punched at each eyelet, under the wires.
    const hex=value=>{const n=parseInt(value.slice(1),16);return new THREE.Vector3((n>>16&255)/255,(n>>8&255)/255,(n&255)/255);};
    M.cards.forEach(card=>{
      const shape=outlineInto(new THREE.Shape(),card.outline,card.r);
      card.punches.forEach(c=>{const punch=new THREE.Path();punch.absarc(c.x,-c.y,M.clipOpening+1.3,0,Math.PI*2,true);shape.holes.push(punch);});
      const paperGeometry=new THREE.ExtrudeGeometry(shape,{depth:.6,bevelEnabled:true,bevelThickness:.7,bevelSize:.7,bevelOffset:-.7,bevelSegments:2,curveSegments:12,steps:1});
      paperGeometry.translate(0,0,.7);
      const mesh=new THREE.Mesh(paperGeometry,new THREE.ShaderMaterial({
        uniforms:{stock:{value:hex(card.fill)},clips:{value:M.clips.map(c=>new THREE.Vector2(c.x,c.y))},clipRadius:{value:M.clipRadius}},
        vertexShader:'varying vec2 world;varying vec3 surface;void main(){world=vec2(position.x,-position.y);surface=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`uniform vec3 stock;uniform vec2 clips[${M.clips.length}];uniform float clipRadius;varying vec2 world;varying vec3 surface;
          void main(){
            if(abs(surface.z)<.98){ gl_FragColor=vec4(stock*clamp(.8+.2*(surface.y-surface.x)*.7071,.55,1.),1.); return; }
            float fine=fract(sin(dot(floor(world),vec2(12.9898,78.233)))*43758.5453)-.5;
            float fibre=fract(sin(dot(floor(world/2.5),vec2(39.346,11.135)))*24634.6345)-.5;
            float seat=0.;
            for(int i=0;i<${M.clips.length};i++) seat=max(seat,1.-smoothstep(clipRadius-.5,clipRadius+4.,distance(world-vec2(1.2,1.6),clips[i])));
            gl_FragColor=vec4(stock*(1.+fine*.012+fibre*.012)*(1.-.26*seat),1.);
          }`}));
      root.add(mesh); paperMeshes.push(mesh);
    });
    // Round eyelets clamp each wire to its card and sit proud of it.
    const eyelets=M.clips.map(c=>{const ring=new THREE.Shape();ring.absarc(c.x,-c.y,M.clipRadius,0,Math.PI*2,false);const opening=new THREE.Path();opening.absarc(c.x,-c.y,M.clipOpening+1,0,Math.PI*2,true);ring.holes.push(opening);return ring;});
    const clipGeometry=new THREE.ExtrudeGeometry(eyelets,{depth:1.5,bevelEnabled:true,bevelThickness:1,bevelSize:1,bevelOffset:-1,bevelSegments:3,curveSegments:24,steps:1});
    clipGeometry.translate(0,0,8);
    clipMesh=new THREE.Mesh(clipGeometry,boardMaterial); root.add(clipMesh);

    const sc=light.shadow.camera; sc.left=-w*.8; sc.right=w*.8; sc.top=h*.65; sc.bottom=-h*.65; sc.near=1; sc.far=Math.max(5000,h*4); sc.updateProjectionMatrix();
    light.target.position.set(w*.5,-h*.5,0);
  }
  function draw() {
    if (!metrics) return;
    const m=metrics, lightDistance=Math.max(m.w,m.h)*.85;
    light.position.set(m.w*.2,-m.h*.18,Math.max(m.w,m.h)*1.1);
    broadLight.position.set(m.w*.12,-m.h*.1,lightDistance);
    broadLight.intensity=.7*lightDistance*lightDistance;
    stats.renders++;
    renderer.render(scene,camera);
    if (!document.documentElement.classList.contains('webgl-ready')) { document.documentElement.classList.remove('webgl-fallback'); document.documentElement.classList.add('webgl-ready'); }
  }
  // Soft contact shadows, with every opening kept clear so the wall colour shows through.
  function paintShadow() {
    const M=window.__zhModules, m=metrics, gl=renderer.domElement, c=shadowLayer.getContext('2d');
    // 11-11: the layer reaches PAD px past the steel on every side, so shadows fall onto the wall outside
    // the plate instead of being cut off in a hard line at the plate's own edge.
    const PAD=40;
    shadowLayer.width=Math.ceil(m.w)+2*PAD; shadowLayer.height=Math.ceil(m.h)+2*PAD;
    shadowLayer.style.width=(m.w+2*PAD)+'px'; shadowLayer.style.height=(m.h+2*PAD)+'px';
    shadowLayer.style.left=-PAD+'px'; shadowLayer.style.top=-PAD+'px';
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,shadowLayer.width,shadowLayer.height); c.translate(PAD,PAD);
    const away=m.w*4;
    [[1,3,7,'rgba(20,20,19,.26)'],[3,10,26,'rgba(20,20,19,.23)']].forEach(([x,y,blur,color])=>{
      c.shadowColor=color; c.shadowBlur=blur; c.shadowOffsetX=x+away; c.shadowOffsetY=y;
      c.drawImage(gl,-away,0,m.w,m.h);
    });
    c.shadowColor='transparent'; c.shadowBlur=0; c.shadowOffsetX=c.shadowOffsetY=0;
    const dot=(x,y,r)=>{c.moveTo(x+r,y);c.arc(x,y,r,0,Math.PI*2);};
    const openings=draw2=>{c.beginPath();draw2();c.fill();};
    // Large steel openings, eyelets and wire rings are cleared so the wall colour shows through.
    c.globalCompositeOperation='destination-out';
    c.fillStyle='#000';
    openings(()=>{
      M.plates.forEach(plate=>(plate.vents||[]).forEach(v=>dot(v.x,v.y,v.r-1)));
      M.clips.forEach(v=>dot(v.x,v.y,M.clipOpening+1.5));
      M.nodes.forEach(v=>dot(v.x,v.y,M.nodeHoleRadius-1));
    });
    c.globalCompositeOperation='source-over';
    // Through a card the wall sits in the card's shade, with the rim shadow on its upper left.
    M.clips.forEach(v=>{
      const outer=M.clipOpening+1.5, rim=M.clipOpening+.2;
      c.save();
      c.beginPath(); c.arc(v.x,v.y,outer,0,Math.PI*2); c.clip();
      c.fillStyle='rgba(20,20,19,.2)'; c.fillRect(v.x-outer,v.y-outer,outer*2,outer*2);
      c.shadowColor='rgba(20,20,19,.6)'; c.shadowBlur=2.5; c.shadowOffsetX=1.2; c.shadowOffsetY=1.8;
      c.fillStyle='#000';
      c.beginPath(); c.rect(v.x-outer-20,v.y-outer-20,outer*2+40,outer*2+40); c.arc(v.x,v.y,rim,0,Math.PI*2,true); c.fill('evenodd');
      c.restore();
    });
  }
  function resize(){
    const b=board.getBoundingClientRect();
    if (!b.width || !b.height || !window.__zhModules) return;
    const w=b.width,h=Math.ceil(b.height),gl=renderer.getContext();
    const maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),8192);
    const pr=Math.min(devicePixelRatio||1,2,maxSize/h,maxSize/w);
    const key=JSON.stringify([w,h,pr,window.__zhModules]);
    if (key===layoutKey) return;
    layoutKey=key; stats.resizes++;
    renderer.setPixelRatio(pr); renderer.setSize(w,h,true);
    camera.left=0;camera.right=w;camera.top=0;camera.bottom=-h;camera.position.z=5000;camera.updateProjectionMatrix();
    rebuild();
    if (metrics) metrics.h=h;
    draw();
    if(document.documentElement.dataset.look) paintShadow();
  }
  function deferResize(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{if(performance.now()-lastScroll<180){deferResize();return;} resize();},250);
  }
  // The canvas scrolls with the page, so scrolling never redraws it.
  addEventListener('scroll',()=>{lastScroll=performance.now();},{passive:true});
  addEventListener('resize',deferResize,{passive:true});
  addEventListener('load',deferResize,{once:true}); document.fonts?.ready.then(deferResize);
  addEventListener('zh-layout',deferResize);
  addEventListener('zh-look',()=>{clearTimeout(resizeTimer);resize();});
  let observed=''; new ResizeObserver(()=>{const key=board.offsetWidth+'x'+board.offsetHeight;if(key!==observed){observed=key;deferResize();}}).observe(board);
  resize();
})().catch(() => { document.documentElement.classList.remove('webgl-ready'); document.documentElement.classList.add('webgl-fallback'); });
