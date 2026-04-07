/**
 * Format file size in bytes to human-readable format
 * @param size - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export const formatFileSize = (size: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let fileSize = size
  let unitIndex = 0

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }

  return `${fileSize.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Get Tailwind CSS classes for status badge based on status value
 * @param status - Status string (e.g., "processed", "processing", "failed")
 * @returns Tailwind CSS classes for the status badge
 */
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'processed':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'processing':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}
