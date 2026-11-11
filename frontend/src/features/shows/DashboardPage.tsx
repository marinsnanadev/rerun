import { AppHeader } from '../../components/AppHeader';

/** Placeholder until the rotation screen lands. */
export function DashboardPage() {
  return (
    <>
      <AppHeader />
      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: 'var(--space-6) var(--space-5)' }}>
        <h1>Your rotation</h1>
        <p style={{ color: 'var(--ink-muted)', marginTop: 'var(--space-2)' }}>
          Your series will appear here.
        </p>
      </main>
    </>
  );
}
