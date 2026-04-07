export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-gray-900"></div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Loading RMS Platform</h2>
        <p className="text-gray-600">Please wait while we load your data...</p>
      </div>
    </div>
  )
}
