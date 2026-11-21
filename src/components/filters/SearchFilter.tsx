'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

interface SearchFilterProps {
  paramName?: string
  placeholder?: string
}

export function SearchFilter({ paramName = 'q', placeholder = 'Search...' }: SearchFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get(paramName) || '')

  useEffect(() => {
    setValue(searchParams.get(paramName) || '')
  }, [searchParams, paramName])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set(paramName, value.trim())
    } else {
      params.delete(paramName)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="border border-edge bg-surface pl-8 pr-3 py-1.5 text-xs text-ink rounded-sm w-full sm:w-56 focus:outline-2 focus:outline-edge-focus"
      />
    </form>
  )
}
