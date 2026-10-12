export function continuousWritingInstruction(skipChapterConfirmation?: boolean): string {
  return skipChapterConfirmation
    ? '\n本次连续写作已由作者确认：仅跳过当前章的开写确认，不修改 config.yaml 中的 chapter_gate 或计数。已有作者要求仍须完整读取、保存并执行；冲突、恢复选择和其他需要作者决定的问题照常询问。只完成本章，不自行启动下一章，后续章节由桌面端安排。'
    : ''
}
