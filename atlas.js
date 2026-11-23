/* A small Web Mercator map with ordinary XYZ raster tiles. */
function atlas(host,{center=[29.78,121.64],zoom=13,markers=[],points=[],localMap=false,cartoLight=false,createMarker=null,onPick=null,onMarker=null}={}){
 const layer=document.createElement('div'),credit=document.createElement('a'),tools=document.createElement('div');
 Object.assign(host.style,{position:'relative',overflow:'hidden',background:cartoLight?'var(--paper)':'#263237',touchAction:'none'});
 host.replaceChildren(layer,tools,credit);
 Object.assign(layer.style,{position:'absolute',inset:0,overflow:'hidden'});
 Object.assign(credit.style,{position:'absolute',bottom:'0',right:'0',background:'#fff',color:'#222',font:'11px Arial',padding:'2px'});
 credit.href='https://www.openstreetmap.org/copyright';credit.textContent='© OpenStreetMap';credit.target='_blank';credit.rel='noopener';
  if(cartoLight){
 const carto=document.createElement('a');carto.href='https://carto.com/attributions';carto.textContent='© CARTO';carto.target='_blank';carto.rel='noopener';
 const attribution=document.createElement('span');attribution.style.cssText=credit.style.cssText;
 credit.style.cssText='';attribution.append(credit,' · ',carto);host.append(attribution);
 }
 Object.assign(tools.style,{position:'absolute',left:'8px',top:'8px',display:'flex',gap:'4px'});
 function world([lat,lon]){
 const s=Math.sin(Math.max(-85,Math.min(85,lat))*Math.PI/180);
 return [(lon+180)/360,(1-Math.log((1+s)/(1-s))/(2*Math.PI))/2];
 }
 function geo(x,y){return [Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI, x*360-180]}
 let [cx,cy]=world(center),z=zoom,drag=null;
 function change(delta){z=Math.max(2,Math.min(19,z+delta));draw()}
 for(const [label,delta] of [['+',1],['−',-1]]){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',delta>0?'放大地图':'缩小地图');b.onclick=()=>change(delta);tools.append(b);
 }
 function draw(){
 const w=host.clientWidth,h=host.clientHeight,size=256*2**z,x0=cx*size-w/2,y0=cy*size-h/2;
 const fragment=document.createDocumentFragment();
 const regional=localMap?localMapLayers(w,h,size,x0/size,y0/size):[];
 if(localMap&&(regional.length||location.protocol==='file:')){
 credit.textContent='OpenFreeMap · OpenMapTiles · © OpenStreetMap';
 for(const tile of regional){
 const img=new Image();img.alt='';img.draggable=false;img.src=tile.src;
 Object.assign(img.style,{position:'absolute',width:(tile.side+.3)+'px',height:(tile.side+.3)+'px',left:tile.x+'px',top:tile.y+'px',pointerEvents:'none'});fragment.append(img);
 }
 }else for(let x=Math.floor(x0/256);x<=Math.floor((x0+w)/256);x++){
 for(let y=Math.max(0,Math.floor(y0/256));y<=Math.min(2**z-1,Math.floor((y0+h)/256));y++){
 const img=new Image();img.alt='';img.draggable=false;img.src=(cartoLight?'https://basemaps.cartocdn.com/light_nolabels/':'https://tile.openstreetmap.org/')+z+'/'+((x%2**z+2**z)%2**z)+'/'+y+'.png';
 Object.assign(img.style,{position:'absolute',width:'256px',height:'256px',left:x*256-x0+'px',top:y*256-y0+'px',pointerEvents:'none',opacity:cartoLight?'1':'.82',filter:cartoLight?'saturate(.6) brightness(1.02)':'none'});fragment.append(img);
 }}
 const pixel=p=>{const [x,y]=world(p);return [x*size-x0,y*size-y0]};
 if(points.length){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+w+' '+h);Object.assign(svg.style,{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'});
 const route=document.createElementNS(svg.namespaceURI,'polyline');route.setAttribute('points',points.map(p=>pixel(p).join(',')).join(' '));route.setAttribute('fill','none');route.setAttribute('stroke','#d98524');route.setAttribute('stroke-width','4');svg.append(route);fragment.append(svg)}
 if(localMap&&window.runLabels){
 const occupied=[],names=new Set();
 for(const [wx,wy,name,minZoom] of window.runLabels){
 if(z<minZoom||names.has(name))continue;
 const px=wx*size-x0,py=wy*size-y0,half=Math.min(100,name.length*7+5);
 if(px<half||px>w-half||py<15||py>h-16)continue;
 if(occupied.some(([x,y,hw])=>Math.abs(x-px)<hw+half&&Math.abs(y-py)<23))continue;
 const label=document.createElement('span');label.className='place-label';label.textContent=name;
 Object.assign(label.style,{left:px+'px',top:py+'px'});fragment.append(label);
 occupied.push([px,py,half]);names.add(name);
 }
 }
  for(const m of markers){
 const [x,y]=pixel(m.point);
 if(createMarker){
 const marker=createMarker(m);marker.style.left=x+'px';marker.style.top=y+'px';marker.onclick=()=>onMarker?.(m);fragment.append(marker);continue;
 }
 const b=document.createElement('button');b.type='button';b.textContent='● '+m.name;Object.assign(b.style,{position:'absolute',top:y+'px',left:x+'px',transform:'translate(-50%,-50%)',whiteSpace:'nowrap',borderRadius:'16px',border:'1px solid #705a33',background:'#f6d596',color:'#221e16'});b.onclick=()=>onMarker?.(m);fragment.append(b)}
 layer.replaceChildren(fragment);
 }
 host.onpointerdown=e=>{if(e.target.closest('button,a'))return;drag=[e.clientX,e.clientY,cx,cy];host.setPointerCapture(e.pointerId)};
 host.onpointermove=e=>{if(!drag)return;const size=256*2**z;cx=drag[2]-(e.clientX-drag[0])/size;cy=Math.max(0,Math.min(1,drag[3]-(e.clientY-drag[1])/size));draw()};
 host.onpointerup=e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag[0],e.clientY-drag[1]);drag=null;if(moved<4&&onPick){const r=host.getBoundingClientRect(),size=256*2**z;onPick(geo(cx+(e.clientX-r.left-r.width/2)/size,cy+(e.clientY-r.top-r.height/2)/size))}};
 host.onpointercancel=()=>{drag=null};
 const observer=new ResizeObserver(draw);observer.observe(host);draw();
 return {destroy:()=>observer.disconnect(),focus(point){[cx,cy]=world(point);draw()},mark(point,name){markers=[{point,name}];draw()}};
}
/* Draw cached regional cartography at exactly the route's Web Mercator scale. */
function localMapLayers(width,height,scale,left,top){
 const region=window.previewRegion;
 if(region && !window.runTiles){
  const side=scale/2**region.zoom;
  const visible=region.tiles.some(([x,y])=>x*side+side>left*scale && x*side<left*scale+width && y*side+side>top*scale && y*side<top*scale+height);
  return visible?[{src:"route-region.webp",side:region.span*side,x:region.x*side-left*scale,y:region.y*side-top*scale}]:[];
 }
 const result=[];
 for(const [key,bytes] of Object.entries(window.runTiles||{})){
  const [z,x,y]=key.split('/').map(Number);
  if(z===14&&scale<256*2**12)continue;
  const count=2**z,side=scale/count,px=(x/count-left)*scale,py=(y/count-top)*scale;
  if(px>=width||py>=height||px+side<=0||py+side<=0)continue;
  result.push({src:'data:image/webp;base64,'+bytes,x:px,y:py,side});
 }
 return result;
}
