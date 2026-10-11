import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function readAgentOutputGuidance(agentCorePath: string): Promise<string> {
  try {
    return (await readFile(join(agentCorePath, 'docs/contracts/agent-output-guidance.md'), 'utf8')).trim()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

export async function withAgentOutputGuidance(prompt: string, agentCorePath: string): Promise<string> {
  const guidance = await readAgentOutputGuidance(agentCorePath)
  return !guidance || prompt.includes(guidance) ? prompt : `${prompt}\n\n${guidance}`
}
