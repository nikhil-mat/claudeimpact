'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface StatusFilterProps {
  options: string[]
  paramName?: string
  label?: string
}

export function StatusFilter({ options, paramName = 'status', label = 'Status' }: StatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramName) || ''

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(paramName, value)
    } else {
      params.delete(paramName)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <select
      value={current}
      onChange={e => handleChange(e.target.value)}
      className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm focus:outline-2 focus:outline-edge-focus"
    >
      <option value="">All {label}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}
