'use client'

import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Database } from 'lucide-react'

interface ImportResult {
  ok: boolean
  filename: string
  totalParsed: number
  inserted: number
  duplicates: number
  cvsqStatusCounts: Record<string, number>
  parseWarnings: string[]
  insertErrors: string[]
  error?: string
}

export default function ImportSurveyPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/import-survey', { method: 'POST', body: form })
      const body = (await res.json().catch(() => ({}))) as ImportResult
      if (!res.ok) {
        throw new Error(body.error ?? `Upload failed (HTTP ${res.status})`)
      }
      setResult(body)
      // Clear the file input so the same file can be re-uploaded if needed
      if (inputRef.current) inputRef.current.value = ''
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const cvsqOrder = ['Positive CVS Case', 'High Probability', 'Low Probability', 'Not a CVS Case', 'Normal']
  const cvsqColor: Record<string, string> = {
    'Positive CVS Case': 'text-red-600 bg-red-50 dark:bg-red-950/20',
    'High Probability': 'text-orange-600 bg-orange-50 dark:bg-orange-950/20',
    'Low Probability': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20',
    'Not a CVS Case': 'text-green-600 bg-green-50 dark:bg-green-950/20',
    'Normal': 'text-green-600 bg-green-50 dark:bg-green-950/20',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import Survey Responses</h1>
        <p className="text-muted-foreground mt-1">
          Upload the EyeGuard Google Form Excel export (.xlsx) to populate the{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">survey_responses</code> table.
        </p>
      </div>

      {/* Upload card */}
      <div className="border border-border rounded-xl p-6 max-w-xl space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#f97316]" />
            Upload Excel File
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            The file must be the Google Form responses export with 38 columns (CVSQ Part 1 + EyeGuard Part 2).
            Re-uploading the same file is safe — duplicates are skipped by email + timestamp.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-[#f97316]/50 hover:bg-[#f97316]/5 transition-colors">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleSelect}
              className="sr-only"
              disabled={uploading}
            />
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {file ? file.name : 'Click to choose an .xlsx file'}
            </span>
            {file && (
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            aria-busy={uploading}
            aria-label="Upload and import the selected Excel file"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {uploading ? 'Importing…' : 'Import into Supabase'}
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Result summary */}
      {result && (
        <div className="border border-border rounded-xl p-6 max-w-xl space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-foreground">Import Complete</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-2xl font-bold text-foreground">{result.totalParsed}</p>
              <p className="text-xs text-muted-foreground">rows parsed</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3">
              <p className="text-2xl font-bold text-green-600">{result.inserted}</p>
              <p className="text-xs text-muted-foreground">inserted</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-2xl font-bold text-foreground">{result.duplicates}</p>
              <p className="text-xs text-muted-foreground">skipped (dup)</p>
            </div>
          </div>

          {result.cvsqStatusCounts && Object.keys(result.cvsqStatusCounts).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">CVS-Smart Score Distribution</p>
              <div className="space-y-1.5">
                {cvsqOrder
                  .filter((k) => result.cvsqStatusCounts[k] != null)
                  .map((k) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{k}</span>
                      <span className={`px-2 py-0.5 rounded font-medium text-xs ${cvsqColor[k] ?? 'bg-muted text-foreground'}`}>
                        {result.cvsqStatusCounts[k]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {(result.parseWarnings.length > 0 || result.insertErrors.length > 0) && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                {result.parseWarnings.length + result.insertErrors.length} warning(s) / error(s)
              </summary>
              <div className="mt-2 space-y-2">
                {result.parseWarnings.map((w, i) => (
                  <p key={`pw-${i}`} className="text-xs text-yellow-700 dark:text-yellow-400">⚠ {w}</p>
                ))}
                {result.insertErrors.map((e, i) => (
                  <p key={`ie-${i}`} className="text-xs text-destructive">✗ {e}</p>
                ))}
              </div>
            </details>
          )}

          <p className="text-xs text-muted-foreground">
            Source: <code className="bg-muted px-1 py-0.5 rounded">{result.filename}</code>
          </p>
        </div>
      )}
    </div>
  )
}
