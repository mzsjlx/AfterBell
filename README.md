# AfterBell · 课后研学与教学智能工作台

专为**大学课下研学与教师智能管控**打造的极简三端 Web 应用。采用冷静克制的冰灰磨砂与瑞士网格排版，去繁就简、减少冗余文字，聚焦课下 AI 减负闭环与手机端顺畅体验。

## 三端能力

- **学生端**：课后待办微测、实时掌握度条、AI 苏格拉底助教、作业初评与 10 秒验真、匿名同问墙、积分特权、个人考前急救单。
- **教师端**：AI 作业初审队列（支持异常拦截与常规项一键批量通过）、学情矩阵与单生私密备注档案、共性同问一键群发、讲义要点一键出微测、一键生成教研报告/台账。
- **运营端**：课程信息与入班码、透明平时分权重滑块、AI 自动巡检开关与触达日志、助教权限与特权池参数、DeepSeek / 通义千问 / OpenAI 兼容模型直连。

## 本地开发与构建

```bash
npm install
npm run dev
npm run build
```

## 公网部署

仓库已内置 [deploy-pages.yml](.github/workflows/deploy-pages.yml)（GitHub Pages）与 [vercel.json](vercel.json)（Vercel），并采用相对资源路径（`base: './'`），可在 GitHub Settings → Pages 中将 Source 设为 **GitHub Actions** 自动发布。
