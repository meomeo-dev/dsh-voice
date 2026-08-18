import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import {
  docHref,
  docs,
  findDoc,
  renderMarkdown,
  voiceAccent,
  voiceInitials,
  voices,
  type DocEntry,
  type SiteVoice,
} from './content'

function useSitePath(): readonly [string, (path: string) => void] {
  const [path, setPath] = useState(() => window.location.pathname || '/')

  useEffect(() => {
    const onPopState = (): void => setPath(window.location.pathname || '/')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: string): void => {
    if (window.location.pathname !== next) window.history.pushState({}, '', next)
    setPath(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return [path, navigate]
}

function Header({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const link = (event: MouseEvent<HTMLAnchorElement>, target: string): void => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(target)
  }

  return (
    <header className="site-header">
      <a className="brand" href="/" onClick={event => link(event, '/')}>
        <span className="brand-mark">令</span>
        <span className="brand-copy">
          <strong>dsh-voice</strong>
          <small>conversation tones</small>
        </span>
      </a>
      <nav className="top-nav" aria-label="Primary navigation">
        <a className={path.startsWith('/docs') || path === '/' ? 'active' : ''} href="/" onClick={event => link(event, '/')}>Guide</a>
        <a className={path.startsWith('/voices') ? 'active' : ''} href="/voices" onClick={event => link(event, '/voices')}>Voices</a>
      </nav>
      <a className="header-command" href="https://github.com/meomeo-dev/dsh-voice" target="_blank" rel="noreferrer">
        <span>GitHub</span>
        <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}

function DocsSidebar({ active, onNavigate }: { active: DocEntry; onNavigate: (path: string) => void }) {
  const groups = [...new Set(docs.map(doc => doc.section))]
  const link = (event: MouseEvent<HTMLAnchorElement>, doc: DocEntry): void => {
    event.preventDefault()
    onNavigate(docHref(doc))
  }

  return (
    <aside className="docs-sidebar">
      <div className="sidebar-intro">
        <span className="eyebrow">Documentation</span>
        <p>Everything you need to switch the voice of a conversation.</p>
      </div>
      <nav aria-label="Documentation navigation">
        {groups.map(group => (
          <div className="sidebar-group" key={group}>
            <span className="sidebar-label">{group}</span>
            {docs.filter(doc => doc.section === group).map(doc => (
              <a
                className={doc.slug === active.slug ? 'current' : ''}
                href={docHref(doc)}
                key={doc.slug}
                onClick={event => link(event, doc)}
              >
                <span>{doc.title}</span>
                {doc.slug === 'home' && <span className="sidebar-dot" aria-hidden="true" />}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="status-pip" />
        <span>Open source · MIT</span>
      </div>
    </aside>
  )
}

function DocsPage({ doc, onNavigate }: { doc: DocEntry; onNavigate: (path: string) => void }) {
  const onArticleClick = (event: MouseEvent<HTMLElement>): void => {
    const target = event.target as HTMLElement
    const anchor = target.closest('a')
    const href = anchor?.getAttribute('href')
    if (href === null || href === undefined || !href.startsWith('/')) return
    event.preventDefault()
    onNavigate(href)
  }

  return (
    <div className="docs-layout">
      <DocsSidebar active={doc} onNavigate={onNavigate} />
      <main className="doc-main">
        <div className="doc-toolbar">
          <span className="eyebrow">{doc.section} / {doc.title}</span>
          <span className="doc-source">{doc.file}</span>
        </div>
        <article className="markdown-body" onClick={onArticleClick} dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.source) }} />
        <footer className="doc-footer">
          <span>Rendered from the repository source.</span>
          <a href="/voices" onClick={event => { event.preventDefault(); onNavigate('/voices') }}>Browse the voice index →</a>
        </footer>
      </main>
    </div>
  )
}

function VoiceAvatar({ voice, large = false }: { voice: SiteVoice; large?: boolean }) {
  return voice.portraitUrl === undefined
    ? <span className={`voice-avatar generated${large ? ' large' : ''}`} style={{ background: voiceAccent(voice.id) }}>{voiceInitials(voice)}</span>
    : <img className={`voice-avatar portrait${large ? ' large' : ''}`} src={voice.portraitUrl} alt="" />
}

function VoiceCard({ voice, onOpen }: { voice: SiteVoice; onOpen: (voice: SiteVoice) => void }) {
  const stylePreview = voice.style.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 2).join(' ')
  return (
    <button className="voice-card" type="button" onClick={() => onOpen(voice)} style={{ '--accent': voiceAccent(voice.id) } as CSSProperties}>
      <div className="voice-card-top">
        <VoiceAvatar voice={voice} />
        <span className="voice-id">{voice.id}</span>
        <span className="open-mark" aria-hidden="true">↗</span>
      </div>
      <h2>{voice.label}</h2>
      <p className="voice-description">{voice.description}</p>
      <div className="voice-card-rule" />
      <div className="voice-card-meta">
        <span>{voice.identity.role}</span>
        <span>{voice.examples.length} scenes</span>
      </div>
      {stylePreview.length > 0 && <p className="voice-style-preview">“{stylePreview}”</p>}
    </button>
  )
}

function VoicesPage({ onOpen }: { onOpen: (voice: SiteVoice) => void }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = voices.filter(voice => needle.length === 0
    || voice.id.includes(needle)
    || voice.label.toLowerCase().includes(needle)
    || voice.description.toLowerCase().includes(needle)
    || voice.identity.role.toLowerCase().includes(needle))

  return (
    <main className="voices-page">
      <section className="voices-hero">
        <div>
          <span className="eyebrow">The voice index</span>
          <h1>Sixteen ways to<br /><em>change the room.</em></h1>
          <p>Built-in conversation tones for DeepSeek Harness. Choose a point of view, then let every answer sound like it came from somewhere.</p>
        </div>
        <div className="voice-count" aria-label={`${voices.length} built-in voices`}>
          <strong>{String(voices.length).padStart(2, '0')}</strong>
          <span>built-in<br />voices</span>
        </div>
      </section>
      <section className="voice-tools" aria-label="Filter voices">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name, role, or style" />
          {query.length > 0 && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        </label>
        <span className="result-count">{visible.length} of {voices.length} voices</span>
      </section>
      {visible.length === 0
        ? <div className="empty-state"><span>∅</span><h2>No voice found</h2><p>Try a different name or role.</p></div>
        : <section className="voice-masonry" aria-label="Voice cards">{visible.map(voice => <VoiceCard key={voice.id} voice={voice} onOpen={onOpen} />)}</section>}
    </main>
  )
}

function VoiceModal({ voice, onClose }: { voice: SiteVoice | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (voice === null) return
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [voice, onClose])

  if (voice === null) return null

  const copyCommand = (): void => {
    void navigator.clipboard.writeText(`/voice ${voice.id}`).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }).catch(() => {})
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="voice-modal" role="dialog" aria-modal="true" aria-labelledby="voice-modal-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close voice details">×</button>
        <div className="modal-heading">
          <VoiceAvatar voice={voice} large />
          <div>
            <span className="voice-id">{voice.id}</span>
            <h2 id="voice-modal-title">{voice.label}</h2>
            <p>{voice.description}</p>
          </div>
        </div>
        <div className="modal-command-row">
          <code>/voice {voice.id}</code>
          <button type="button" onClick={copyCommand}>{copied ? 'Copied' : 'Copy command'}</button>
        </div>
        <div className="modal-facts">
          <div><span className="eyebrow">Role</span><strong>{voice.identity.role}</strong></div>
          <div><span className="eyebrow">Addresses you as</span><strong>{voice.identity.address}</strong></div>
          <div><span className="eyebrow">Scenes</span><strong>{voice.examples.length}</strong></div>
        </div>
        <div className="modal-columns">
          <section>
            <span className="eyebrow">Identity</span>
            <p className="modal-prose">{voice.identity.background}</p>
          </section>
          <section>
            <span className="eyebrow">Style notes</span>
            <p className="modal-prose style-prose">{voice.style}</p>
          </section>
        </div>
        {voice.examples.length > 0 && (
          <section className="examples-section">
            <div className="section-heading"><span className="eyebrow">In conversation</span><span>Selected scenes</span></div>
            <div className="example-grid">
              {voice.examples.map(example => (
                <article className="example-card" key={example.name}>
                  <h3>{example.name}</h3>
                  {example.turns.map((turn, index) => (
                    <div className={`example-turn${index % 2 === 0 ? ' user-turn' : ''}`} key={`${turn.speaker}-${index}`}>
                      <span>{turn.speaker}</span>
                      <p>{turn.text}</p>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  )
}

export function App() {
  const [path, navigate] = useSitePath()
  const [selectedVoice, setSelectedVoice] = useState<SiteVoice | null>(null)
  const isVoices = path === '/voices' || path === '/voices/'
  const docSlug = path.startsWith('/docs/') ? decodeURIComponent(path.slice('/docs/'.length).replace(/\/$/u, '')) : 'home'
  const activeDoc = findDoc(docSlug) ?? docs[0]!

  useEffect(() => {
    document.title = isVoices ? 'Voices · dsh-voice' : `${activeDoc.title} · dsh-voice`
  }, [activeDoc.title, isVoices])

  return (
    <div className="site-shell">
      <Header path={path} onNavigate={navigate} />
      {isVoices ? <VoicesPage onOpen={setSelectedVoice} /> : <DocsPage doc={activeDoc} onNavigate={navigate} />}
      <VoiceModal voice={selectedVoice} onClose={() => setSelectedVoice(null)} />
    </div>
  )
}
