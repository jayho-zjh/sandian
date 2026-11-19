let smallAmap=null;
function clearSmallMap(){
 smallAmap?.destroy();smallAmap=null;document.getElementById('amapPreview')?.remove();
 const svg=document.getElementById('route').ownerSVGElement;svg.style.display='';if(svg.nextElementSibling?.tagName==='A')svg.nextElementSibling.hidden=false;
}
const demoRuns=[
 {id:'n3',date:'2026-11-03T07:10:00+08:00',km:4.8,pace:370,path:'M100 132 Q91 85 142 57 T258 46'},
 {id:'n8',date:'2026-11-08T07:20:00+08:00',km:7.2,pace:358,path:'M153 179 Q204 201 277 191 T397 157 Q469 145 456 85'},
 {id:'n18',date:'2026-11-18T06:45:00+08:00',km:6.2,pace:362,path:'M268 48 Q314 63 370 48 T454 81 Q471 136 413 155 T307 189'}
];
const getRunEl=id=>document.getElementById(id);
const clockTime=seconds=>{
 if(seconds==null||!Number.isFinite(Number(seconds)))return '—';
 const n=Math.round(seconds);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
};
let data=window.runningArchive;
let runs=data?data.runs:demoRuns;
const monthSelect=getRunEl('month');
function fillMonths(preferred){
const nowMonth=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date());
const launch=data?data.since.slice(0,7):'2026-11';
const endMonth=data?nowMonth:'2026-12';

