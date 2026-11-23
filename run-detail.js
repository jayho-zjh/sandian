const byId=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const archive=window.runningArchive?.runs||[];
const run=archive.find(r=>r.id===params.get('id'));
const specs={
 pace:{name:'配速',unit:'/km',color:'#9a722f'},
 hr:{name:'心率',unit:'次/分',color:'#9a722f'},
 cadence:{name:'步频',unit:'步/分',color:'#9a722f'},
 altitude:{name:'海拔',unit:'m',color:'#9a722f'}
};
function clock(value){
 if(!Number.isFinite(value))return '—';
 const seconds=Math.round(value),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
 return (h?h+':':'')+(h?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');
}
function valueText(key,v){return !Number.isFinite(v)?'—':key==='pace'?clock(v):String(Math.round(v))}
function chart(metrics){
 const tabs=byId('tabs'),slider=byId('slider'),plot=byId('plot'),series=metrics.series||{},sections=metrics.sections||[];
 const sets=Object.entries(specs).map(([key,spec])=>{
  const samples=series[key];
  const data=samples?.length?samples:sections.filter(s=>Number.isFinite(s[key])).map(s=>[s.t,s[key]]);
  return {key,...spec,data,sampled:Boolean(samples?.length)};
 }).filter(s=>s.data.length);
 if(!sets.length){byId('graph').hidden=true;byId('chartNote').textContent='这次运动尚无可显示的指标采样。';return}
 function show(set){
  const {key,data,color}=set;
  tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.key===key));
  const vals=data.map(p=>p[1]),duration=Math.max(1,data.at(-1)[0],run.seconds||0);
  let lo=Math.min(...vals),hi=Math.max(...vals);if(lo===hi){lo-=1;hi+=1}
  const x=t=>12+t/duration*700,y=v=>key==='pace'?16+196*(v-lo)/(hi-lo):212-196*(v-lo)/(hi-lo);
  const positions=data.map(([t,v])=>[x(t),y(v)]);
  // Leave visible breaks where the device stopped supplying measurements.
  const groups=[];
  positions.forEach((pos,i)=>{if(!i||(set.sampled&&data[i][0]-data[i-1][0]>30))groups.push([]);groups.at(-1).push(pos)});
  let grid='';
  for(let i=0;i<=4;i++){
   const value=lo+(hi-lo)*i/4,py=y(value);
   grid+='<path d="M12 '+py+' H715" stroke="#cbcfc4" stroke-width="0.6"/><text x="725" y="'+(py+4)+'" fill="#61665f" font-size="12">'+valueText(key,value)+'</text>';
  }
  const shapes=groups.map(g=>{
   const line='M'+g.map(([px,py])=>px.toFixed(2)+' '+py.toFixed(2)).join(' L');
   return '<path d="'+line+' V224 H'+g[0][0]+' Z" fill="url(#area)"/><path d="'+line+'" fill="none" stroke="'+color+'" stroke-width="1.6"/>';
  }).join('');
  plot.innerHTML='<defs><linearGradient id="area" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="'+color+'" stop-opacity=".45"/><stop offset="1" stop-color="'+color+'" stop-opacity=".04"/></linearGradient></defs>'+grid+shapes+'<line id="cursor" y1="10" y2="224" stroke="#61665f" opacity=".75"/><circle id="dot" r="3.5" fill="#f4b657"/>';
  plot.setAttribute('aria-label',set.name+'随时间变化');
  byId('duration').textContent=clock(duration);
  byId('chartNote').textContent=set.sampled?'按运动开始后的时间绘制，每 10 秒汇总一次有效采样。':'按设备分段均值绘制，每个点对应一段的结束时间。';
  slider.max=data.length-1;
  function inspect(i){
   slider.value=i;const [t,v]=data[i],[px,py]=positions[i];
   byId('cursor').setAttribute('x1',px);byId('cursor').setAttribute('x2',px);byId('dot').setAttribute('cx',px);byId('dot').setAttribute('cy',py);
   byId('readout').textContent=clock(t)+'　'+set.name+' '+valueText(key,v)+' '+set.unit;
  }
  slider.oninput=()=>inspect(Number(slider.value));
  plot.onpointermove=e=>{
   const box=plot.getBoundingClientRect(),target=((e.clientX-box.left)/box.width*800-12)/700*duration;
   let l=0,r=data.length-1;while(l<r){const mid=(l+r)>>1;if(data[mid][0]<target)l=mid+1;else r=mid}
   inspect(l&&target-data[l-1][0]<data[l][0]-target?l-1:l);
  };
  inspect(0);
 }
 for(const set of sets){const b=document.createElement('button');b.dataset.key=set.key;b.textContent=set.name;b.onclick=()=>show(set);tabs.append(b)}
 show(sets[0]);
}
function table(sections){
 if(!sections?.length){byId('table').textContent='设备未提供本次运动的分段记录。';return}
 const fmt=(v,d)=>Number.isFinite(v)?v.toFixed(d):'—';
 byId('table').innerHTML='<table><thead><tr>'+['分段','用时','距离 / km','配速 / km','平均心率','平均步频','上升 / m','下降 / m'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+sections.map(s=>'<tr>'+[s.n,clock(s.seconds),fmt(s.metres/1000,2),clock(s.pace),fmt(s.hr,0),fmt(s.cadence,0),fmt(s.ascent,1),fmt(s.descent,1)].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
async function routeMap(){
 const host=byId('map'),raw=usableTrack(run.points),pts=forOsm(raw);
 if(pts.length<2){host.textContent=run.indoor?'室内跑 · 没有 GPS 轨迹':'暂无可定位的轨迹';return}
 if(location.protocol!=='file:'&&window.sandianAmap?.key){
  try{await amapTrack(host,raw);return}catch{host.replaceChildren()}
 }
 const bounds=axis=>pts.reduce(([lo,hi],p)=>[Math.min(lo,p[axis]),Math.max(hi,p[axis])],[Infinity,-Infinity]);
 const [s,n]=bounds(0),[w,e]=bounds(1),center=[(s+n)/2,(e+w)/2];
 const span=Math.max((e-w)/360/host.clientWidth,(n-s)/360/Math.cos(center[0]*Math.PI/180)/host.clientHeight,1e-10);
 const zoom=Math.max(2,Math.min(18,Math.floor(Math.log2(.82/(256*span)))));
 atlas(host,{center,zoom,localMap:true,points:pts,markers:[{name:'起点',point:pts[0]},{name:'终点',point:pts.at(-1)}]});
}
if(!run){byId('title').textContent='未找到这次运动记录'}
else{
 const from=params.get('from')==='index'?'index.html':'running.html';byId('back').href=from+'#run-'+run.id;
 byId('layout').hidden=false;byId('title').innerHTML=(run.indoor?'室内跑步':'户外跑步')+'<small>'+esc(run.date.slice(0,16).replace('T',' '))+'</small>';
 const metrics=window.runMetrics?.[run.id]||{};
 byId('distance').textContent=run.km?.toFixed(2)??'—';
 const stats=metrics.stats||{},sections=metrics.sections||[];
 const weightedCadence=sections.filter(s=>s.cadence>0&&s.seconds>0);
 const cadence=stats.cadence??(weightedCadence.length?weightedCadence.reduce((sum,s)=>sum+s.cadence*s.seconds,0)/weightedCadence.reduce((sum,s)=>sum+s.seconds,0):null);
 const sectionTotal=key=>sections.length&&sections.every(s=>Number.isFinite(s[key]))?sections.reduce((sum,s)=>sum+s[key],0):null;
 const kpis=[['运动时间',clock(run.seconds),''],['平均配速',clock(run.pace),'/km'],['总热量',stats.totalKcal,'千卡'],['活动热量',stats.activeKcal,'千卡'],['平均步频',cadence==null?null:Math.round(cadence),'步/分'],['平均步幅',stats.strideCm,'cm'],['平均心率',metrics.avgHr,'次/分'],['累计上升',stats.ascent??sectionTotal('ascent'),'m'],['累计下降',stats.descent??sectionTotal('descent'),'m']];
 byId('kpis').innerHTML=kpis.filter(([,v])=>v!=null).map(([label,v,unit])=>'<div><dt>'+label+'</dt><dd>'+esc(typeof v==='number'?Number(v.toFixed(1)):v)+' <small>'+unit+'</small></dd></div>').join('');
 const splits=sections.filter(s=>s.metres>=990&&s.metres<=1010&&s.pace>0).map(s=>s.pace);
 const min=stats.fastest??(splits.length?Math.min(...splits):null),max=stats.slowest??(splits.length?Math.max(...splits):null);
 if(min!=null&&max!=null){byId('paceRange').hidden=false;byId('paceRange').title='每公里分段配速';byId('slow').textContent='最慢 '+clock(max)+' /km';byId('fast').textContent='最快 '+clock(min)+' /km'}

 chart(metrics);table(metrics.sections);routeMap();
}
