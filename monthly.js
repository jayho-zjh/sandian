let reportPeriod='',focusDay='';
function elapsed(seconds){
 if(!Number.isFinite(seconds))return '—';
 const n=Math.round(seconds);
 return Math.floor(n/3600)+':'+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
function renderMonthly(month,records,sourceSelect){
 renderHeatmap(month.slice(0,4),window.runningArchive);
 const report=document.getElementById('reportMonth'),type=document.getElementById('runType');
 if(reportPeriod!==month){focusDay='';reportPeriod=month}
 report.replaceChildren(...Array.from(sourceSelect.options,o=>new Option(o.text,o.value)));report.value=month;
 report.onchange=()=>{sourceSelect.value=report.value;sourceSelect.onchange()};
 const details=window.runMetrics||{},totalKm=records.reduce((s,r)=>s+(r.km??0),0);
 const timed=records.filter(r=>Number.isFinite(r.seconds)),totalSeconds=timed.reduce((s,r)=>s+r.seconds,0);
 const paces=records.map(r=>r.pace).filter(p=>Number.isFinite(p)&&p>0);
 function aggregate(key){
  const available=records.map(r=>{
   const m=details[r.id],value=m?.stats?.[key];
   if(Number.isFinite(value))return value;
   if(key==='ascent'&&m?.sections?.length&&m.sections.every(s=>Number.isFinite(s.ascent)))return m.sections.reduce((s,v)=>s+v.ascent,0);
   return null;
  }).filter(Number.isFinite);
  return [available.length?Number(available.reduce((s,v)=>s+v,0).toFixed(key==='load'?0:1)):records.length?'—':0,
   available.length&&available.length!==records.length?'有数据的 '+available.length+' / '+records.length+' 次':''];
 }
 const [load,loadNote]=aggregate('load'),[gain,gainNote]=aggregate('ascent');
 const stats=[['总距离',totalKm.toFixed(2),'km'],['总时间',elapsed(totalSeconds),''],['训练负荷',load,'',loadNote],['累计上升',gain,'m',gainNote],['总次数',records.length,'次'],['平均配速',paces.length?clockTime(paces.reduce((sum,p)=>sum+p,0)/paces.length):'—','/km','各次平均配速的均值']];
 document.getElementById('monthStats').innerHTML=stats.map(([k,v,u,n])=>'<div><dt>'+k+'</dt><dd>'+v+'<small>'+u+'</small>'+(n?'<em>'+n+'</em>':'')+'</dd></div>').join('');
 const [year,mon]=month.split('-').map(Number),days=new Date(Date.UTC(year,mon,0)).getUTCDate();
 const daily=Array(days).fill(0),count=Array(days).fill(0);for(const r of records){const i=Number(r.date.slice(8,10))-1;daily[i]+=r.km??0;count[i]++}
 const maximum=Math.max(4,Math.ceil(Math.max(...daily)/4)*4);
 const chart=document.getElementById('dailyChart');chart.innerHTML='<div class="bars" style="grid-template-columns:repeat('+days+',1fr)"><div class="scale">'+[1,.75,.5,.25,0].map(x=>'<span>'+maximum*x+'</span>').join('')+'</div></div><div class="dayticks"><span>'+month+'-01</span><span>10 日</span><span>20 日</span><span>'+days+' 日</span></div><div id="dailyValue" aria-live="polite"></div>';
 const bars=chart.querySelector('.bars'),value=chart.querySelector('#dailyValue');
 function filterList(){
  const chosen=records.filter(r=>(!focusDay||r.date.slice(0,10)===focusDay)&&(type.value==='all'||r.indoor===(type.value==='inside'))).slice().reverse();
  document.getElementById('logCount').textContent=chosen.length+' 次';
  const reset=document.getElementById('resetDay');reset.hidden=!focusDay;reset.textContent=focusDay.slice(5)+' ×';reset.setAttribute('aria-label','清除日期筛选');reset.onclick=()=>{focusDay='';filterList()};
  bars.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===focusDay)));
  value.textContent=focusDay?'已筛选 '+focusDay+' · '+daily[Number(focusDay.slice(-2))-1].toFixed(2)+' km':'';
  document.getElementById('runLog').innerHTML=chosen.map(r=>'<tr><td><i class="type-dot '+(r.indoor?'inside':'')+'"></i>'+(r.indoor?'室内跑步':'户外跑步')+'</td><td>'+esc(r.date.slice(0,16).replace('T',' '))+'</td><td>'+Number(r.km?.toFixed(2)??0)+' km</td><td>'+elapsed(r.seconds)+'</td><td>'+clockTime(r.pace)+' /km</td><td>'+(details[r.id]?.stats?.load??'—')+'</td><td><a href="run-detail.html?id='+encodeURIComponent(r.id)+'&amp;from=running">详情 ↗</a></td></tr>').join('')||'<tr><td colspan="7">当前条件下没有跑步记录。</td></tr>';
 }
 for(let i=0;i<days;i++){
  const day=month+'-'+String(i+1).padStart(2,'0'),b=document.createElement('button'),bar=document.createElement('i');
  b.type='button';b.dataset.day=day;b.disabled=!count[i];b.title=day+' · '+daily[i].toFixed(2)+' km · '+count[i]+' 次';b.setAttribute('aria-label',b.title);
  b.onfocus=b.onmouseenter=()=>{value.textContent=b.title};
  b.onclick=()=>{focusDay=focusDay===day?'':day;filterList()};
  bar.style.height=(daily[i]/maximum*100)+'%';b.append(bar);bars.append(b);
 }
 type.onchange=filterList;filterList();
}

function renderHeatmap(year, archive) {
 const grid=document.getElementById('heatGrid'), note=document.getElementById('heatNote');
 const totals=new Map();
 for(const run of archive?.runs||[]){
  const day=run.date.slice(0,10);
  totals.set(day,(totals.get(day)||0)+(run.km||0));
 }
 document.getElementById('heatTitle').textContent=year+' 年跑步热力图';
 note.textContent='每格一天 · 颜色越深，里程越长 · 金色为 20 km 及以上';
 const cells=document.createDocumentFragment(), first=new Date(Date.UTC(Number(year),0,1));
 const offset=(first.getUTCDay()+6)%7;
 for(let date=new Date(first),i=offset; date.getUTCFullYear()===Number(year);date.setUTCDate(date.getUTCDate()+1),i++){
  const day=date.toISOString().slice(0,10), week=Math.floor(i/7)+1;
  if(date.getUTCDate()===1){
   const label=document.createElement('small');
   label.textContent=(date.getUTCMonth()+1)+'月';label.style.gridArea='1 / '+week;cells.append(label);
  }
  const km=totals.get(day)||0;
  const outside=!archive||day<archive.since||day>archive.synced.slice(0,10);
  const cell=document.createElement(km?'button':'span');
  const text=day+' · '+(outside?'记录范围外':km.toFixed(2)+' km');
  cell.className='heat-cell';cell.dataset.level=outside?'outside':km>=20?'3':km>=10?'2':km?'1':'0';
  cell.style.gridArea=(i%7+2)+' / '+week;
  cell.title=text;cell.setAttribute('aria-label',text);
  cell.onmouseenter=cell.onfocus=cell.onclick=()=>{note.textContent=text};
  cells.append(cell);
 }
 grid.replaceChildren(cells);
}
