const lightbox = document.getElementById('lightbox');
const allPhotos = [...document.querySelectorAll('[data-photo]')];
const fullPhoto = lightbox.querySelector('img');
let activePhotos = [];
let currentPhoto = 0;
let lastFocused;
function showPhoto(index) {
  currentPhoto = (index + activePhotos.length) % activePhotos.length;
  const thumbnail = activePhotos[currentPhoto].querySelector('img');
  fullPhoto.src = thumbnail.src;
  fullPhoto.alt = thumbnail.alt;
  lightbox.querySelector('.counter').textContent = `${thumbnail.alt} · ${currentPhoto + 1} / ${activePhotos.length}`;
}
allPhotos.forEach(button => button.addEventListener('click', () => {
  lastFocused = button;
  activePhotos = allPhotos.filter(photo => photo.closest('section') === button.closest('section'));
  showPhoto(activePhotos.indexOf(button));
  lightbox.showModal();
}));
lightbox.querySelector('.close').addEventListener('click', () => lightbox.close());
lightbox.querySelector('.prev').addEventListener('click', () => showPhoto(currentPhoto - 1));
lightbox.querySelector('.next').addEventListener('click', () => showPhoto(currentPhoto + 1));
lightbox.addEventListener('close', () => lastFocused?.focus());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
document.addEventListener('keydown', event => {
  if (!lightbox.open) return;
  if (event.key === 'ArrowRight') showPhoto(currentPhoto + 1);
  if (event.key === 'ArrowLeft') showPhoto(currentPhoto - 1);
});
let touchStart;
fullPhoto.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
fullPhoto.addEventListener('touchend', event => {
  const delta = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(delta) > 40) showPhoto(currentPhoto + (delta < 0 ? 1 : -1));
}, { passive: true });
document.getElementById('print').addEventListener('click', event => { event.preventDefault(); window.print(); });
