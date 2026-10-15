/* =========================================================
   stars.js — 星空 Canvas 粒子背景
   ---------------------------------------------------------
   特性：
     · 缓慢闪烁 + 轻微漂移
     · 随页面滚动产生视差（不同层不同速度）
     · 移动端自动降低粒子数量，保证帧率
     · 尊重 prefers-reduced-motion：只画一帧静态星空
     · 页面切到后台时暂停循环，省电
   ========================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('stars');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var dpr = 1;
  var W = 0;
  var H = 0;
  var particles = [];
  var rafId = null;
  var running = false;
  var lastTime = 0;
  var scrollY = 0;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 尺寸与粒子 ---------- */

  function resize() {
    // devicePixelRatio 截断到 2：高分屏上再高的倍率对"星星"没有视觉收益，
    // 但绘制量会成倍增加，容易掉帧。
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
    draw(0);
  }

  function buildParticles() {
    // 小屏少画一些，帧率优先
    var count = W < 640 ? 60 : (W < 1024 ? 100 : 140);
    particles = [];
    for (var i = 0; i < count; i++) {
      var depth = Math.random();               // 0 = 远，1 = 近
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + depth * 1.5,                  // 近的星更大
        depth: depth,
        baseAlpha: 0.25 + depth * 0.6,
        twinkle: 0.4 + Math.random() * 1.6,    // 闪烁速度
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.06,  // 缓慢横向漂移
        driftY: (Math.random() - 0.5) * 0.06
      });
    }
  }

  /* ---------- 绘制 ---------- */

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // 视差：越"近"的星随滚动位移越大
      var py = p.y - scrollY * (0.04 + p.depth * 0.12);
      // 循环：出屏后从另一侧回来，避免滚动久了星星耗尽
      py = ((py % H) + H) % H;

      var alpha = p.baseAlpha;
      if (!reduced) {
        alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * p.twinkle + p.phase));
      }

      ctx.beginPath();
      ctx.arc(p.x, py, p.r, 0, Math.PI * 2);
      // 近处的星带一点蓝紫色，远处偏白
      ctx.fillStyle = p.depth > 0.66
        ? 'rgba(155, 180, 255, ' + alpha.toFixed(3) + ')'
        : 'rgba(230, 234, 242, ' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
  }

  function step(now) {
    if (!running) return;
    // 限帧到 ~60fps，避免高刷屏上无意义地空转
    if (now - lastTime >= 16) {
      var dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.driftX * dt * 60;
        p.y += p.driftY * dt * 60;
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
      }
      draw(now / 1000);
    }
    rafId = window.requestAnimationFrame(step);
  }

  function start() {
    if (reduced || running) return;
    running = true;
    lastTime = 0;
    rafId = window.requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ---------- 事件 ---------- */

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    // 防抖：拖动窗口时不要反复重建粒子
    resizeTimer = setTimeout(resize, 150);
  });

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY || window.pageYOffset || 0;
    // 静态模式下（reduced motion）也要响应滚动，否则视差就死了
    if (reduced) draw(0);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  resize();
  start();

  // 暴露少量接口，便于调试
  window.Stars = {
    refresh: resize,
    stop: stop,
    start: start,
    count: function () { return particles.length; },
    isReduced: function () { return reduced; }
  };
})();
