function card(target,href,photo,title,note){
 const host=document.getElementById(target), existing=host.querySelector('figure img');
 if(existing?.getAttribute('src')===photo+'.jpg'){
  existing.alt=title;host.querySelector('h2').textContent=title;host.querySelector('p').textContent=note;
  return;
 }
 const link=document.createElement('a');link.href=href;link.style.textDecoration='none';
 const loading=target==='albumCard'?'loading="eager" fetchpriority="high"':'loading="lazy"';
 link.innerHTML='<figure><img '+loading+' decoding="async" src="'+esc(photo)+'.jpg" alt="'+esc(title)+'"><figcaption><h2>'+esc(title)+'</h2><p>'+esc(note)+'</p></figcaption></figure>';
 host.replaceChildren(link);
}
const latest=(rows)=>[...rows].sort((a,b)=>b.date.localeCompare(a.date))[0];
const album=latest(journal.albums),drink=latest(journal.drinks);
const visit=latest(journal.spots.flatMap(s=>s.visits.map(v=>({...v,spot:s.name}))));
if(album)card('albumCard','photography.html',album.cover,'摄影 · '+album.name,album.date+' · '+album.photos.length+' 张');
else document.getElementById('albumCard').replaceChildren();
if(visit)card('fishCard','fishing.html#'+encodeURIComponent(visit.spot),visit.photo,'钓鱼 · '+visit.spot,visit.note);
if(drink)card('coffeeCard','coffee.html#drinks/'+encodeURIComponent(drink.id),drink.photo,'咖啡 · '+drink.name,'已制作 '+journal.drinks.length+' 种 · '+drink.note);
