(function () {
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 首页：面试官的问题像字幕一样逐字出现（只播放一次）
  const typed = document.querySelector('[data-typed]');
  if (typed && !reduce) {
    const full = typed.textContent;
    typed.textContent = '';
    let i = 0;
    const timer = setInterval(function () {
      i += 1;
      typed.textContent = full.slice(0, i);
      if (i >= full.length) clearInterval(timer);
    }, 1400 / full.length);
  }

  // 下载页：识别访问者的系统，把对应版本标为“你的电脑”
  const ua = navigator.userAgent || '';
  const os = /Windows/i.test(ua) ? 'win' : /Macintosh|Mac OS X/i.test(ua) ? 'mac' : '';
  if (os) {
    const card = document.querySelector('[data-platform="' + os + '"]');
    if (card) {
      card.classList.add('is-yours');
      if (os === 'mac' && card.parentNode.firstElementChild !== card) {
        card.parentNode.insertBefore(card, card.parentNode.firstElementChild);
      }
    }
  }

  // 下载链接集中在 downloads.json；发布时只改那一个文件
  const buttons = document.querySelectorAll('[data-dl]');
  if (!buttons.length || !window.fetch) return;
  fetch('downloads.json', { cache: 'no-store' })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || !data.files) return;
      buttons.forEach(function (btn) {
        const f = data.files[btn.getAttribute('data-dl')];
        if (!f) return;
        const size = btn.querySelector('.size');
        if (size && f.bytes) size.textContent = Math.round(f.bytes / 1048576) + ' MB';
        if (data.released && f.url) {
          btn.href = f.url;
          btn.removeAttribute('aria-disabled');
          const label = btn.querySelector('.label');
          if (label && btn.getAttribute('data-ready'))
            label.textContent = btn.getAttribute('data-ready');
        }
      });
      const note = document.querySelector('[data-release-note]');
      if (note && data.released) note.hidden = true;
    })
    .catch(function () {});
})();
