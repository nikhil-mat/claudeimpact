import { pages } from './registry'

// Gateway: entry point listing every view from the registry.
// Don't hardcode cards here — add pages in ./registry.tsx instead.
export default function Gateway() {
  return (
    <div className="gateway">
      <h1>Why you should do anything?</h1>
      <p className="lede">Pick your view to get started.</p>
      <nav className="cards">
        {pages.map((p) => (
          <a key={p.path} href={`#${p.path}`} className="card">
            <span className={`badge ${p.status}`}>{p.status === 'active' ? 'Active' : 'Planned'}</span>
            <h2>{p.title}</h2>
            <p>{p.description}</p>
          </a>
        ))}
      </nav>
    </div>
  )
}
