# 契约：命令进度与控制状态边界

> **定位：** 本文件是多步命令「如何展示进度、哪些控制状态仅供内部使用」的 SSOT，调用方是 `commands/plan.md` / `commands/write.md` 等带步骤编排的命令。调用方在 frontmatter 之外用一句话引用本契约（「进度与控制状态边界见 `${CLAUDE_PLUGIN_ROOT}/docs/contracts/command-progress.md`」），不复制本文细则。

---

## §1 进度走结构化事件

命令的每一步进度只经 TaskCreate / TaskUpdate 表达，由客户端渲染步骤态：

1. 前置检查通过后用 TaskCreate 一次性建任务列表，每项是面向作者的步骤名（不带内部编号前缀，如「准备本章材料」而非「步骤 1」）。
2. 每步开始 TaskUpdate 置 in_progress，完成置 completed，失败置对应状态。
3. 不要把「步骤 N 开始 / 完成」「进度 X/Y」另写成对话文本——任务列表已经承载这层信息，不再重复播报。

## §2 控制状态不入用户通道

下列是命令内部控制流，只用于自身分支判断，不得复述进面向作者的 assistant 文本，也不写进 TaskUpdate 的步骤名：

- automation_level 取值（auto / collaborative）
- 开写确认门的状态与计数（chapter_gate / chapter_gate_skips）——作者只需要知道是否需要确认，无需知道字段名与内部计数
- 模式判定结果（新建 / 修改 / 补卷 / 补纲）
- 前置检查的逐项过/未过流水账（「config 已读」「master-outline.md 不存在」）
- 内部步骤编号（步骤 0 / 1.5 / 2）

作者需要知道当前操作、已有结果和待决定的事项。判定后进入对应分支，通过任务状态和产物展示结果。

## §3 例外：作者必须知道的判定

判定本身需要作者参与或影响后续操作时，用 AskUserQuestion 或一句面向作者的话表达**结论与影响**，而不是控制字段：

- 例：检测到本章中断 → AskUserQuestion 问「继续 / 从头」，不念「checkpoint.last_step == 4」。
- 例：尚未规划本卷 → 一句「即将规划第 N 卷大纲」，不念「补卷模式」。

## 引用规则

- 命令文件引用本契约必须带 `${CLAUDE_PLUGIN_ROOT}/` 前缀。
- 命令文件不复制本契约的条目，只保留：进度建列表的时机、各步骤名、本命令特有的控制字段（automation_level / 模式判定）一句话「不外露」提示。
