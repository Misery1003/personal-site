# 个人展示网站 · 技术设计文档（Tech Design）

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 个人展示网站 Tech Design |
| 版本 | v1.0 |
| 对应 PRD | `PRD.md` v1.0 |
| 最后更新 | 2026-10-15 |

---

## 一、技术栈决策

### 1.1 PRD 建议的栈

| 层 | 建议选型 |
| --- | --- |
| 框架 | React + TypeScript + Vite |
| 样式 | Tailwind CSS |
| 内容 | Markdown |
| 部署 | 静态托管平台 |

### 1.2 实际环境约束

开发环境实测结果：

| 检查项 | 结果 |
| --- | --- |
| 是否安装 npm | **否**（运行时只有独立的 `node.exe`，无 `npm` / `pnpm`） |
| npm / pnpm 缓存 | **不存在**（`~/.npm`、`npm-cache`、`pnpm-store` 均无） |
| 能否访问 npm registry | **否**（离线环境，连镜像站也不通） |

结论：**无法安装任何 npm 依赖**，因此 React / TypeScript / Vite / Tailwind 都不可用。
如果强行按建议栈写代码，`npm install` 会失败，项目根本跑不起来——功能再完整也没有意义。

### 1.3 最终选型：零依赖原生实现

| 层 | 实际选型 | 理由 |
| --- | --- | --- |
| 结构 | 语义化 HTML5 | 无构建步骤，天然利于 SEO 与无障碍 |
| 样式 | 原生 CSS + 设计令牌（对齐 Tailwind 令牌体系） | 能力等价，改主题只需改 `:root` 一处 |
| 逻辑 | 原生 JavaScript（ES5+，无模块打包） | 双击即可打开，克隆即可运行 |
| 内容 | Markdown 文本 + 前端解析 | 新增文章 = 新增一个文件，无数据库 |
| 部署 | 静态托管（GitHub Pages） | 零服务器成本，自带 HTTPS 与全球 CDN |

### 1.4 与建议栈的能力对照

按 Tailwind 的令牌命名建立设计令牌，做到「换栈不换设计」：

| Tailwind 令牌 | 本项目 CSS 变量 | 值 |
| --- | --- | --- |
| `bg-base` | `--bg` | `#0B0F1A` |
| `text-primary` | `--text` | `#E6EAF2` |
| `text-secondary` | `--text-2` | `#A7B0C4` |
| `text-muted` | `--text-3` | `#6F7A91` |
| `brand` | `--accent` | `#5B8CFF` |
| `surface` | `--surface` | `#131A2A` |
| `border` | `--line` | `#1E2740` |
| `rounded-xl` | `--radius-lg` | `16px` |
| `shadow-lg` | `--shadow-lg` | `0 24px 60px rgba(0,0,0,.45)` |

后续若迁移到 Tailwind，只需把 `tailwind.config.js` 的 `theme.extend` 指向同一组值，
视觉不会发生任何变化。

---

## 二、项目结构

```
personal-site/
├── PRD.md                 产品需求文档
├── TECH_DESIGN.md         技术设计文档（本文件）
├── AGENTS.md              AI 代理开发规范
├── README.md              项目说明
├── docs/                  网站源码（GitHub Pages 发布目录）
│   ├── index.html         单页应用入口
│   ├── css/
│   │   └── style.css      设计令牌 + 全站样式
│   ├── js/
│   │   ├── stars.js       星空 Canvas 粒子背景
│   │   ├── blog.js        Markdown 解析与博客渲染
│   │   └── main.js        导航高亮、汉堡菜单、表单校验、邮箱复制
│   └── content/
│       └── posts/         博客文章（Markdown 文件）
│           ├── 001-*.md
│           ├── 002-*.md
│           └── 003-*.md
└── screenshots/           交付截图
```

**为什么源码放在 `docs/`**：GitHub Pages 可以直接把仓库的 `/docs` 目录作为发布源，
不需要额外分支或构建产物，也不需要在仓库里塞一个 `dist/`。

---

## 三、数据模型

本站无后端，所有数据以「静态资源」形式存在。抽象成三个模型：

### 3.1 个人信息 Profile

以 HTML 语义结构承载（`.hero`、`.about`、`.skills` 区块），可映射为对象：

```ts
interface Profile {
  name: string;          // 姓名
  role: string;          // 职位 / 身份
  tagline: string;       // 一句话介绍
  avatar: string;        // 头像（内联 SVG，避免外部图片依赖）
  location: string;
  email: string;
  socials: { label: string; url: string }[];
  timeline: { period: string; title: string; org: string; desc: string }[];
  skills: { category: string; items: { name: string; level: number }[] }[];
}
```

### 3.2 项目 Project

```ts
interface Project {
  id: string;
  title: string;
  summary: string;       // 卡片描述
  tags: string[];        // 技术标签
  demoUrl?: string;      // 线上演示
  repoUrl?: string;      // 源码仓库
  cover: string;         // 封面（CSS 渐变或内联 SVG，不用外链图片）
  featured: boolean;
}
```

### 3.3 博客文章 Post

```ts
interface Post {
  slug: string;          // 文件名去掉序号与扩展名
  title: string;         // 来自一级标题
  date: string;          // 来自元信息行
  tags: string[];
  summary: string;       // 首个段落
  body: string;          // Markdown 正文
  readingMinutes: number;// 按字数估算
}
```

