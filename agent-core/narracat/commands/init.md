---
description: 初始化新小说项目 — 创建目录结构和配置文件
argument-hint: <书名>
allowed-tools: [Read, Write, Glob, AskUserQuestion, Bash, mcp__narracat_memory__novel_query]
---

创建小说项目骨架。本命令只做机械步骤；题材、篇幅等创作信息由 `/narracat:setup` 对话收集。

## 步骤

1. 书名 = $ARGUMENTS；未提供则用 AskUserQuestion 询问一次。
2. 当前目录已有 `.narracat/` → 警告检测到已有项目，AskUserQuestion 确认覆盖还是取消。
3. 创建目录：`.narracat/`、`.narracat/context-packs/`、`bible/characters/`、`bible/world/`、`bible/references/`、`outline/`、`manuscript/`、`reviews/`、`notes/`。
4. 复制模板：
   - `${CLAUDE_PLUGIN_ROOT}/templates/premise-template.md` → `bible/premise.md`
   - `${CLAUDE_PLUGIN_ROOT}/templates/relationships-template.md` → `bible/relationships.md`
5. 写 `.narracat/config.yaml`。UUID 用 Bash 生成：`python3 -c "import uuid; print(uuid.uuid4())"`（失败则用时间戳+随机数）。null 字段由 `/narracat:setup` 写入：

```yaml
novel_id: "<UUID v4>"
title: "<书名>"
genre: null
language: "zh-CN"
automation_level: "collaborative"
estimated_total_chapters: null
words_per_chapter: null
style_profile: null
```

6. 写 `.narracat/state.yaml`：

```yaml
progress:
  last_completed_chapter: 0
  completed_chapters: []
  in_progress_chapter: null
  total_chapters_planned: 0
  chapters_outlined: []
word_count:
  total: 0
  by_chapter: {}
structure:
  total_volumes: 0
  total_chapters_planned: 0
  chapter_to_volume: {}
checkpoint:
  last_command: null
  last_step: null
  context_snapshot: null
  timestamp: null
```

7. 调用 `novel_query(query="connection test")` 自检 NovelMemory 连接。失败不终止，说明项目已创建，但暂时无法读取记忆服务。内部排查 mcp-server 是否已编译（`cd mcp-server && npm run build`）、`.narracat/config.yaml` 是否已生成；面向作者按语言契约表达。
8. 输出摘要：书名、项目是否已创建、连接检查结果，并提示下一步。novel_id 和文件清单留作内部记录：

```
项目初始化完成。建议下一步：
 - /narracat:setup — 立项对话
如有参考小说，可先导入 Markdown 或纯文本，再运行 /narracat:reference 分析写法（可选）。
```
