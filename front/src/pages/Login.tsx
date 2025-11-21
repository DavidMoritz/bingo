import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import { useNavigate } from '@tanstack/react-router'

export function LoginPage() {
  const navigate = useNavigate()
  const { user } = useAuthenticator((context) => [context.user])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
      <header className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">Account</p>
        <h2 className="text-2xl font-bold text-white">Sign in</h2>
        <p className="text-sm text-slate-300">Use Google or email/password to create a profile and save your boards.</p>
      </header>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <Authenticator
          loginMechanisms={['email']}
          socialProviders={['google']}
          hideSignUp={false}
          variation="modal"
        />
        {user ? (
          <p className="mt-3 text-xs text-teal-200">
            Signed in as {user?.signInDetails?.loginId ?? user?.username}.{' '}
            <button
              className="text-teal-300 underline"
              onClick={() => navigate({ to: '/' })}
            >
              Back home
            </button>
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default LoginPage