monthSelect.replaceChildren();
for(let cursor=new Date(launch+'-01T00:00:00Z');cursor.toISOString().slice(0,7)<=endMonth;cursor.setUTCMonth(cursor.getUTCMonth()+1)){
 const m=cursor.toISOString().slice(0,7);monthSelect.add(new Option(m.replace('-',' 年 ')+' 月',m));
}
monthSelect.value=preferred&&Array.from(monthSelect.options).some(o=>o.value===preferred)?preferred:(data?nowMonth:launch);
}
fillMonths();
let selected=location.hash.startsWith('#run-')?location.hash.slice(5):'';
const restored=runs.find(r=>r.id===selected);if(restored)monthSelect.value=restored.date.slice(0,7);
function projectedPath(points){
 const route=getRunEl('route'),svg=route.ownerSVGElement,ns=svg.namespaceURI;
 svg.querySelector('.basemap')?.remove();
 if(!points||points.length<2)return '';
 const {width:w,height:h}=svg.getBoundingClientRect();
 if(!w||!h)return '';
 svg.setAttribute('viewBox','0 0 '+w+' '+h);
 const coords=points.map(([lat,lon])=>{
 const sin=Math.sin(lat*Math.PI/180);
 return [(lon+180)/360,(1-Math.log((1+sin)/(1-sin))/(2*Math.PI))/2];
 });
 let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(const [x,y] of coords){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 const mobile=w<=720,wide=mobile?.77:.43,tall=mobile?.34:.58;
 const scale=Math.min(w*wide/Math.max(x1-x0,1e-8),h*tall/Math.max(y1-y0,1e-8));
 const left=(x1+x0)/2-w*(mobile?.54:.72)/scale,top=(y1+y0)/2-h*(mobile?.62:.46)/scale;
 const tiles=document.createElementNS(ns,'g');tiles.setAttribute('class','basemap');
 const layers=localMapLayers(w,h,scale,left,top);
 const offline=layers.length>0;
 if(!offline&&/^https?:$/.test(location.protocol)){
 const z=Math.max(2,Math.min(19,Math.floor(Math.log2(scale/256)))),n=2**z,side=scale/n;
 for(let x=Math.floor(left*n);x<=Math.floor((left+w/scale)*n);x++){
 for(let y=Math.max(0,Math.floor(top*n));y<=Math.min(n-1,Math.floor((top+h/scale)*n));y++){
 layers.push({src:'https://tile.openstreetmap.org/'+z+'/'+((x%n+n)%n)+'/'+y+'.png',x:(x/n-left)*scale,y:(y/n-top)*scale,side});
 }}
 tiles.style.filter='grayscale(1) invert(.9) brightness(.75)';
 }
 for(const tile of layers){
 const image=document.createElementNS(ns,'image');
 for(const [k,v] of Object.entries({x:tile.x,y:tile.y,width:tile.side+.3,height:tile.side+.3,href:tile.src}))image.setAttribute(k,v);
 tiles.append(image);
 }
 getRunEl('mapCredit').textContent=offline?'OpenFreeMap · OpenMapTiles · © OpenStreetMap':layers.length?'© OpenStreetMap':'该区域暂无离线底图';
 svg.insertBefore(tiles,route);
 return coords.map(([x,y],i)=>(i?'L':'M')+((x-left)*scale).toFixed(2)+' '+((y-top)*scale).toFixed(2)).join(' ');
}
function replay(){
 if(smallAmap){smallAmap.replay();return}
 const route=getRunEl('route');route.getAnimations().forEach(a=>a.cancel());
 if(!route.getAttribute('d')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const length=route.getTotalLength();route.animate([{strokeDasharray:length+' '+length,strokeDashoffset:length},{strokeDasharray:length+' '+length,strokeDashoffset:0}],{duration:1800,easing:'ease-in-out'});
}
function renderRuns(){
 const month=monthSelect.value;
 const inMonth=runs.filter(r=>r.date.startsWith(month));
 const run=inMonth.find(r=>r.id===selected)||inMonth.filter(r=>r.points?.length>1||r.path).at(-1)||inMonth.at(-1)||runs.filter(r=>r.date.slice(0,7)<month).at(-1);
 selected=run?.id||'';
 getRunEl('headline').textContent='本月跑了 '+new Set(inMonth.map(r=>r.date.slice(0,10))).size+' 天';
 const stats=[[inMonth.reduce((s,r)=>s+(r.km??0),0).toFixed(1)+' km','本月里程'],[inMonth.length+' 次','跑步次数'],[data?(data.ability??'—'):'45.2','当前跑力指数'],[data?clockTime(data.predictions?.km5):'24:30','5 km 预测']];
 getRunEl('metrics').innerHTML=stats.map(([v,k])=>'<div><b>'+esc(v)+'</b><small>'+k+'</small></div>').join('');
 const buttons=getRunEl('dates');buttons.replaceChildren();
 for(const r of inMonth){
 const b=document.createElement('button');b.textContent=r.date.slice(5,10).replace('-','.')+(inMonth.some(other=>other!==r&&other.date.slice(0,10)===r.date.slice(0,10))?' '+r.date.slice(11,16):'');b.setAttribute('aria-pressed',r===run);b.onclick=()=>{selected=r.id;renderRuns();buttons.querySelector('[aria-pressed=true]').focus()};buttons.append(b);
 }
 if(!inMonth.length)buttons.textContent='本月暂无跑步记录';
 clearSmallMap();
 const sourcePoints=usableTrack(run?.points);
 const osmPoints=forOsm(sourcePoints);
 getRunEl('mapCredit').textContent='';
 const backdrop=osmPoints.length?osmPoints:forOsm(usableTrack(runs.filter(r=>r.points?.length>1&&r.date<=(run?.date||'')).at(-1)?.points));
 const line=projectedPath(backdrop);
 const path=run?.path||(osmPoints.length?line:'');
 const route=getRunEl('route');route.setAttribute('d',path);
 for(const [id,dist] of [['start',0],['end',path?route.getTotalLength():0]]){
 const dot=getRunEl(id);dot.style.display=path?'':'none';if(path){const p=route.getPointAtLength(dist);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y)}
 }
 getRunEl('replay').disabled=!path;
 const prev=new Date(month+'-01T00:00:00Z');prev.setUTCMonth(prev.getUTCMonth()-1);
 const label=inMonth.length?'':run?.date.startsWith(prev.toISOString().slice(0,7))?'上月最后一跑 · ':'此前最后一跑 · ';
 getRunEl('caption').textContent=run?label+run.date.slice(0,10)+' · '+(run.km==null?'—':Number(run.km.toFixed(2)))+' km · '+clockTime(run.pace)+'/km'+(!path?(run.indoor?' · 室内跑':' · 暂无轨迹'):''):'尚无已公开的跑步记录';
 const earlier=runs.filter(r=>r.date<=String(run?.date)&&(r.points?.length>1||r.path)).at(-1);
 const near=getRunEl('nearTrack');near.hidden=Boolean(path)||!earlier;
 near.onclick=()=>{monthSelect.value=earlier.date.slice(0,7);selected=earlier.id;renderRuns()};
 const useAmap=Boolean(location.protocol!=='file:'&&window.sandianAmap?.key&&osmPoints.length>1);
 if(useAmap){
 const svg=getRunEl('route').ownerSVGElement,host=document.createElement('div');host.id='amapPreview';host.style.height=Math.max(160,svg.getBoundingClientRect().height)+'px';svg.before(host);svg.style.display='none';if(svg.nextElementSibling)svg.nextElementSibling.hidden=true;
 amapTrack(host,sourcePoints).then(view=>{if(!host.isConnected){view?.destroy();return}smallAmap=view;view?.replay()}).catch(()=>{if(host.isConnected){clearSmallMap();getRunEl('caption').append(' · 高德加载失败，已显示备用地图')}});
 }
 const expand=getRunEl('geoView');expand.hidden=!run||!data;
 expand.textContent=osmPoints.length>1?'展开地图':'运动详情';
 expand.onclick=()=>{location.href='run-detail.html?id='+encodeURIComponent(run.id)+'&from='+encodeURIComponent(location.pathname.endsWith('running.html')?'running':'index')};
 const overlay=getRunEl('noGps');
 if(overlay){overlay.hidden=Boolean(path);overlay.textContent=run?.indoor?'室内跑 · 本次没有 GPS 轨迹':run?.points?.length?'等待确认轨迹坐标系':run?'本次暂无 GPS 轨迹':'本月等待首跑'}
 if(getRunEl('runLog'))renderMonthly(month,inMonth,monthSelect);
 replay();
}
getRunEl('source').textContent=data?'华为训练营 · 同步于 '+data.synced.slice(0,16).replace('T',' '):'跑步示例 · 等待华为同步';
monthSelect.onchange=()=>{selected='';renderRuns()};getRunEl('replay').onclick=replay;renderRuns();

setInterval(()=>{
 const script=document.createElement('script');
 script.src='running-data.js?refresh='+Date.now();
 script.onload=()=>{
 script.remove();
 const next=window.runningArchive;if(!next||data?.synced===next.synced)return;
 const previous=monthSelect.value,wasLatest=selected===runs.at(-1)?.id;
 data=next;runs=data.runs;fillMonths(wasLatest?null:previous);if(wasLatest)selected='';
 getRunEl('source').textContent='华为训练营 · 同步于 '+data.synced.slice(0,16).replace('T',' ');
 renderRuns();
 };
 script.onerror=()=>script.remove();document.head.append(script);
},300000);

let lastSize='';
new ResizeObserver(([entry])=>{
 const size=Math.round(entry.contentRect.width)+','+Math.round(entry.contentRect.height);
 if(lastSize&&lastSize!==size)renderRuns();
 lastSize=size;
}).observe(getRunEl('route').ownerSVGElement.parentElement);
