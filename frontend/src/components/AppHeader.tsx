import { useAuth } from '../features/auth/AuthContext';
import { Button } from './Button';
import styles from './AppHeader.module.css';
import { LoopMark } from './LoopMark';

export function AppHeader() {
  const { state, signOut } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.brand}>
          <LoopMark />
          Rerun
        </span>
        {state.status === 'authenticated' && (
          <div className={styles.account}>
            <span className={styles.username}>{state.user.username}</span>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
