# 个人展示网站

Misery1003 的个人主页：个人介绍、技能、项目作品与技术博客。

**在线地址**：https://misery1003.github.io/personal-site/
**仓库地址**：https://github.com/Misery1003/personal-site

纯静态 · 零依赖 · 深色主题 · 星空 Canvas 背景 · 多端适配

---

## 项目文档

本项目的开发遵循「先文档、后编码」的流程，三份文档是所有改动的依据：

| 文档 | 作用 |
| --- | --- |
| [PRD.md](PRD.md) | 产品需求文档：做什么、不做什么、验收标准 |
| [TECH_DESIGN.md](TECH_DESIGN.md) | 技术设计：技术栈决策、项目结构、数据模型、关键技术点 |
| [AGENTS.md](AGENTS.md) | AI 代理开发规范：开发规范、代码风格、测试要求、注意事项 |

**改代码之前先读 `AGENTS.md`**，它定义了本项目的硬性约束。

---

## 快速开始

没有构建步骤，克隆下来就能跑：

```bash
# 方式一：直接打开
双击 docs/index.html

# 方式二：起本地静态服务（推荐，避免浏览器限制本地 fetch）
python -m http.server 5800
# 访问 http://127.0.0.1:5800/docs/
```

> 为什么推荐方式二：博客文章是用 `fetch` 加载的，部分浏览器在 `file://` 协议下
> 会拦截本地 fetch 请求，导致文章列表加载失败。

---

## 目录结构

```
personal-site/
├── PRD.md                  产品需求文档
├── TECH_DESIGN.md          技术设计文档
├── AGENTS.md               AI 代理开发规范
├── README.md               本文件
├── docs/                   网站源码（GitHub Pages 发布目录）
│   ├── index.html
│   ├── css/style.css       设计令牌 + 全站样式
│   ├── js/
│   │   ├── stars.js        星空 Canvas 粒子
│   │   ├── blog.js         Markdown 解析与博客渲染
│   │   └── main.js         导航、技能、项目、表单、复制
│   └── content/posts/      博客文章（Markdown）
└── screenshots/            交付截图
```

---

## 功能一览

- **Hero**：头像、职位、一句话介绍、双 CTA、数据速览
- **关于我**：简介 + 教育背景 + 经历时间线
- **技能**：三分类，图标 + 名称 + 熟练度进度条（进入视口时增长）
- **项目**：卡片列表，CSS 渐变封面 + 技术标签 + 演示/源码按钮
- **博客**：Markdown 列表 + 详情页（自动生成 TOC、代码高亮、阅读时长）
- **联系**：邮箱一键复制 + 社交链接 + 表单校验与反馈
- **全局**：吸顶毛玻璃导航、滚动高亮、滚动进度条、返回顶部

## 技术要点

- **零依赖**：不引入任何框架、库或 CDN，图标与封面全部用内联 SVG / CSS 绘制
- **设计令牌**：所有颜色、圆角、间距、动效集中在 `:root`，令牌命名对齐 Tailwind
- **无障碍**：对比度达 WCAG AA、全站键盘可导航、`prefers-reduced-motion` 降级
- **性能**：星空粒子按屏宽动态调整数量，`devicePixelRatio` 截断到 2，后台自动暂停
- **安全**：Markdown 渲染前先做 HTML 转义，链接只放行 http(s) 与页内锚点

## 写新文章

1. 在 `docs/content/posts/` 新建 `NNN-slug.md`（三位序号保证排序稳定）
2. 文件开头按约定写元信息：

```markdown
# 文章标题

date: 2026-10-15
tags: 标签一, 标签二

正文第一段会作为列表页摘要。
```

3. **把文件名加进 `docs/content/posts/index.json`**，否则列表里不会出现

## 部署

采用 GitHub Pages（依据《7.部署》文档的「网站托管平台」方式）：

仓库 **Settings → Pages**：

| 配置项 | 值 |
| --- | --- |
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | `/docs` |

保存后约 1–2 分钟生效，地址为 `https://<用户名>.github.io/<仓库名>/`。

## 许可

仅用于个人展示与学习。
