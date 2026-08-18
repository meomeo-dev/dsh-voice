import { marked } from 'marked'
import { parse } from 'yaml'
import type { VoiceFileData } from '../../src/voice-schema.ts'
import readme from '../../README.md?raw'

const markdownModules = import.meta.glob('../../docs/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>
const voiceModules = import.meta.glob('../../voices/*.voice.yaml', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>
const imageModules = import.meta.glob('../../docs/**/*.{png,jpg,jpeg,svg}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

export interface DocEntry {
  readonly slug: string
  readonly title: string
  readonly section: string
  readonly file: string
  readonly source: string
}

export interface SiteVoice extends VoiceFileData {
  readonly portraitUrl?: string
}

const sourceFor = (file: string): string => {
  const match = Object.entries(markdownModules).find(([path]) => path.endsWith(`/${file}`))
  if (match === undefined) throw new Error(`missing website document: ${file}`)
  return match[1]
}

export const docs: readonly DocEntry[] = [
  { slug: 'home', title: 'Overview', section: 'Start here', file: 'README.md', source: readme },
  { slug: 'design', title: 'Architecture', section: 'Reference', file: 'docs/design.md', source: sourceFor('docs/design.md') },
  {
    slug: 'voice-settings-web-ui',
    title: 'Web UI settings',
    section: 'Reference',
    file: 'docs/voice-settings-web-ui.md',
    source: sourceFor('docs/voice-settings-web-ui.md'),
  },
  {
    slug: 'stories/voice-switch-reminder',
    title: 'Voice switch reminder',
    section: 'Notes',
    file: 'docs/stories/voice-switch-reminder.md',
    source: sourceFor('docs/stories/voice-switch-reminder.md'),
  },
]

const imageUrlFor = (path: string): string | undefined => {
  const match = Object.entries(imageModules).find(([key]) => key.endsWith(`/${path}`))
  return match?.[1]
}

const splitHref = (value: string): { path: string; suffix: string } => {
  const hash = value.indexOf('#')
  if (hash < 0) return { path: value, suffix: '' }
  return { path: value.slice(0, hash), suffix: value.slice(hash) }
}

const siteHref = (value: string, attribute: 'href' | 'src'): string => {
  if (value.startsWith('#') || /^(?:https?:|mailto:|data:)/u.test(value)) return value
  const { path, suffix } = splitHref(value)
  const normalized = path.replace(/^\.\//u, '')
  if (attribute === 'src') return imageUrlFor(normalized) ?? value
  const doc = docs.find(entry => entry.file === normalized || entry.file === `docs/${normalized}`)
  if (doc !== undefined) return doc.slug === 'home' ? `/${suffix}` : `/docs/${doc.slug}${suffix}`
  return value
}

/** Render repository Markdown while routing known docs and bundled images through the site. */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { gfm: true }) as string
  return html.replace(/(href|src)="([^"]+)"/gu, (_match, attribute: 'href' | 'src', value: string) =>
    `${attribute}="${siteHref(value, attribute)}"`,
  )
}

export function docHref(doc: DocEntry): string {
  return doc.slug === 'home' ? '/' : `/docs/${doc.slug}`
}

export function findDoc(slug: string): DocEntry | undefined {
  return docs.find(doc => doc.slug === slug)
}

export function portraitFor(id: string): string | undefined {
  return imageUrlFor(`docs/_assets/${id}.png`)
}

const colorFor = (id: string): string => {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0
  const palette = ['#d96b52', '#347b79', '#8062a3', '#c58b38', '#4d6f9f', '#a84d68']
  return palette[Math.abs(hash) % palette.length]!
}

export function voiceAccent(id: string): string {
  return colorFor(id)
}

export function voiceInitials(voice: SiteVoice): string {
  const words = voice.label.trim().split(/\s+/u).filter(Boolean)
  if (words.length > 1) return `${words[0]![0]}${words[1]![0]}`.toUpperCase()
  return voice.label.trim().slice(0, 2) || voice.id.slice(0, 2).toUpperCase()
}

export const voices: readonly SiteVoice[] = Object.entries(voiceModules)
  .map(([, source]) => {
    const voice = parse(source) as VoiceFileData
    return { ...voice, portraitUrl: portraitFor(voice.id) } as SiteVoice
  })
  .sort((a, b) => {
    if (a.id === 'default') return -1
    if (b.id === 'default') return 1
    return a.label.localeCompare(b.label, 'zh-Hans')
  })
