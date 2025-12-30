# JS_Doc_TurtleSoup_Playkit

一个基于 **PlayKit JavaScript SDK** 的 Turtle Soup 示例项目，用于演示如何在网页中集成 PlayKit 并展示基础交互与播放效果。

本项目是一个 **纯前端静态示例（HTML / CSS / JavaScript）**，适合作为 PlayKit JS 的入门 Demo、文档示例或团队参考项目。

---

## 🌐 在线演示（Live Demo）

你可以直接通过以下地址查看项目运行效果：

👉 https://turtle-soup-eosin.vercel.app/

无需本地环境，打开即可查看完整效果。

---

## ✨ 项目特性

- 📦 纯静态前端项目，无需构建工具
- 🎮 基于 PlayKit JavaScript SDK 的示例实现
- 🧩 代码结构清晰，适合作为参考或二次开发
- 🚀 已部署至 Vercel，支持在线预览

---

## 📁 项目结构

```text
.
├── index.html
│   主页面，项目入口
│
├── style.css
│   页面全局样式
│
├── css/
│   ├── generation.css
│   │   与内容生成/展示相关的样式
│   │
│   └── menu.css
│       菜单与界面布局相关样式
│
├── js/
│   ├── ai_client.js
│   │   AI / PlayKit 相关请求与接口封装
│   │
│   ├── app.js
│   │   应用主逻辑与初始化流程
│   │
│   ├── game_logic.js
│   │   Turtle Soup 的核心游戏逻辑
│   │
│   └── stories.js
│       示例故事数据与内容配置
│
├── .gitattributes
│   Git 属性配置
│
└── README.md
    项目说明文档
