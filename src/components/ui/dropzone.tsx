'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'
import { Upload, X, FileText, Image } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropzoneProps {
  onFileSelect: (file: File) => void
  accept?: Accept
  maxSize?: number
  label?: string
  currentFile?: { name: string } | null
  disabled?: boolean
}

export function Dropzone({
  onFileSelect,
  accept = { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
  maxSize = 10 * 1024 * 1024,
  label = 'Drop file here or click to browse',
  currentFile,
  disabled,
}: DropzoneProps) {
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setError(null)
    if (rejectedFiles && (rejectedFiles as { errors: { code: string }[] }[]).length > 0) {
      const err = (rejectedFiles as { errors: { code: string }[] }[])[0].errors[0]
      if (err.code === 'file-too-large') setError(`File too large. Max ${maxSize / 1024 / 1024}MB`)
      else if (err.code === 'file-invalid-type') setError('Invalid file type')
      else setError('File rejected')
      return
    }
    if (acceptedFiles.length > 0) {
      setPreview(acceptedFiles[0])
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  })

  const activeFile = preview || currentFile
  const isPDF = activeFile?.name.endsWith('.pdf')

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive ? 'border-blue-400 bg-blue-950/30' : 'border-gray-300 hover:border-gray-500 bg-white',
          disabled && 'opacity-50 cursor-not-allowed',
          activeFile && 'border-green-600 bg-green-950/20'
        )}
      >
        <input {...getInputProps()} />
        {activeFile ? (
          <div className="flex flex-col items-center gap-2">
            {isPDF ? (
              <FileText className="h-10 w-10 text-red-600" />
            ) : (
              <Image className="h-10 w-10 text-blue-400" />
            )}
            <p className="text-sm font-medium text-gray-700">{activeFile.name}</p>
            <p className="text-xs text-green-400">File selected — click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-gray-100 p-3">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{isDragActive ? 'Drop file here' : label}</p>
              <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to {maxSize / 1024 / 1024}MB</p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
