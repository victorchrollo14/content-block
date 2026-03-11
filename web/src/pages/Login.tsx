import { useAuth } from '../lib/auth';
import './Login.css';

export function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="login-container">
      <div className="login-backdrop" />
      <div className="login-shell">
        <aside className="login-media">
          <div className="login-image-fallback">Kaizen</div>
        </aside>
        <section className="login-panel">
          <span className="login-badge">Sign In</span>
          <h1 className="login-title">Kaizen</h1>
          <p className="login-subtitle">
            Anything that distracts is evil.<br />
            Destroy evil. Stay focused.
          </p>
          <button onClick={signInWithGoogle} className="login-btn">
            Continue with Google
          </button>
        </section>
      </div>
    </div>
  );
}
