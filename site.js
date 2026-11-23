function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
// Gaode JS API web key. Use a same-origin security proxy for a deployed site.
window.sandianAmap = {key:'', serviceHost:''};
document.addEventListener('load', event => {
 const image = event.target;
 if (image instanceof HTMLImageElement && image.alt) image.classList.add('journal-loaded');
}, true);
