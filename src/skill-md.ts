/**
 * SKILL.md(带 YAML frontmatter)的轻量解析,供运行时把 create-voice 元技能
 * 注册进 `ctx.skills`。frontmatter 约定与 harness 的 skill-filesystem 一致。
 * @module dsh-voice/skill-md
 */

import { parse as parseYaml } from 'yaml'

/** 一个解析出的 SKILL.md。 */
export interface SkillMarkdown {
  readonly name: string
  readonly description: string
  /** frontmatter 之后的正文(即 skill 指令体)。 */
  readonly content: string
}

/** 解析 SKILL.md 文本。 */
export function parseSkillMarkdown(text: string): SkillMarkdown {
  const firstLineEnd = text.indexOf('\n')
  if (firstLineEnd < 0) throw new Error('SKILL.md is missing frontmatter')
  const firstLine = text.slice(0, firstLineEnd).replace(/\r$/, '')
  if (firstLine !== '---') throw new Error('SKILL.md is missing frontmatter')
  const closing = text.indexOf('\n---', firstLineEnd + 1)
  if (closing < 0) throw new Error('SKILL.md has unterminated frontmatter')
  const yamlText = text.slice(firstLineEnd + 1, closing)
  const data = parseYaml(yamlText) as Record<string, unknown>
  if (typeof data?.name !== 'string' || typeof data?.description !== 'string') {
    throw new Error('SKILL.md frontmatter requires name and description')
  }
  const bodyStart = text.indexOf('\n', closing + 1)
  return {
    name: data.name,
    description: data.description,
    content: text.slice(bodyStart < 0 ? text.length : bodyStart + 1).trim(),
  }
}
