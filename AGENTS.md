# NarraCat 项目代理工作规范

## 项目边界

NarraCat 是桌面创作工作台。Electron App 负责 GUI、IPC、状态和 pi 运行时装配。仓库内的 `agent-core/narracat/` 是创作引擎源码。私有实验室的研究工具、技能与未公开计划与本仓无代码依赖。

## 必须遵守的约束

- 保留 Electron 主进程 ESM、preload CJS 和 `file://` 使用的 `HashRouter`。React 使用函数组件与 hooks。优先命名导入，原生模块可用默认导入。
- API Key 使用 keytar 保存在系统凭据库，禁止明文落盘。
- 用 `jj` 在本地提交通过验证的本次改动。只在用户明确授权推送本次改动时才推送。保留其他改动。提交或推送失败时保留工作区并报告原因。
- 手工编辑用 `apply_patch`。不要静默同步上游引擎。App 层先定义产品动作契约，按引擎产出的小说结构读取与渲染。

## 验证入口

- Bun 命令必须带 `--no-cache`。按[验证指南](docs/agents/verification.md)选择 `ops:check` 与改动所需的测试、架构检查或打包验证。

## 按任务阅读

- 继续阶段工作、拆 issue、交接或发布 → [工作流](docs/agents/workflow.md)，再读该路线所需文件。
- 修改产品术语、公共边界或架构 → [CONTEXT](CONTEXT.md) 和相关 [ADR](docs/adr/)。
- Agent Core、小说结构、MCP 或打包资源 → [引擎接入](docs/agents/agent-core-integration.md)，并按需读取引擎自己的指令。
- UI、品牌、设计系统或设计交接 → [设计约束](docs/agents/product-design.md)。
