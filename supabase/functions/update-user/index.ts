import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, name, email, password, role, club_id, username } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Update auth credentials (email and/or password) if provided
    const authUpdate: Record<string, string> = {}
    if (email)    authUpdate.email    = email
    if (password) authUpdate.password = password

    if (Object.keys(authUpdate).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(userId, authUpdate)
      if (error) throw error
    }

    // Update profile fields
    const profileUpdate: Record<string, unknown> = {}
    if (name     !== undefined) profileUpdate.name     = name
    if (email    !== undefined) profileUpdate.email    = email
    if (role     !== undefined) profileUpdate.role     = role
    if (username !== undefined) profileUpdate.username = username || null
    if (club_id  !== undefined) {
      profileUpdate.club_id = role === 'super_admin' ? null : (club_id || null)
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await admin.from('profiles').update(profileUpdate).eq('id', userId)
      if (error) throw error
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
