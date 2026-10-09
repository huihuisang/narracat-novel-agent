# Triage Labels

Skills 用五个 canonical triage 角色。下表把角色映射到本仓库实际使用的 GitHub label 字符串。

| Skill 角色          | 本仓库 label       | 含义                                       |
| ------------------- | ------------------ | ------------------------------------------ |
| `needs-triage`      | `needs-triage`     | maintainer 需评估此 issue                  |
| `needs-info`        | `needs-info`       | 等回报者补充信息                           |
| `ready-for-agent`   | `ready-for-agent`  | 需求与验收明确，可由 agent 独立执行           |
| `ready-for-human`   | `ready-for-human`  | 需人工实施                                 |
| `wontfix`           | `wontfix`          | 不会处理（仓库已存在此 label）             |

Skill 提到某角色时（如"apply the AFK-ready triage label"），用此表右列对应的 label 字符串。

## 缺失 label 的处理

先查询仓库已有标签；下列标签不存在时才按需创建，不把本文记录当作远端当前状态：

```
gh label create needs-triage --description "Maintainer needs to evaluate" --color "fbca04"
gh label create needs-info --description "Waiting on reporter for more info" --color "d4c5f9"
gh label create ready-for-agent --description "Fully specified, AFK-ready" --color "0e8a16"
gh label create ready-for-human --description "Requires human implementation" --color "1d76db"
```

需要替换 label 词汇时编辑本文件右列即可，skill 会自动跟随。
