---
description: 重写已完成章节 — 更新本章正文和记忆，检查对后续章节的影响
argument-hint: <章节号>（可追加一句重写要求）
allowed-tools: [Agent, Read, Write, Grep, Glob, AskUserQuestion, "mcp__narracat_memory__novel_build_writing_context_pack", "mcp__narracat_memory__novel_rollback_chapter", "mcp__narracat_memory__novel_get_review", "mcp__narracat_memory__novel_get_arc", "mcp__narracat_memory__novel_character_state", "mcp__narracat_memory__novel_query", "mcp__narracat_memory__novel_check_manuscript_contract", "mcp__narracat_memory__novel_check_prose_hygiene", "mcp__narracat_memory__novel_update_progress", "mcp__narracat_memory__novel_checkpoint"]
---

重写指定的已完成章节：确认 → 构建上下文包 → 记忆回滚 → 重写 → 审修 → 入库 → 级联影响分析。

**对作者说话**：内部保留准确的字段、路径、工具与角色标识；对话、问题选项和报告使用作者能理解的说法，说明结果、影响和下一步。译名与展示边界见 `${CLAUDE_PLUGIN_ROOT}/docs/contracts/user-facing-language.md`。

## 步骤 0：影响预警与确认

1. 解析 $ARGUMENTS：第一个数字为 chapter_num，其余文字为用户的重写要求（可空）。
2. 读 `.narracat/state.yaml`（取 progress 与 structure）。
3. chapter_num 不在 `progress.completed_chapters` → 报错："该章未完成，请使用 /narracat:write"。
4. chapter_num 不在 `structure.chapter_to_volume` → 报错："该章未在大纲中规划"。
5. 调 `novel_get_review(chapter=chapter_num)`：有 blockers 则展示，作为默认修复目标。
6. 展示警告："将重新写第 {chapter_num} 章，并重新记录本章剧情。其后的已写章节可能受影响：第 {chapter_num+1}-{last_completed_chapter} 章（共 N 章；没有后续已写章时省略此句）。" → AskUserQuestion："确认重写" / "取消"。取消即终止，不做任何修改。

## 步骤 1：构建上下文包（不修改记忆与正文）

- 调 `novel_build_writing_context_pack(chapter=chapter_num)`，记下返回的 pack_path、manuscript_path 与 word_count_range（上下文包由工具落盘），后续步骤直接引用。
- 工具返回错误 → 终止：不回滚记忆、不覆盖正文。
- Read {manuscript_path} 当前正文，保存为旧稿（步骤 6 级联分析用）。
- Read {pack_path}：包里有 `characters_without_cards` 时逐个按条目上的 `character_uid` 调 `novel_character_state` 补查，把这些角色的当前状态翻成人话记为 `{角色状态补充}`（无该键则为空），步骤 3 派发时附上。本命令的写手直接读包、手上没有查询工具，未查到的状态注明未知，不交给写手猜测。

## 步骤 2：记忆回滚

- 调 `novel_rollback_chapter(chapter=chapter_num)`：该章记忆移除、被该章失效的旧事实恢复、进度状态回退，全部由工具完成。主会话不手改 `state.yaml`。
- 回滚失败 → 终止并报告（记忆状态不一致时不得继续写作）。
- 调 `novel_checkpoint(command="rewrite", step=2, chapter=chapter_num)`。

## 步骤 3：正文生成

1. 本轮正文写入 `.narracat/staging/ch-{三位章号}.md`，将这个路径记为 {manuscript_path}；步骤 1 读到的旧稿保留在正式路径，验收通过后由 `novel_update_progress` 转正。
2. 把用户的重写要求 Write 到 `.narracat/staging/ch-{三位章号}.request.md`，本次无要求时写明「按最新版细纲重写」，不得采用旧轮次遗留要求。
3. Read `${CLAUDE_PLUGIN_ROOT}/commands/write.md`，只复用其中步骤 3a 的任务书组装规则，以本轮 {pack_path}、作者要求和当前写法来源生成 `.narracat/staging/ch-{三位章号}.brief.md`。不执行该命令的确认、进度或收尾步骤。任务书指出应展开的场景和顾虑，不搬运旧稿的难句，不预写旁白让写手照抄；书级声音与参考开关按本次上下文包实际状态处理。
4. 派发写手：

