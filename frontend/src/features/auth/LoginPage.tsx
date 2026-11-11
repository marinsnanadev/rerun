import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { errorMessage } from '../../api';
import { Button } from '../../components/Button';
import { Field, controlClassName } from '../../components/Field';
import { LoopMark } from '../../components/LoopMark';
import { useAuth } from './AuthContext';
import styles from './LoginPage.module.css';
import { RotationPreview } from './RotationPreview';

type Mode = 'signin' | 'signup';

const COPY = {
  signin: {
    heading: 'Sign in',
    submit: 'Sign in',
    pending: 'Signing in…',
    switchPrompt: 'New to Rerun?',
    switchAction: 'Create an account',
  },
  signup: {
    heading: 'Create your account',
    submit: 'Create account',
    pending: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in',
  },
} as const satisfies Record<Mode, object>;

export function LoginPage() {
  const { state, signIn, signUp } = useAuth();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const copy = COPY[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const credentials = { username: username.trim(), password };
      await (mode === 'signin' ? signIn(credentials) : signUp(credentials));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setPassword('');
    setError(null);
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <span className={styles.brand}>
          <LoopMark />
          Rerun
        </span>
        <h1 className={styles.headline}>Always know which series is next.</h1>
        <p className={styles.lede}>
          Keep the shows you love in a rotation. Log when you finish one, and the series
          you’ve gone longest without moves to the top.
        </p>
      </section>

      <div className={styles.preview}>
        <RotationPreview />
      </div>

      <section className={styles.card} aria-labelledby="auth-heading">
        <h2 id="auth-heading" className={styles.cardHeading}>
          {copy.heading}
        </h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Username">
            {(control) => (
              <input
                {...control}
                className={controlClassName}
                name="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            )}
          </Field>

          <Field
            label="Password"
            hint={mode === 'signup' ? 'Use at least 8 characters.' : undefined}
          >
            {(control) => (
              <input
                {...control}
                className={controlClassName}
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={mode === 'signup' ? 8 : undefined}
                required
              />
            )}
          </Field>

          {error && (
            <p className={styles.alert} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" busy={pending}>
            {pending ? copy.pending : copy.submit}
          </Button>
        </form>

        <p className={styles.switch}>
          {copy.switchPrompt}{' '}
          <button type="button" className={styles.switchButton} onClick={switchMode}>
            {copy.switchAction}
          </button>
        </p>
      </section>
    </main>
  );
}
