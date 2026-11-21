import { useEffect, useState } from 'react'

const cache = new Map<string, Promise<unknown>>()

function load(file: string): Promise<unknown> {
  let p = cache.get(file)
  if (!p) {
    p = fetch(import.meta.env.BASE_URL + 'data/' + file).then((r) => {
      if (!r.ok) throw new Error('Data not built: run scripts/build_data.py (' + file + ')')
      return r.json()
    })
    cache.set(file, p)
  }
  return p
}

export function useJson<T>(file: string): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ file: string; data: T | null; error: string | null }>({
    file,
    data: null,
    error: null,
  })
  useEffect(() => {
    let live = true
    load(file).then(
      (d) => live && setState({ file, data: d as T, error: null }),
      () =>
        live &&
        setState({ file, data: null, error: 'Data not built: run scripts/build_data.py (' + file + ')' }),
    )
    return () => {
      live = false
    }
  }, [file])
  return state.file === file ? { data: state.data, error: state.error } : { data: null, error: null }
}
