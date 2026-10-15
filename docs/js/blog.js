/* =========================================================
   blog.js — 博客：Markdown 解析 + 列表/详情渲染
   ---------------------------------------------------------
   纯静态站点没有构建步骤，所以：
     · content/posts/index.json 列出全部文章文件名（新增文章要同步更新）
     · 启动时并发拉取每篇文章，解析出元信息渲染列表
     · 点击文章 → 解析完整正文 → 渲染详情 + 生成 TOC

   安全要点：所有文本先做 HTML 转义，再套 Markdown 标记，
   顺序不能反，否则就是 XSS。
   ========================================================= */
(function () {
  'use strict';

  var LIST_URL = 'content/posts/index.json';
  var POST_DIR = 'content/posts/';
  var posts = [];          // 全部文章（含 parse 结果）
  var cache = {};          // slug -> 完整 html，避免重复解析

  /* =========================================================
     一、基础工具
     ========================================================= */

  /** HTML 转义：所有进入 DOM 的动态内容都必须先过这一层 */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* =========================================================
     二、Markdown 解析（只支持本站用到的语法）
     ========================================================= */

  /** 行内标记：`code`、**粗**、*斜*、[文字](链接) */
  function inline(text) {
    // 1) 先把行内代码抽出来占位，避免代码里的 * 和 _ 被当成标记
    var codes = [];
    var out = String(text).replace(/`([^`]+)`/g, function (m, code) {
      codes.push(code);
      return '\u0000CODE' + (codes.length - 1) + '\u0000';
    });

    // 2) 转义，防止 Markdown 里夹带 HTML
    out = escapeHtml(out);

    // 3) 加粗与斜体
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

    // 4) 链接：只放行 http(s) 与页内锚点，挡掉 javascript: 之类
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      if (!/^(https?:\/\/|#|\/)/i.test(url)) return label;
      var rel = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + escapeHtml(url) + '"' + rel + '>' + label + '</a>';
    });

    // 5) 还原行内代码
    out = out.replace(/\u0000CODE(\d+)\u0000/g, function (m, i) {
      return '<code>' + escapeHtml(codes[Number(i)]) + '</code>';
    });

    return out;
  }

  /** 由标题文本生成锚点 id（保留中英文数字，其余转连字符） */
  function slugify(text) {
    var s = String(text).toLowerCase().trim()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-');
    return s || 'section';
  }

  /**
   * 解析 Markdown 正文
   * @returns {{html:string, toc:Array<{id:string,text:string,level:number}>}}
   */
  function parseMarkdown(md) {
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var html = [];
    var toc = [];
    var usedIds = {};
    var i = 0;

    function uniqueId(base) {
      var id = base;
      var n = 2;
      while (usedIds[id]) { id = base + '-' + n; n++; }
      usedIds[id] = 1;
      return id;
    }

    while (i < lines.length) {
      var line = lines[i];

      /* --- 代码块 ``` --- */
      var fence = line.match(/^```\s*([\w-]*)\s*$/);
      if (fence) {
        var lang = fence[1];
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // 跳过结束的 ```
        html.push('<pre><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>'
          + escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }

      /* --- 标题 --- */
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        var level = h[1].length;
        var text = h[2].trim();
        // 一级标题是文章标题，正文里不再重复渲染
        if (level === 1) { i++; continue; }
        var id = uniqueId(slugify(text));
        toc.push({ id: id, text: text, level: level });
        html.push('<h' + level + ' id="' + id + '">' + inline(text) + '</h' + level + '>');
        i++;
        continue;
      }

      /* --- 分隔线 --- */
      if (/^(---|\*\*\*|___)\s*$/.test(line)) { html.push('<hr />'); i++; continue; }

      /* --- 表格：| a | b | 后面跟 | --- | --- | --- */
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        var cells = function (row) {
          return row.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        };
        var head = cells(line);
        i += 2; // 跳过表头与分隔行
        var body = [];
        while (i < lines.length && /^\|/.test(lines[i])) {
          body.push(cells(lines[i]));
          i++;
        }
        html.push(
          '<table><thead><tr>' + head.map(function (c) {
            return '<th>' + inline(c) + '</th>';
          }).join('') + '</tr></thead><tbody>' + body.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>'
        );
        continue;
      }

      /* --- 引用 --- */
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        html.push('<blockquote>' + inline(q.join(' ')) + '</blockquote>');
        continue;
      }

      /* --- 无序列表 --- */
      if (/^[-*+]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          ul.push('<li>' + inline(lines[i].replace(/^[-*+]\s+/, '')) + '</li>');
          i++;
        }
        html.push('<ul>' + ul.join('') + '</ul>');
        continue;
      }

      /* --- 有序列表 --- */
      if (/^\d+\.\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          ol.push('<li>' + inline(lines[i].replace(/^\d+\.\s+/, '')) + '</li>');
          i++;
        }
        html.push('<ol>' + ol.join('') + '</ol>');
        continue;
      }

      /* --- 空行 --- */
      if (!line.trim()) { i++; continue; }

      /* --- 段落：连续非空行合并 --- */
      var para = [];
      while (i < lines.length && lines[i].trim() &&
             !/^(#{1,4}\s|```|>|[-*+]\s|\d+\.\s|---|\*\*\*|___)/.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      if (para.length) html.push('<p>' + inline(para.join(' ')) + '</p>');
    }

    return { html: html.join('\n'), toc: toc };
  }

  /* =========================================================
     三、文章元信息解析
     ========================================================= */

  function parseMeta(slug, md) {
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var title = slug;
    var date = '';
    var tags = [];
    var summary = '';
    var bodyStart = 0;
    // 元信息行（标题 / date / tags）必须在正文里剔除，
    // 否则详情页会把 "date: ... tags: ..." 当正文显示出来。
    var metaEnd = 0;

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();

      if (/^#\s+/.test(l) && title === slug) {
        title = l.replace(/^#\s+/, '');
        metaEnd = i + 1;
        continue;
      }
      var d = l.match(/^date\s*[:：]\s*(.+)$/i);
      if (d) { date = d[1].trim(); metaEnd = i + 1; continue; }

      var t = l.match(/^tags?\s*[:：]\s*(.+)$/i);
      if (t) {
        tags = t[1].split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
        metaEnd = i + 1;
        continue;
      }

      // 第一段正文作为摘要（跳过空行与 ## 小节标题）
      if (!summary && l && !/^##/.test(l)) {
        summary = l.replace(/[*`>#-]/g, '').trim();
      }
    }

    bodyStart = metaEnd;
    var text = lines.slice(bodyStart).join('\n');
    var chars = text.replace(/\s/g, '').length;

    return {
      slug: slug,
      title: title,
      date: date,
      tags: tags,
      summary: summary.length > 110 ? summary.slice(0, 110) + '…' : summary,
      readingMinutes: Math.max(1, Math.round(chars / 400)),
      // body 已经剔除了标题行与 date/tags 元信息行，详情页直接渲染它。
      // 不要把未裁剪的原文放进来，否则元信息会重复出现在正文里。
      body: text
    };
  }

  /* =========================================================
     四、数据加载
     ========================================================= */

  function loadPosts() {
    return fetch(LIST_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('清单加载失败 HTTP ' + r.status);
        return r.json();
      })
      .then(function (files) {
        if (!Array.isArray(files)) throw new Error('清单格式应为数组');
        return Promise.all(files.map(function (file) {
          return fetch(POST_DIR + file, { cache: 'no-store' })
            .then(function (r) {
              if (!r.ok) throw new Error(file + ' HTTP ' + r.status);
              return r.text();
            })
            .then(function (md) {
              var slug = file.replace(/\.md$/i, '');
              return parseMeta(slug, md);
            })
            .catch(function (e) {
              console.warn('[博客] 跳过加载失败的文章：' + file, e.message);
              return null;
            });
        }));
      })
      .then(function (list) {
        // 过滤失败项，并按日期倒序
        posts = list.filter(Boolean).sort(function (a, b) {
          return String(b.date).localeCompare(String(a.date));
        });
        return posts;
      });
  }

  /* =========================================================
     五、渲染
     ========================================================= */

  var elGrid, elLoading, elListView, elDetail, elTitle, elDate, elReading,
      elTags, elToc, elTocList, elBody;

  function bindEls() {
    elGrid = document.getElementById('postsGrid');
    elLoading = document.getElementById('postsLoading');
    elListView = document.getElementById('blogListView');
    elDetail = document.getElementById('blogDetailView');
    elTitle = document.getElementById('postTitle');
    elDate = document.getElementById('postDate');
    elReading = document.getElementById('postReading');
    elTags = document.getElementById('postTags');
    elToc = document.getElementById('postToc');
    elTocList = document.getElementById('postTocList');
    elBody = document.getElementById('postBody');
  }

  /** 渲染文章列表卡片 */
  function renderList() {
    if (!elGrid) return;

    if (!posts.length) {
      elGrid.innerHTML = '<p class="loading">还没有文章。把 Markdown 文件放进 '
        + '<code>content/posts/</code> 并登记到 <code>index.json</code> 即可。</p>';
      return;
    }

    var html = posts.map(function (p, i) {
      return ''
        + '<button class="post" type="button" data-index="' + i + '">'
        + '  <div class="post__meta">'
        + '    <time>' + escapeHtml(p.date || '未标注日期') + '</time>'
        + '    <span aria-hidden="true">·</span>'
        + '    <span>' + p.readingMinutes + ' 分钟</span>'
        + '  </div>'
        + '  <h3 class="post__title">' + escapeHtml(p.title) + '</h3>'
        + '  <p class="post__summary">' + escapeHtml(p.summary) + '</p>'
        + (p.tags.length
            ? '<ul class="tags">' + p.tags.map(function (t) {
                return '<li>' + escapeHtml(t) + '</li>';
              }).join('') + '</ul>'
            : '')
        + '  <span class="post__more">阅读全文 →</span>'
        + '</button>';
    }).join('');

    elGrid.innerHTML = html;

    // 事件委托：只绑一次
    elGrid.querySelectorAll('.post').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openPost(Number(btn.getAttribute('data-index')));
      });
    });
  }

  /** 打开某篇文章 */
  function openPost(index) {
    var post = posts[index];
    if (!post) return;

    var parsed = cache[post.slug];
    if (!parsed) {
      parsed = parseMarkdown(post.body);
      cache[post.slug] = parsed;
    }

    elTitle.textContent = post.title;
    elDate.textContent = post.date || '未标注日期';
    elReading.textContent = post.readingMinutes + ' 分钟阅读';

    elTags.innerHTML = post.tags.map(function (t) {
      return '<li>' + escapeHtml(t) + '</li>';
    }).join('');
    elTags.hidden = !post.tags.length;

    if (parsed.toc.length) {
      elTocList.innerHTML = parsed.toc.map(function (t) {
        return '<li><a href="#' + t.id + '">' + escapeHtml(t.text) + '</a></li>';
      }).join('');
      elToc.hidden = false;
    } else {
      elToc.hidden = true;
    }

    elBody.innerHTML = parsed.html;

    elListView.hidden = true;
    elDetail.hidden = false;
    window.scrollTo({ top: elDetail.offsetTop - 90, behavior: 'smooth' });
  }

  /** 回到列表 */
  function closePost() {
    elDetail.hidden = true;
    elListView.hidden = false;
    var blog = document.getElementById('blog');
    if (blog) window.scrollTo({ top: blog.offsetTop - 80, behavior: 'smooth' });
  }

  /* =========================================================
     六、初始化
     ========================================================= */

  function init() {
    bindEls();
    if (!elGrid) return;

    var back = document.getElementById('postBack');
    if (back) back.addEventListener('click', closePost);

    // 详情页里点 TOC 锚点：平滑滚动由 CSS 负责，这里只处理偏移
    if (elTocList) {
      elTocList.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a');
        if (!a) return;
        e.preventDefault();
        var target = document.querySelector(a.getAttribute('href'));
        if (target) window.scrollTo({ top: target.offsetTop - 90, behavior: 'smooth' });
      });
    }

    loadPosts()
      .then(function () {
        if (elLoading) elLoading.remove();
        renderList();
        document.dispatchEvent(new CustomEvent('blog:ready', { detail: { count: posts.length } }));
      })
      .catch(function (e) {
        console.error('[博客] 加载失败', e);
        if (elGrid) {
          elGrid.innerHTML = '<p class="loading">文章加载失败：' + escapeHtml(e.message)
            + '<br />（如果是直接双击打开 index.html，浏览器可能限制本地 fetch，'
            + '请改用本地静态服务器预览）</p>';
        }
        document.dispatchEvent(new CustomEvent('blog:error', { detail: { message: e.message } }));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // 暴露给调试与测试
  window.Blog = {
    parseMarkdown: parseMarkdown,
    parseMeta: parseMeta,
    escapeHtml: escapeHtml,
    slugify: slugify,
    posts: function () { return posts; },
    open: openPost,
    close: closePost
  };
})();
