import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles the Supabase PKCE auth callback for email verification and OAuth flows.
 * Supabase appends ?code= to this URL; we exchange it for a session and redirect
 * the user to `?next=` (defaulting to the home page).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // next may be a relative path ("/") or a cross-subdomain absolute URL
      // (e.g. "https://marketplace.worldwideview.dev/plugins/xyz"). Both are
      // intentional — the signup form already validated the value.
      const redirectTarget = next.startsWith('/') ? `${origin}${next}` : next
      return NextResponse.redirect(redirectTarget)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