```
Task(chapter-writer): "重写第 {chapter_num} 章正文。
目标字数区间: {word_count_range 的下限}-{word_count_range 的上限} 字。
输出路径: {manuscript_path}
任务书路径: {brief 路径}
按任务书写完整场景，信息与结尾不改，句子和对白由人物当前处境决定；不要照抄任务书的说明句。"
```

5. 复用 `/write` 的 3c 机械检查和 3d 单次冷改，冷改派发带 `thinking="off"`。冷改必须通读句意、对白、心理过程和衔接，不能因扫描无命中就跳过；不要为清零指标改掉自然表达。
6. 全部改稿完成后调 `novel_check_manuscript_contract(chapter=chapter_num)`，以返回的实际字数和区间为准。失败按 3c 的修复上限处理；仍未通过就保存草稿、报告具体问题并停止，不提交记忆和进度。通过后调 `novel_checkpoint(command="rewrite", step=3, chapter=chapter_num)`。

## 步骤 4：审修与路由

1. 派发审校（与 /narracat:write 写后审修同一 Envelope，不复述审校规则）：

   ```
   Task(continuity-editor): "审校第 {chapter_num} 章。
   正文路径: {manuscript_path}
   WritingContextPack 路径: {pack_path}"
   ```

2. 调 `novel_get_review(chapter=chapter_num)` 取 `{verdict, blockers[], readability_notes[]}`。
3. verdict=fail 或有 readability_notes → 把两类问题合并后定向修复一次（上限 1 轮）：
   - Task(chapter-writer, thinking="off")："只修复以下问题涉及的段落，保留其余事件与结尾：{合并的问题清单原样列出}。正文路径: {manuscript_path}。任务书路径: {brief 路径}。"
   - 修复后先调 `novel_check_manuscript_contract`，失败按步骤 3 的合同修复上限处理。所有补写与清理完成后才能复审，不在最终审校之后追加文字。
   - Task(continuity-editor)："审校第 {chapter_num} 章。只复验下列已修复问题: {合并的问题清单原样列出}。正文路径: {manuscript_path}。WritingContextPack 路径: {pack_path}。"
   - 再调 `novel_get_review`。仍 fail → 调 `novel_checkpoint(command="rewrite", step=4, chapter=chapter_num)`，停止并向用户报告 blockers，等人工处理。
4. verdict=pass → 继续步骤 5。复审后仍有表达建议就列出遗留原句，不追加改稿轮；PASS 不等于表达全部合格，机械扫描通过也不等于“已无AI味”。

## 步骤 5：记忆入库与进度

1. 派发记忆收尾：

   ```
   Task(memory-keeper): "第 {chapter_num} 章已定稿，执行章节收尾。
   正文路径: {manuscript_path}
   本章调 novel_commit_chapter 与 novel_submit_extraction。"
   ```

   若本章是其所在 arc 或卷的末章（用 `novel_get_arc(chapter=chapter_num)` 查边界），在派发中追加："本章到达 {arc|volume} {scope_id} 边界（第 {start}-{end} 章），另调 novel_consolidate 刷新该区间摘要。"
2. 调 `novel_update_progress(chapter=chapter_num)`（完成集合、字数、checkpoint 清理全部由工具写 `state.yaml`）。

## 步骤 6：级联影响分析（主会话直接执行）

1. 对比旧稿与新稿，提取关键差异：角色状态、事件、关系、伏笔、设定。
2. 逐章 Read 后续章节（chapter_num+1 到 last_completed_chapter），找出引用了被改动内容的段落，评定 impact_level ∈ critical / moderate / minor。
3. 按 CascadeImpactReport 组织结果：`rewritten_chapter` / `has_impact` / `affected_chapters[{chapter, impact_level, issues, suggested_fix}]`。
4. 展示：
   - has_impact=false → "重写完成，未发现对后续已写章节的影响。"
   - has_impact=true → 表格展示 | 章节 | 影响级别 | 问题 | 建议修复 |，建议对 critical 章逐章 `/narracat:rewrite` 修复 → AskUserQuestion："了解，稍后处理" / "立即修复第 X 章"。

## 错误处理

| 场景 | 处理 |
|---|---|
| 章节未完成 | 报错 + 引导使用 /narracat:write |
| 上下文包构建失败 | 终止，不回滚记忆、不覆盖正文 |
| 记忆回滚失败 | 终止，不继续写作 |
| 修复复验仍 fail | 停在 checkpoint，报告 blockers 等人工处理 |
| 用户取消 | 终止，不做任何修改 |
