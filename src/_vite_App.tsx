import { useEffect, useState } from 'react'
import Gateway from './pages/Gateway'
import { pages } from './pages/registry'

// Minimal hash router. To add a page, edit src/pages/registry.tsx — not this file.
function currentPath() {
  return window.location.hash.replace(/^#/, '') || '/'
}

export default function App() {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const page = pages.find((p) => p.path === path)
  const Page = page?.component ?? Gateway
  return <Page />
}
