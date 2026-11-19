/* Huawei Health Kit location.sample: 1 = WGS84, 2 = GCJ-02. */
function gcjShift(lat,lon){
 const x=lon-105,y=lat-35,pi=Math.PI,s=Math.sin;
 const wave=(20*s(6*x*pi)+20*s(2*x*pi))*2/3;
 let dy=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x))+wave;
 let dx=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x))+wave;
 dy+=(20*s(y*pi)+40*s(y*pi/3)+160*s(y*pi/12)+320*s(y*pi/30))*2/3;
 dx+=(20*s(x*pi)+40*s(x*pi/3)+150*s(x*pi/12)+300*s(x*pi/30))*2/3;
 const rad=lat*pi/180,e=.006693421622965943,m=1-e*s(rad)**2,root=Math.sqrt(m),a=6378245;
 return [dy*180/(a*(1-e)/(m*root)*pi),dx*180/(a/root*Math.cos(rad)*pi)];
}
function usableTrack(points=[]){
 // The map's latitude limit excludes polar sentinel samples from wide-area fits.
 return points.filter(([lat,lon])=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85.05112878&&Math.abs(lon)<=180);
}
function forOsm(points){
 if(!points?.length||points.some(p=>p[2]!==1&&p[2]!==2))return [];
 return points.map(([lat,lon,crs])=>{
 if(crs===1)return [lat,lon];
 let a=lat,b=lon;
 for(let i=0;i<4;i++){const [dy,dx]=gcjShift(a,b);a=lat-dy;b=lon-dx}
 return [a,b];
 });
}
let amapSdk;
function loadAmap(){
 if(!amapSdk)amapSdk=new Promise((resolve,reject)=>{
 const cfg=window.sandianAmap;
 if(cfg.serviceHost)window._AMapSecurityConfig={serviceHost:cfg.serviceHost};
 const script=document.createElement('script'),timer=setTimeout(()=>fail(),12000);
 const fail=()=>{clearTimeout(timer);amapSdk=null;reject(new Error('地图加载失败'))};
 window.sandianAmapReady=()=>{clearTimeout(timer);resolve(window.AMap)};
 script.onerror=fail;script.src='https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(cfg.key)+'&callback=sandianAmapReady';document.head.append(script);
 });
 return amapSdk;
}
async function amapTrack(host,raw){
 const A=await loadAmap();
 // Mainland GCJ samples are already Gaode coordinates; delegate GPS conversion
 // to the SDK for WGS samples so border/outside-mainland rules stay with Gaode.
 const path=raw.map(([lat,lon])=>[lon,lat]),gps=[];
 raw.forEach((point,i)=>{if(point[2]===1)gps.push(i)});
 for(let i=0;i<gps.length;i+=40){
 const batch=gps.slice(i,i+40);
 const converted=await new Promise((resolve,reject)=>A.convertFrom(batch.map(j=>path[j]),'gps',(status,result)=>status==='complete'&&result.locations?.length===batch.length?resolve(result.locations):reject(Error('坐标转换失败'))));
 batch.forEach((j,k)=>{path[j]=converted[k]});
 }
 if(!host.isConnected)return;
 const map=new A.Map(host,{viewMode:'2D',mapStyle:'amap://styles/dark',center:path[0]});
 const line=new A.Polyline({path,strokeColor:'#f4b657',strokeWeight:4});
 map.add(line);
 for(const [i,label] of [[0,'起'],[path.length-1,'终']])map.add(new A.Marker({position:path[i],content:'<span style="background:#29352e;color:white;border-radius:10px;padding:2px 5px">'+label+'</span>'}));
 const preview=host.id==='amapPreview',mobile=host.clientWidth<=720;
 const padding=preview?(mobile?[host.clientHeight*.43,25,host.clientHeight*.19,25]:[64,host.clientWidth*.08,100,host.clientWidth*.48]):[30,30,30,30];
 map.setFitView([line],true,padding);
 let frame=0;
 function replay(){
 cancelAnimationFrame(frame);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){line.setPath(path);return}
 const start=performance.now();
 function step(now){const t=Math.min(1,(now-start)/1800);line.setPath(path.slice(0,Math.max(2,Math.ceil(path.length*t))));if(t<1)frame=requestAnimationFrame(step)}
 frame=requestAnimationFrame(step);
 }
 return {replay,destroy(){cancelAnimationFrame(frame);map.destroy()}};
}
