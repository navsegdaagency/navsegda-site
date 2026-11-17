const lightbox = document.getElementById('lightbox');
const photoButtons = [...document.querySelectorAll('[data-photo]')];
const fullPhoto = lightbox.querySelector('img');
let currentPhoto = 0;
let lastFocused;
function showPhoto(index) {
  currentPhoto = (index + photoButtons.length) % photoButtons.length;
  const thumbnail = photoButtons[currentPhoto].querySelector('img');
  fullPhoto.src = thumbnail.src;
  fullPhoto.alt = thumbnail.alt;
  lightbox.querySelector('.counter').textContent = `${currentPhoto + 1} / ${photoButtons.length}`;
}
photoButtons.forEach((button, index) => button.addEventListener('click', () => {
  lastFocused = button;
  showPhoto(index);
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
