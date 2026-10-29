'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Center page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Something went wrong!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{error.message || 'An error occurred loading the center page'}</p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
          <Link href="/" className="px-6 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 inline-block transition-colors">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

