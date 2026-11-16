(function () {
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 首页舞台右上角：访客设备上的当前时间（本地时区，24 小时制），与动画无关，减少动态效果时也显示
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const pad = function (n) {
      return String(n).padStart(2, '0');
    };
    const tick = function () {
      const d = new Date();
      clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      setTimeout(tick, 1000 - d.getMilliseconds() + 5);
    };
    tick();
  }

  // 首页舞台：几轮问答循环播放；滚出屏幕或切到别的标签页时暂停
  const stage = document.querySelector('[data-stage]');
  const scenesEl = stage && stage.querySelector('[data-scenes]');
  if (stage && scenesEl && !reduce && window.Promise) {
    let scenes = [];
    try {
      scenes = JSON.parse(scenesEl.textContent);
    } catch (_e) {
      scenes = [];
    }
    if (scenes.length) playStage(stage, scenes);
  }

  function playStage(stage, scenes) {
    const $ = function (sel) {
      return stage.querySelector(sel);
    };
    const q = $('[data-q]');
    const card = $('.answer-card');
    const status = $('[data-status]');
    const lead = $('[data-lead]');
    const list = $('[data-points]');
    const foot = $('.answer-foot');
    const footText = $('[data-foot]');
    const dots = stage.querySelectorAll('[data-dots] i');

    let onScreen = true;
    const visible = function () {
      return onScreen && !document.hidden;
    };
    if ('IntersectionObserver' in window) {
      new window.IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        stage.classList.toggle('is-paused', !onScreen);
      }).observe(stage);
    }

    // 只在可见时计时的等待：暂停期间不往前走
    function wait(ms) {
      return new Promise(function (resolve) {
        let left = ms;
        let last = window.performance.now();
        (function tick() {
          const now = window.performance.now();
          if (visible()) left -= now - last;
          last = now;
          if (left <= 0) resolve();
          else setTimeout(tick, Math.min(left, 100));
        })();
      });
    }

    // 逐字写入；中英文混排时英文按词出，读起来更像模型流式输出
    async function stream(node, text, perChar, caretEl) {
      const tokens = text.match(/[A-Za-z0-9_]+|\s+|./gu) || [];
      if (caretEl) caretEl.classList.add('is-typing');
      for (let i = 0; i < tokens.length; i += 1) {
        node.textContent += tokens[i];
        await wait(perChar * Math.min(tokens[i].length, 3));
      }
      if (caretEl) caretEl.classList.remove('is-typing');
    }

    async function playScene(scene, index) {
      // 收起上一轮
      card.classList.add('is-hidden');
      await wait(index === 0 ? 200 : 550);
      dots.forEach(function (d, i) {
        d.classList.toggle('on', i === index);
      });
      lead.textContent = '';
      lead.classList.remove('is-marked');
      list.textContent = '';
      footText.textContent = scene.foot;
      foot.classList.add('is-pending');

      // 面试官提问：字幕逐字出现
      q.textContent = '';
      stage.classList.add('is-speaking');
      await wait(250);
      await stream(q, scene.q, 1500 / scene.q.length, q);
      stage.classList.remove('is-speaking');

      // 起草中：骨架屏
      await wait(350);
      status.textContent = '起草中';
      stage.classList.add('is-thinking');
      card.classList.remove('is-hidden');
      await wait(1100);
      stage.classList.remove('is-thinking');
      status.textContent = scene.ttft;

      // 流式写出结论和要点
      await stream(lead, scene.lead, 34, lead);
      lead.classList.add('is-marked');
      for (let i = 0; i < scene.points.length; i += 1) {
        const parts = scene.points[i].split('：');
        const li = document.createElement('li');
        const label = document.createElement('b');
        const body = document.createTextNode('');
        li.appendChild(label);
        li.appendChild(body);
        list.appendChild(li);
        await wait(120);
        await stream(label, parts[0] + '：', 30, li);
        await stream(body, parts.slice(1).join('：'), 24, li);
      }
      foot.classList.remove('is-pending');
      await wait(4600);
    }

    async function run() {
      stage.classList.add('is-playing');
      for (let i = 0; ; i = (i + 1) % scenes.length) {
        await playScene(scenes[i], i);
      }
    }
    run();
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