**博客文件约定**（`content/posts/*.md`）：

```markdown
# 文章标题

date: 2026-10-15
tags: JavaScript, 性能

正文第一段会作为列表摘要。

## 小节标题

正文内容，支持 `行内代码`、**加粗**、列表、引用与代码块。
```

列表页只读取每篇文章的元信息与摘要；详情页才解析完整正文。

---

## 四、关键技术点

### 4.1 星空 Canvas 粒子

- **实现**：`<canvas>` 全屏铺底，`requestAnimationFrame` 循环绘制。
- **视差**：粒子按滚动偏移乘以不同系数，产生纵深层次感。
- **性能**：
  - 根据屏幕宽度决定粒子数（桌面 140，移动端 60）；
  - 只重绘变化区域不可行（粒子全屏分布），改为限制帧率上限 60fps 并对
    `devicePixelRatio` 做上限 2 的截断，避免高分屏过度绘制。
- **降级**：监听 `prefers-reduced-motion: reduce`，命中则只画一帧静态星空，
  不启动动画循环。页面切到后台时（`visibilitychange`）暂停循环，省电。

### 4.2 Markdown 解析

自己实现一个**最小可用**的 Markdown 渲染器，只支持本站用到的语法：

| 语法 | 处理方式 |
| --- | --- |
| `#` ~ `###` 标题 | 生成 `h1`–`h3`，同时收集为 TOC 数据 |
| 代码块 ``` | 生成 `<pre><code>`，按语言加类名 |
| 行内 `code` | `<code>` |
| `**加粗**` / `*斜体*` | `<strong>` / `<em>` |
| 列表 `-` / `1.` | `<ul>` / `<ol>` |
| 引用 `>` | `<blockquote>` |
| 链接 `[]()` | `<a>`，强制 `rel="noopener"` |
| 段落 | `<p>` |

**安全**：先对所有文本做 HTML 转义，再做标记替换，杜绝 Markdown 注入 XSS。

### 4.3 博客列表的自动更新

纯静态站点没有构建步骤，因此用一份**清单文件** `content/posts/index.json`
列出全部文章文件名；`blog.js` 启动时读取清单并并发 `fetch` 每篇文章，
解析出标题/日期/标签/摘要后渲染列表。新增文章 = 写 MD + 往清单加一行。

### 4.4 锚点滚动与导航高亮

- 平滑滚动用 CSS `scroll-behavior: smooth` + `scroll-padding-top` 让锚点不被吸顶导航遮挡。
- 导航高亮用单次 `IntersectionObserver` 观察各区块，比 `scroll` 事件里逐个
  读 `offsetTop` 更省性能。

### 4.5 表单校验与反馈

静态站点无法真正提交，因此：

- 前端校验邮箱格式与必填项，错误时在字段下方就地提示；
- 通过校验后按钮进入 loading，1 秒后给出「已复制到剪贴板（静态演示站点）」
  的成功反馈，同时把内容复制到剪贴板，便于访客真正发邮件；
- 明确标注这是静态演示，不误导用户以为真的发送了。

### 4.6 响应式与无障碍

- 断点：`< 640px` 单列 / `640–1024px` 两列 / `> 1024px` 三列，内容宽 `min(1200px, 100% - 44px)`。
- 移动端导航折叠为汉堡菜单，`aria-expanded` 同步状态。
- 所有交互元素用原生 `<button>` / `<a>`，可键盘 Tab 到，`:focus-visible` 有可见轮廓。
- 颜色对比度按 WCAG AA 校验（正文对背景 ≥ 4.5:1）。
- 内联 SVG 图标统一加 `aria-hidden="true"`。

---

## 五、部署方案

依据《7.部署》文档，三种部署方式：

| 方式 | 平台 | 适用 | 本项目 |
| --- | --- | --- | --- |
| 网站托管平台 | Vercel / Cloudflare Pages / Netlify / GitHub Pages | 静态站最佳 | **采用 GitHub Pages** |
| 容器托管平台 | 微信云托管 / Railway / 腾讯云 / 阿里云 | 含后端服务 | 不需要（无后端） |
| 云服务器 | 自购 VPS | 需完全掌控环境 | 不需要 |

**为什么选 GitHub Pages**：

1. 项目本来就要用 Git 管理、推送到 GitHub，零额外成本；
2. 只需在仓库 Settings → Pages 里把发布源设为 `main` 分支的 `/docs` 目录，无需构建；
3. Vercel / Cloudflare 需要单独注册账号并授权，多一层依赖；
4. 自带 HTTPS 与 CDN，域名形如 `https://<用户名>.github.io/<仓库名>/`。

**部署流程**：

```bash
git init
git add .
git commit -m "feat: 个人展示网站"
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
# 然后在 GitHub 仓库 Settings → Pages：
#   Source = Deploy from a branch
#   Branch = main        Folder = /docs
```

---

## 六、性能与安全清单

**性能**

- 无外部 CDN、无第三方字体、无跟踪脚本；
- 图标全部内联 SVG，封面用 CSS 渐变，避免图片请求；
- 首屏关键 CSS 内联在 `<head>`，其余样式同源加载。

**安全**

- 无后端接口，不存在越权与注入面；
- Markdown 渲染前统一转义，防 XSS；
- 表单不发送数据，不收集访客信息；
- 外链统一 `rel="noopener noreferrer"`。
