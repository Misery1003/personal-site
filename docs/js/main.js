/* =========================================================
   main.js — 全站交互
   ---------------------------------------------------------
   职责：
     1. 渲染技能与项目数据（集中维护，改内容不用动 HTML 结构）
     2. 导航栏吸顶态、滚动高亮、滚动进度条
     3. 移动端汉堡菜单
     4. IntersectionObserver 淡入动画 + 技能条增长
     5. 邮箱复制、表单校验与反馈
     6. 返回顶部、页脚年份
   ========================================================= */
(function () {
  'use strict';

  /* =========================================================
     一、站点数据（改内容只改这里）
     ========================================================= */

  var SKILLS = [
    {
      category: '前端基础',
      icon: 'code',
      items: [
        { name: 'HTML / 语义化', level: 92 },
        { name: 'CSS / 响应式布局', level: 90 },
        { name: 'JavaScript（ES5+）', level: 85 },
        { name: '无障碍与性能优化', level: 72 }
      ]
    },
    {
      category: '浏览器扩展',
      icon: 'puzzle',
      items: [
        { name: 'Manifest V3', level: 88 },
        { name: 'Content Script / Service Worker', level: 85 },
        { name: 'chrome.downloads / storage API', level: 82 },
        { name: 'Canvas 图片处理', level: 75 }
      ]
    },
    {
      category: '工程与协作',
      icon: 'git',
      items: [
        { name: 'Git / GitHub 工作流', level: 85 },
        { name: '调试与问题排查', level: 80 },
        { name: '技术写作', level: 78 }
      ]
    }
  ];

  var PROJECTS = [
    {
      title: '图提取 · 电商图片下载插件',
      summary: '一键提取淘宝、天猫、京东、拼多多商家版商品详情页的全部图片，新页面集中勾选并批量下载为 PNG。',
      tags: ['Chrome MV3', 'JavaScript', 'Canvas'],
      badge: '浏览器扩展',
      demoUrl: 'https://misery1003.github.io/ecom-image-grabber/',
      repoUrl: 'https://github.com/Misery1003/ecom-image-grabber',
      cover: { from: '#2563EB', to: '#7C3AED', glyph: 'image' }
    },
    {
      title: '个人展示网站',
      summary: '就是我正在浏览的这个站点：深色主题、星空 Canvas 粒子背景、纯静态零依赖，直接由 GitHub Pages 托管。',
      tags: ['原生 JS', 'Canvas', 'GitHub Pages'],
      badge: '本站',
      demoUrl: '#home',
      repoUrl: '',
      cover: { from: '#0EA5E9', to: '#5B8CFF', glyph: 'star' }
    },
    {
      title: '网页总结工具',
      summary: '输入网址自动抓取正文、剔除导航与广告，生成中文摘要与关键要点。抽取式摘要算法，完全在浏览器本地运行。',
      tags: ['原生 JS', '摘要算法', 'CORS'],
      badge: 'Web 应用',
      demoUrl: '',
      repoUrl: '',
      cover: { from: '#059669', to: '#34D399', glyph: 'doc' }
    },
    {
      title: 'AI 开发流程实践',
      summary: '把 PRD → 技术设计 → AGENTS 规则的流程固化成可复用模板，让 AI 稳定产出符合项目规范的代码。',
      tags: ['PRD', 'AGENTS.md', '工作流'],
      badge: '方法论',
      demoUrl: '',
      repoUrl: '',
      cover: { from: '#DB2777', to: '#8B5CF6', glyph: 'flow' }
    }
  ];

  /* =========================================================
     二、工具
     ========================================================= */

  var $ = function (id) { return document.getElementById(id); };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    void t.offsetWidth;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-show');
      setTimeout(function () { t.hidden = true; }, 300);
    }, ms || 2400);
  }

  /* =========================================================
     三、图标与封面（内联 SVG，不依赖外部图片）
     ========================================================= */

  var ICONS = {
    code: '<path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/>',
    puzzle: '<path d="M9 3h6v3a2 2 0 1 0 4 0V6h2v6h-3a2 2 0 1 1 0 4h3v6H9v-3a2 2 0 1 0-4 0v3H3v-6h3a2 2 0 1 0 0-4H3V6h6Z"/>',
    git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7"/><path d="M8.5 6h5A4.5 4.5 0 0 1 18 10.5"/>'
  };

  /** 项目封面：用渐变 + 图形绘制，避免任何外部图片依赖 */
  function coverSvg(cover, seed) {
    var gid = 'pg' + seed;
    var glyph = '';
    if (cover.glyph === 'image') {
      glyph = '<rect x="46" y="34" width="108" height="72" rx="10" fill="#fff" opacity=".18"/>'
        + '<circle cx="76" cy="60" r="9" fill="#fff" opacity=".5"/>'
        + '<path d="m54 100 26-26 20 20 16-14 24 20" stroke="#fff" stroke-width="4" fill="none" opacity=".55" stroke-linejoin="round"/>';
    } else if (cover.glyph === 'star') {
      glyph = '<path d="M100 30l11 30 32 3-24 21 7 31-26-16-26 16 7-31-24-21 32-3z" fill="#fff" opacity=".28"/>';
    } else if (cover.glyph === 'doc') {
      glyph = '<rect x="62" y="28" width="76" height="88" rx="8" fill="#fff" opacity=".18"/>'
        + '<path d="M76 50h48M76 66h48M76 82h30" stroke="#fff" stroke-width="4" opacity=".55" stroke-linecap="round"/>';
    } else {
      glyph = '<circle cx="64" cy="46" r="12" fill="#fff" opacity=".3"/>'
        + '<circle cx="136" cy="46" r="12" fill="#fff" opacity=".3"/>'
        + '<circle cx="100" cy="100" r="12" fill="#fff" opacity=".3"/>'
        + '<path d="M74 54l18 34M126 54l-18 34M76 46h48" stroke="#fff" stroke-width="3" opacity=".4" fill="none"/>';
    }
    return '<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">'
      + '<stop stop-color="' + cover.from + '"/><stop offset="1" stop-color="' + cover.to + '"/>'
      + '</linearGradient></defs>'
      + '<rect width="200" height="140" fill="url(#' + gid + ')"/>'
      + glyph + '</svg>';
  }

  /* =========================================================
     四、渲染技能与项目
     ========================================================= */

  function renderSkills() {
    var box = $('skillsGrid');
    if (!box) return;

    box.innerHTML = SKILLS.map(function (group) {
      var items = group.items.map(function (it) {
        return ''
          + '<li class="skill">'
          + '  <div class="skill__top">'
          + '    <span class="skill__name">' + escapeHtml(it.name) + '</span>'
          + '    <span class="skill__level">' + it.level + '%</span>'
          + '  </div>'
          + '  <div class="skill__bar" role="progressbar" aria-label="' + escapeHtml(it.name)
          + ' 熟练度" aria-valuenow="' + it.level + '" aria-valuemin="0" aria-valuemax="100">'
          + '    <div class="skill__fill" data-level="' + it.level + '"></div>'
          + '  </div>'
          + '</li>';
      }).join('');

      return ''
        + '<article class="skill-card reveal">'
        + '  <header class="skill-card__head">'
        + '    <span class="skill-card__icon" aria-hidden="true">'
        + '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
        + 'stroke-linecap="round" stroke-linejoin="round">' + (ICONS[group.icon] || ICONS.code) + '</svg>'
        + '    </span>'
        + '    <h3 class="skill-card__title">' + escapeHtml(group.category) + '</h3>'
        + '  </header>'
        + '  <ul class="skill-list">' + items + '</ul>'
        + '</article>';
    }).join('');
  }

  function renderProjects() {
    var box = $('projectsGrid');
    if (!box) return;

    box.innerHTML = PROJECTS.map(function (p, i) {
      var links = '';
      if (p.demoUrl) {
        links += '<a class="btn btn--primary btn--sm" href="' + escapeHtml(p.demoUrl) + '"'
          + (/^https?:/.test(p.demoUrl) ? ' target="_blank" rel="noopener noreferrer"' : '')
          + '>'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
          + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          + '<path d="M14 3h7v7"/><path d="M21 3 11 13"/>'
          + '<path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>'
          + '在线演示</a>';
      }
      if (p.repoUrl) {
        links += '<a class="btn btn--ghost btn--sm" href="' + escapeHtml(p.repoUrl) + '"'
          + ' target="_blank" rel="noopener noreferrer">'
          + '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
          + '<path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>'
          + '源码</a>';
      }
      if (!links) links = '<span class="loading" style="padding:0">开发中</span>';

      return ''
        + '<article class="project reveal">'
        + '  <div class="project__cover">' + coverSvg(p.cover, i)
        + (p.badge ? '<span class="project__badge">' + escapeHtml(p.badge) + '</span>' : '')
        + '  </div>'
        + '  <div class="project__body">'
        + '    <h3 class="project__title">' + escapeHtml(p.title) + '</h3>'
        + '    <p class="project__summary">' + escapeHtml(p.summary) + '</p>'
        + '    <ul class="tags">' + p.tags.map(function (t) {
              return '<li>' + escapeHtml(t) + '</li>';
            }).join('') + '</ul>'
        + '    <div class="project__links">' + links + '</div>'
        + '  </div>'
        + '</article>';
    }).join('');
  }

  /* =========================================================
     五、导航
     ========================================================= */

  var nav, navLinks, navToggle;

  function initNav() {
    nav = $('nav');
    navLinks = $('navLinks');
    navToggle = $('navToggle');

    var links = Array.prototype.slice.call(
      document.querySelectorAll('.nav__link[href^="#"]')
    );

    // 吸顶态
    function onScroll() {
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
    }

    // 滚动高亮：用 IntersectionObserver 观察各区块
    var sections = links.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    }).filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0;
        });
        // 取当前可见比例最高的区块作为"当前"
        var best = null;
        var bestRatio = 0;
        Object.keys(visible).forEach(function (id) {
          if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; }
        });
        if (!best) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + best);
        });
      }, { threshold: [0.15, 0.35, 0.6], rootMargin: '-72px 0px -40% 0px' });

      sections.forEach(function (s) { io.observe(s); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 汉堡菜单
    function closeMenu() {
      if (!navLinks || !navToggle) return;
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', '展开菜单');
    }

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        var open = navLinks.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navToggle.setAttribute('aria-label', open ? '收起菜单' : '展开菜单');
      });

      links.forEach(function (a) { a.addEventListener('click', closeMenu); });

      document.addEventListener('click', function (e) {
        if (!navLinks.classList.contains('is-open')) return;
        if (navLinks.contains(e.target) || navToggle.contains(e.target)) return;
        closeMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 640) closeMenu();
      });
    }
  }

  /* =========================================================
     六、滚动进度条 / 返回顶部
     ========================================================= */

  function initScrollUi() {
    var bar = $('scrollProgress');
    var toTop = $('toTop');

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (bar) bar.style.width = pct.toFixed(2) + '%';
      if (toTop) toTop.classList.toggle('is-show', window.scrollY > 600);
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* =========================================================
     七、淡入动画与技能条
     ========================================================= */

  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function fillBars(scope) {
      scope.querySelectorAll('.skill__fill').forEach(function (el) {
        var lv = el.getAttribute('data-level') || '0';
        el.style.width = lv + '%';
      });
    }

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      fillBars(document);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        // 技能条只在第一次进入时增长
        if (en.target.classList.contains('skill-card')) fillBars(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  /* =========================================================
     八、邮箱复制
     ========================================================= */

  function initCopyEmail() {
    var btn = $('copyEmail');
    var text = $('emailText');
    if (!btn || !text) return;

    btn.addEventListener('click', function () {
      var email = text.textContent.trim();

      function done() { toast('邮箱已复制：' + email); }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, function () { fallback(email, done); });
      } else {
        fallback(email, done);
      }
    });

    function fallback(value, done) {
      // 旧浏览器的兜底：临时 textarea + execCommand
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('复制失败，请手动选择文本'); }
      document.body.removeChild(ta);
    }
  }

  /* =========================================================
     九、表单校验
     ========================================================= */

  function initForm() {
    var form = $('contactForm');
    if (!form) return;

    var fields = [
      { input: $('fName'), err: $('errName'), label: '称呼',
        test: function (v) { return v.length >= 1 || '请填写你的称呼'; } },
      { input: $('fEmail'), err: $('errEmail'), label: '邮箱',
        test: function (v) {
          if (!v) return '请填写邮箱，方便我回复你';
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || '邮箱格式看起来不太对，检查一下？';
        } },
      { input: $('fMsg'), err: $('errMsg'), label: '内容',
        test: function (v) { return v.length >= 5 || '再多写几个字吧（至少 5 个字符）'; } }
    ];

    var feedback = $('formFeedback');
    var submit = $('formSubmit');

    function showError(f, msg) {
      var wrap = f.input.closest('.field');
      if (msg) {
        wrap.classList.add('has-error');
        f.err.textContent = msg;
        f.err.hidden = false;
        f.input.setAttribute('aria-invalid', 'true');
      } else {
        wrap.classList.remove('has-error');
        f.err.hidden = true;
        f.input.removeAttribute('aria-invalid');
      }
    }

    // 失焦即校验，输入时清掉错误，避免"边打字边报错"的烦躁感
    fields.forEach(function (f) {
      f.input.addEventListener('blur', function () {
        var r = f.test(f.input.value.trim());
        showError(f, r === true ? '' : r);
      });
      f.input.addEventListener('input', function () {
        if (f.input.closest('.field').classList.contains('has-error')) showError(f, '');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstBad = null;
      fields.forEach(function (f) {
        var r = f.test(f.input.value.trim());
        var msg = r === true ? '' : r;
        showError(f, msg);
        if (msg && !firstBad) firstBad = f;
      });

      if (firstBad) {
        firstBad.input.focus();
        if (feedback) {
          feedback.hidden = false;
          feedback.className = 'form__feedback is-err';
          feedback.textContent = '还有 ' + fields.filter(function (f) {
            return f.input.closest('.field').classList.contains('has-error');
          }).length + ' 项需要修改。';
        }
        return;
      }

      // 静态站点没有后端，这里只做演示反馈 + 复制内容到剪贴板
      submit.classList.add('is-loading');
      if (feedback) feedback.hidden = true;

      setTimeout(function () {
        submit.classList.remove('is-loading');

        var payload = '称呼：' + $('fName').value.trim()
          + '\n邮箱：' + $('fEmail').value.trim()
          + '\n内容：' + $('fMsg').value.trim();

        var finish = function (copied) {
          if (feedback) {
            feedback.hidden = false;
            feedback.className = 'form__feedback is-ok';
            feedback.textContent = copied
              ? '内容已复制到剪贴板 —— 这是纯静态站点，没有后端，请把它粘贴到邮件里发给我。'
              : '校验通过！本站是纯静态站点，没有后端，请把内容直接发邮件给我。';
          }
          toast(copied ? '消息内容已复制，去邮箱粘贴发送吧' : '校验通过（静态站点，请直接发邮件）');
          form.reset();
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload).then(function () { finish(true); },
            function () { finish(false); });
        } else {
          finish(false);
        }
      }, 900);
    });
  }

  /* =========================================================
     十、初始化
     ========================================================= */

  function init() {
    renderSkills();
    renderProjects();

    initNav();
    initScrollUi();
    initReveal();
    initCopyEmail();
    initForm();

    var year = $('year');
    if (year) year.textContent = String(new Date().getFullYear());

    // 博客加载完把 Hero 里的"篇博客"数字改成真实值
    document.addEventListener('blog:ready', function (e) {
      var el = $('factPosts');
      if (el && e.detail && typeof e.detail.count === 'number') {
        el.textContent = String(e.detail.count);
      }
    });

    // 项目数量
    var fp = $('factProjects');
    if (fp) fp.textContent = String(PROJECTS.length);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // 暴露给调试
  window.Site = {
    SKILLS: SKILLS,
    PROJECTS: PROJECTS,
    toast: toast,
    version: '1.0.0'
  };
})();
