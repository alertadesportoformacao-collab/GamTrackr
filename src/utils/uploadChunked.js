import { supabase } from '../supabaseClient'

const CHUNK_SIZE = 6 * 1024 * 1024 // 6 MB

/**
 * Uploads a file to Supabase Storage using the TUS resumable protocol (appendChunk).
 * Returns the public URL of the uploaded file.
 */
export async function uploadChunked(bucket, path, file, onProgress) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  // Use the authenticated user's JWT so Storage RLS applies correctly
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  const b64 = (s) => btoa(unescape(encodeURIComponent(s)))

  // 1. Create TUS upload session
  const initRes = await fetch(`${supabaseUrl}/storage/v1/upload/resumable`, {
    method: 'POST',
    headers: {
      'Authorization':   `Bearer ${token}`,
      'Content-Length':  '0',
      'Upload-Length':   String(file.size),
      'Tus-Resumable':   '1.0.0',
      'Upload-Metadata': [
        `bucketName ${b64(bucket)}`,
        `objectName ${b64(path)}`,
        `contentType ${b64(file.type || 'application/octet-stream')}`,
        `cacheControl ${b64('3600')}`,
      ].join(','),
      'x-upsert': 'true',
    },
  })

  if (!initRes.ok) {
    const msg = await initRes.text()
    throw new Error(`Erro ao iniciar upload (${initRes.status}): ${msg}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) throw new Error('Supabase Storage não retornou URL de upload')

  // 2. Upload chunks (appendChunk)
  let offset = 0
  while (offset < file.size) {
    const end   = Math.min(offset + CHUNK_SIZE, file.size)
    const chunk = file.slice(offset, end)

    const patchRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization':  `Bearer ${token}`,
        'Content-Type':   'application/offset+octet-stream',
        'Content-Length': String(chunk.size),
        'Upload-Offset':  String(offset),
        'Tus-Resumable':  '1.0.0',
      },
      body: chunk,
    })

    if (!patchRes.ok) {
      const msg = await patchRes.text()
      throw new Error(`Erro ao enviar chunk (offset ${offset}): ${msg}`)
    }

    offset = parseInt(patchRes.headers.get('Upload-Offset') ?? String(end), 10)
    onProgress?.(Math.round((offset / file.size) * 100))
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
