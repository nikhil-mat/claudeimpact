'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface WardFilterProps {
  wards: { ward_code: string; ward_name: string }[]
  paramName?: string
}

export function WardFilter({ wards, paramName = 'ward' }: WardFilterProps) {
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
    // Reset page when ward changes
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <select
      value={current}
      onChange={e => handleChange(e.target.value)}
      className="border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink rounded-sm focus:outline-2 focus:outline-edge-focus"
    >
      <option value="">All Wards</option>
      {wards.map(w => (
        <option key={w.ward_code} value={w.ward_code}>
          {w.ward_code} — {w.ward_name}
        </option>
      ))}
    </select>
  )
}
