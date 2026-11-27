/* Play the hero only while visible; leave the poster for reduced motion/data saving. */
(function () {
  'use strict';
  var video = document.getElementById('nsg-hv');
  if (!video) return;
  var base = '/assets/video/', suffix = '?v=2';
  var mobile = matchMedia('(max-width: 767px)').matches;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var hero = video.closest('.t-rec') || video;
  var rect = hero.getBoundingClientRect();
  var visible = rect.bottom > 0 && rect.top < innerHeight;
  var source = '';
  video.poster = base + (mobile ? 'svadby-hero-m.jpg' : 'svadby-hero.jpg') + suffix;
  function limited() {
    return reduce.matches || !!(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
  }
  function sync() {
    if (!visible || document.hidden || limited()) { video.pause(); return; }
    if (!source) return;
    if (!video.getAttribute('src')) { video.src = source; video.preload = 'metadata'; }
    if (video.paused) {
      var play = video.play();
      if (play && play.catch) play.catch(function () { /* Poster remains available. */ });
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', function () { video.pause(); });
  window.addEventListener('pageshow', sync);
  if (reduce.addEventListener) reduce.addEventListener('change', sync);
  if (connection && connection.addEventListener) connection.addEventListener('change', sync);
  if (limited()) return;
  var candidates = mobile ? [
    ['m.av1', 'av01.0.12M.10', 1080, 2160, 4000000],
    ['m.hevc', 'hvc1.2.4.L150.B0', 1080, 2160, 5000000],
    ['m.h264', 'avc1.640032', 1080, 2160, 8000000]
  ] : [
    ['1080.av1', 'av01.0.08M.10', 1920, 1080, 3000000],
    ['1080.hevc', 'hvc1.2.4.L123.B0', 1920, 1080, 4000000],
    ['1080.h264', 'avc1.640028', 1920, 1080, 7000000]
  ];
  function supported(candidate) {
    var type = 'video/mp4; codecs="' + candidate[1] + '"';
    if (navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo) {
      return navigator.mediaCapabilities.decodingInfo({type: 'file', video: {
        contentType: type, width: candidate[2], height: candidate[3], bitrate: candidate[4], framerate: 25
      }}).catch(function () { return {}; });
    }
    return Promise.resolve({supported: !!video.canPlayType(type), smooth: true});
  }
  Promise.all(candidates.map(supported)).then(function (results) {
    var index = results.findIndex(function (r) { return r.supported && r.smooth && r.powerEfficient; });
    if (index < 0) index = results.findIndex(function (r) { return r.supported && r.smooth; });
    if (index < 0) return;
    source = base + 'svadby-hero-' + candidates[index][0] + '.mp4' + suffix;
    sync();
  });
  video.addEventListener('canplay', sync);
})();
