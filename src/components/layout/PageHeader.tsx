interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-ink leading-tight">{title}</h1>
      {description && (
        <p className="text-sm text-ink-light mt-1 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
