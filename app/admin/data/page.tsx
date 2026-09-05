'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

export default function AdminDataPage() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setDownloading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/export-csv')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eyeguard-export-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Data Management</h1>
        <p className="text-muted-foreground mt-1">Export respondent data for offline analysis</p>
      </div>

      <div className="border border-border rounded-xl p-6 max-w-md space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Export Data</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Downloads all <code className="text-xs bg-muted px-1 py-0.5 rounded">daily_logs</code> rows
            as an Excel (.xlsx) file with 16 columns, bold headers, and auto-sized columns.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={downloading}
          aria-busy={downloading}
          aria-label="Export all respondent data as Excel file"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
          {downloading ? 'Generating…' : 'Export Excel (.xlsx)'}
        </button>

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}
