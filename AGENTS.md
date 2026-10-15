# AGENTS.md · AI 代理开发规范

> 本文件写给所有在 `personal-site` 里干活的 AI 代理（Cursor / Codex / Claude Code / Copilot 等）。
> 动代码之前先读完本文，它定义了本项目的开发规范、测试要求、代码风格与注意事项。

---

## 一、项目概述

### 1.1 这是什么

一个**个人展示网站**，纯静态，用于对外展示个人介绍、技能、项目与博客。
线上地址：`https://<用户名>.github.io/<仓库名>/`

### 1.2 技术栈（重要）

| 层 | 选型 |
| --- | --- |
| 结构 | 语义化 HTML5 |
| 样式 | 原生 CSS + `:root` 设计令牌（对齐 Tailwind 令牌命名） |
| 逻辑 | 原生 JavaScript（ES5+ 语法，IIFE 包裹，无模块打包） |
| 内容 | Markdown 文本，前端解析 |
| 部署 | GitHub Pages，发布目录 `docs/` |

### 1.3 硬性约束

1. **禁止引入任何 npm 依赖**，禁止 React / Vue / TypeScript / Tailwind / Vite / Webpack。
   —— 开发环境没有 npm，也没有网络，装了也跑不起来。
2. **禁止使用外部 CDN、外部字体、外部图片**。所有图标与封面必须用内联 SVG 或 CSS 绘制。
3. **禁止新增构建步骤**。克隆下来双击 `docs/index.html` 必须能直接跑。
4. **不改动 `docs/` 这个发布目录的位置**。GitHub Pages 指向的就是它。

---

## 二、开发规范

### 2.1 目录职责

| 路径 | 职责 | 说明 |
| --- | --- | --- |
| `docs/index.html` | 页面结构 | 只放结构，不写内联样式与内联脚本 |
| `docs/css/style.css` | 全站样式 | 所有颜色/间距/圆角必须先定义为 CSS 变量 |
| `docs/js/stars.js` | 星空背景 | 只负责 Canvas 绘制，不碰 DOM 其他部分 |
| `docs/js/blog.js` | 博客 | Markdown 解析 + 列表/详情渲染 |
| `docs/js/main.js` | 交互 | 导航、汉堡菜单、表单校验、邮箱复制 |
| `docs/content/posts/` | 博客文章 | 一个 MD 文件一篇文章 |
| `docs/content/posts/index.json` | 文章清单 | **新增文章必须同步更新这里** |

### 2.2 脚本加载顺序

`stars.js` → `blog.js` → `main.js`，全部用 `<script src>` 顺序加载，不使用 `type="module"`。
各文件通过 `window.XXX` 暴露接口，互不依赖内部实现。

---

## 三、代码风格

### 3.1 JavaScript

- 全部用 **IIFE** 包裹并加 `'use strict'`，避免污染全局；
- 使用 `var` / `function` 为主，不用可选链、不用 `??`，保证老环境也能跑；
- 变量与函数用 `camelCase`，常量用 `UPPER_SNAKE_CASE`；
- **注释写「为什么」，不写「做了什么」**。例如：

```js
// 好：把 devicePixelRatio 截断到 2，避免高分屏粒子过度绘制导致掉帧
var dpr = Math.min(window.devicePixelRatio || 1, 2);

// 差：设置 dpr
var dpr = Math.min(window.devicePixelRatio || 1, 2);
```

### 3.2 CSS

- 颜色、圆角、间距、动效时长**禁止写死**，一律用 `:root` 里的变量；
- 类名用 BEM 风格：`.block__element--modifier`；
- 选择器嵌套不超过 3 层，避免优先级战争；
- 新增样式必须同时考虑 `prefers-reduced-motion: reduce`。

### 3.3 HTML

- 用语义标签：`header` / `nav` / `main` / `section` / `article` / `footer`；
- 交互元素用原生 `<button>` 或 `<a>`，不要给 `<div>` 绑点击；
- 纯图标按钮必须有 `aria-label`；装饰性 SVG 加 `aria-hidden="true"`；
- 所有 `<img>` 必须有 `alt`（装饰图用 `alt=""`）；
- 外链必须加 `rel="noopener noreferrer"`。

---

## 四、测试要求

没有构建步骤，因此测试靠**自查清单 + 浏览器实测**：

### 4.1 每次改动后必须自测

1. 打开 `docs/index.html`，**控制台无报错、无 404**；
2. 缩到 **375px** 宽度，确认**无横向滚动条**（`document.body.scrollWidth <= innerWidth`）；
3. 汉堡菜单能展开/收起，点击菜单项后自动收起；
4. 导航高亮跟随滚动位置变化；
5. 博客列表能加载出全部文章（检查 `index.json` 里的数量与实际渲染数量一致）；
6. 点开一篇文章，Markdown 渲染正确、TOC 锚点能跳转；
7. 表单：填错邮箱有错误提示，填对有点击反馈；
8. 邮箱复制按钮能写入剪贴板并给出提示。

### 4.2 无障碍检查

- 只用键盘 Tab 走一遍全站，焦点始终可见；
- 打开系统「减少动态效果」后，星空停止动画、滚动动效关闭。

### 4.3 性能检查

- 移动端尺寸下星空动画帧率 ≥ 50fps；
- 首屏无外部网络请求（除同源静态资源）。

---

## 五、注意事项

### 5.1 安全

- **所有插入 DOM 的动态内容（尤其是 Markdown 解析结果）必须先做 HTML 转义**，
  再做标记替换。顺序反了就是 XSS；
- 不要引入任何远程脚本；
- 不要在代码里硬编码任何密钥、令牌、真实邮箱以外的隐私信息。

### 5.2 内容维护

- 新增博客文章：
  1. 在 `docs/content/posts/` 下新建 `NNN-slug.md`（三位序号保证排序稳定）；
  2. 文件顶部按约定写 `date:` 与 `tags:` 行；
  3. **把文件名加进 `index.json`**，否则列表里不会出现。
- 修改个人信息：直接改 `docs/index.html` 里对应区块的结构化内容。

### 5.3 不要做的事

- ❌ 不要为了「更现代」而引入框架或构建工具；
- ❌ 不要把样式写成内联 `style="..."`；
- ❌ 不要用外部图片链接做封面或头像；
- ❌ 不要在 `docs/` 之外新增前端资源目录（会破坏 Pages 发布源）；
- ❌ 不要提交 `node_modules/`、构建产物、编辑器配置文件。

### 5.4 提交规范

每完成一个可独立运行的功能就提交一次，提交信息用中文，格式：

```
feat: 新增博客标签筛选
fix: 修复 375px 下横向滚动
docs: 更新 PRD 验收标准
style: 统一卡片圆角为 16px
```

---

## 六、快速上手

```bash
# 方式一：直接打开（无构建步骤）
双击 docs/index.html

# 方式二：起本地静态服务（推荐，避免个别浏览器对 file:// 的限制）
python -m http.server 5800
# 访问 http://127.0.0.1:5800/docs/
```

改完代码后，按第 4 节的清单自测一遍再提交。
