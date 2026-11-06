# UI 与产品约束

正文中的代码路径与命令以仓库根目录为基准。

- 当前 UI 基调是简约、大气、少解释。界面只保留完成任务必要的信息。
- 能用 icon 清楚表达的操作优先用纯 icon 按钮，并配合可访问名称或 tooltip。
- 小说详情页的结构基线：左侧项目级菜单，中间内容浏览与操作，右侧 Agent 自然语言对话。
- 中间内容区域优先浏览 Markdown 输出。正文与结构化字段可直接编辑（ADR-0029、ADR-0031），角色和世界观等自由 Markdown 仍只读。
- 空状态引导保持克制：插图、标题、正文、一个主要按钮。
- App 运行时图片素材放在 `src/assets/`，其中 NarraCat 品牌插图放在 `src/assets/illustrations/narracat/`；探索或交接用视觉资产仍按 Design Artifact Sweep 放在 `docs/design-assets/<feature>/`，确认进入产品后再迁移到 renderer asset 目录。
- 设计系统相关工作优先使用 `.agents/skills/build-design-system`（私有实验室仓），并遵循 `docs/design.md`；公开仓侧的硬约束由 `bun --no-cache run check:design` 校验。
- UI / 产品讨论中如果使用 visual companion、HTML mockup、截图或 imagegen 产出视觉资产，PRD 或 issue 前必须按 `docs/agents/design-handoff.md` 执行 Design Artifact Sweep；`.superpowers/` 只作临时探索，可复用资产导出到 `docs/design-assets/<feature>/` 并在 issue 中链接。

参考[设计规范](../design.md)和[设计交接](design-handoff.md)。
