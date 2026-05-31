import React, { useState } from 'react';
import {
  MetralyBadge,
  MetralyButton,
  MetralyCodeBlock,
  MetralyIcon,
  MetralyInput,
  MetralyLogo,
  MetralyPanel,
  MetralySegmentedControl,
} from '../../design-system';

type LoginScreenProps = {
  onSignIn: (email: string, password: string) => Promise<void>;
};

type AuthMethod = 'local' | 'sso';

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const [method, setMethod] = useState<AuthMethod>('local');
  const [email, setEmail] = useState('admin@metraly.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSignIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(circle at top, color-mix(in oklab, var(--m-cyan-500) 8%, transparent), transparent 32%), var(--m-bg-0)',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(12px, 4vw, 24px)',
        overflowX: 'hidden',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ width: 'min(100%, 430px)', display: 'grid', gap: 12 }}
        noValidate
      >
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gap: 8,
            justifyItems: 'center',
            textAlign: 'center',
          }}
        >
          <MetralyLogo variant="mark" />
          <div
            style={{
              color: 'var(--m-fg-0)',
              fontSize: 'var(--m-fs-16)',
              fontWeight: 600,
            }}
          >
            Sign in to Metraly
          </div>
          <div
            style={{
              color: 'var(--m-fg-3)',
              maxWidth: 340,
              fontSize: 'var(--m-fs-11)',
              lineHeight: 1.4,
            }}
          >
            Engineering metrics · self-hosted
          </div>
        </div>

        {/* Card */}
        <MetralyPanel padding="md">
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            {/* Panel header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--m-fg-0)',
                    fontSize: 'var(--m-fs-12)',
                    fontWeight: 600,
                  }}
                >
                  Workspace login
                </div>
                <div
                  style={{
                    color: 'var(--m-fg-3)',
                    fontFamily: 'var(--m-font-mono)',
                    fontSize: 'var(--m-fs-9)',
                  }}
                >
                  Operators and engineering leads
                </div>
              </div>
              <MetralyBadge variant={error ? 'warning' : 'success'}>
                {error ? 'attention' : 'live instance'}
              </MetralyBadge>
            </div>

            {/* Method switcher */}
            <MetralySegmentedControl
              ariaLabel="Authentication method"
              fullWidth
              value={method}
              onValueChange={(v) => setMethod(v as AuthMethod)}
              options={[
                { value: 'local', label: 'Workspace account' },
                { value: 'sso', label: 'SSO' },
              ]}
            />

            {/* SSO path */}
            {method === 'sso' ? (
              <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                <MetralyButton
                  variant="primary"
                  fullWidth
                  iconLeft={<MetralyIcon name="lock" size="sm" />}
                  loading={loading}
                  type="submit"
                >
                  Continue with SSO
                </MetralyButton>
                <div
                  style={{
                    color: 'var(--m-fg-3)',
                    fontSize: 'var(--m-fs-10)',
                    lineHeight: 1.45,
                  }}
                >
                  Redirects to the configured identity provider for this workspace.
                </div>
              </div>
            ) : (
              /* Local account path */
              <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                <MetralyInput
                  fullWidth
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="ops@metraly.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  iconLeft={<MetralyIcon name="user" size="sm" />}
                  error={error ? 'No workspace account exists for this email' : undefined}
                />
                <MetralyInput
                  fullWidth
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  iconLeft={<MetralyIcon name="lock" size="sm" />}
                  error={error ? error : undefined}
                  description={
                    !error
                      ? 'Demo: admin@metraly.local / admin123'
                      : undefined
                  }
                />

                <MetralyButton
                  variant="primary"
                  fullWidth
                  loading={loading}
                  type="submit"
                >
                  Sign in
                </MetralyButton>
              </div>
            )}

            {/* Bootstrap CLI block */}
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <div
                style={{
                  color: 'var(--m-fg-2)',
                  fontSize: 'var(--m-fs-10)',
                  fontWeight: 500,
                }}
              >
                Self-host bootstrap
              </div>
              <MetralyCodeBlock accent="primary">{`npx @metraly/bootstrap login \
  --workspace acme-core \
  --env production`}</MetralyCodeBlock>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                paddingTop: 2,
              }}
            >
              <MetralyButton variant="neutral" size="sm" type="button">
                Forgot password
              </MetralyButton>
              <div
                style={{
                  color: 'var(--m-fg-3)',
                  fontSize: 'var(--m-fs-10)',
                  lineHeight: 1.4,
                }}
              >
                Need help? Contact your workspace operator.
              </div>
            </div>
          </div>
        </MetralyPanel>
      </form>
    </div>
  );
}
