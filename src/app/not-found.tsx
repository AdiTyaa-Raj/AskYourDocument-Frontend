import { AppNotFoundState } from '@/components/shared/AppFeedbackState'

export default function NotFound() {
  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <AppNotFoundState />
      </div>
    </div>
  )
}
