/**
 * Shared view components for memo templates
 * These components are reusable across different template views
 */

interface SectionProps {
  title: string
  children: React.ReactNode
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  )
}

interface SubSectionProps {
  title: string
  children: React.ReactNode
}

export function SubSection({ title, children }: SubSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

interface DataFieldProps {
  label: string
  value: string | undefined
}

export function DataField({ label, value }: DataFieldProps) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
}

interface TextContentProps {
  value: string | undefined
}

export function TextContent({ value }: TextContentProps) {
  if (!value) return <p className="text-sm text-gray-400">No data provided</p>
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{value as string}</p>
  )
}

interface AnalysisPointProps {
  question: string
  value: string | undefined
}

export function AnalysisPoint({ question, value }: AnalysisPointProps) {
  if (!value) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{question}</p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-600">{value as string}</p>
    </div>
  )
}
