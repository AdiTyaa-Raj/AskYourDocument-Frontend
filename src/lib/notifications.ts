'use client'

import { toast } from 'sonner'

type ToastOptions = {
  title: string
  description?: string
  duration?: number
}

/**
 * Production-grade notification system using Sonner
 *
 * Beautiful, accessible toast notifications with smooth animations
 * Used by Vercel, Linear, and other top companies
 *
 * Usage:
 *   notify.success({ title: 'Saved!', description: 'Changes saved successfully' })
 *   notify.error({ title: 'Failed', description: 'Something went wrong' })
 *   notify.warning({ title: 'Careful!', description: 'This action cannot be undone' })
 *   notify.info({ title: 'Note', description: 'Feature coming soon' })
 *   notify.loading({ title: 'Processing...', description: 'Please wait' })
 */
export const notify = {
  /**
   * Success notification (green) - Use for successful operations
   */
  success: ({ title, description, duration }: ToastOptions) => {
    return toast.success(title, {
      description,
      duration: duration ?? 3000,
    })
  },

  /**
   * Error notification (red) - Use for errors and failures
   */
  error: ({ title, description, duration }: ToastOptions) => {
    return toast.error(title, {
      description,
      duration: duration ?? 5000,
    })
  },

  /**
   * Warning notification (yellow/orange) - Use for warnings and cautions
   */
  warning: ({ title, description, duration }: ToastOptions) => {
    return toast.warning(title, {
      description,
      duration: duration ?? 4000,
    })
  },

  /**
   * Info notification (blue) - Use for informational messages
   */
  info: ({ title, description, duration }: ToastOptions) => {
    return toast.info(title, {
      description,
      duration: duration ?? 3000,
    })
  },

  /**
   * Loading notification (gray) - Use for ongoing operations
   * Returns a toast ID that can be used to dismiss or update
   */
  loading: ({ title, description, duration }: ToastOptions) => {
    return toast.loading(title, {
      description,
      duration: duration ?? 2000,
    })
  },

  /**
   * Promise notification - Automatically shows loading → success/error
   *
   * Example:
   *   notify.promise(
   *     apiCall(),
   *     {
   *       loading: 'Uploading...',
   *       success: 'Uploaded successfully!',
   *       error: 'Upload failed'
   *     }
   *   )
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  },

  /**
   * Default notification - Use for neutral messages
   */
  default: ({ title, description, duration }: ToastOptions) => {
    return toast(title, {
      description,
      duration: duration ?? 3000,
    })
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  },
}

export default notify
