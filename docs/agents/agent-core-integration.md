# Agent Core 接入与资源

正文中的代码路径与命令以仓库根目录为基准。

App 开发运行时直接解析 `agent-core/narracat/`，按其唯一契约清单 `narracat.manifest.json` 发现并装配 commands / agents / skills / schemas / templates（引擎路径解析见 `electron/main/engine/engine.ts`）。打包后使用 Electron resources 下的 `NarraCatAgentCore`。完整准备和打包验收流程见 `resources/README.md`。

`resources/` 只承担 Electron 打包资源说明，不再是 NarraCat Agent Core 的源码目录。不要把本机 sibling 上游仓库静默同步进 App；如需审计 accepted upstream commit，仅通过 `bun --no-cache run audit:narracat-prompts -- --source <locked-upstream-checkout>` 比对。

引擎接入规则：

- App 层只依赖稳定的 Agent Core command、`narracat.manifest.json` 契约清单和小说文件结构。
- `scripts/prepare-narracat-agent-core.mjs` 只负责准备内部 Agent Core 的 MCP runtime/build artifacts，不代表长期上游同步机制。
- 读取和渲染小说内容时，以 NarraCat 生成的文件结构为准，不臆造额外结构。
- 若需要新增产品化 Agent 操作，先在 App 层定义动作契约，再决定是否需要沉淀到 NarraCat Agent Core。

修改引擎前先读[引擎指令](../../agent-core/narracat/CLAUDE.md)。改动引擎的 MCP 服务源码后，按该目录的命令重新构建。打包验证见[资源说明](../../resources/README.md)和[验证指南](verification.md)。

App 仓是唯一开发仓。私有实验室中的规格、设计技能和研究工具不参与 App 构建，克隆 App 仓后缺少这些路径属正常。
