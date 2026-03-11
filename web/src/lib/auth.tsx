import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { insforge } from '../lib/insforge';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: {
    name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data } = await insforge.auth.getCurrentSession();
    if (data?.session) {
      setUser(data.session.user as User);
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: window.location.origin,
    });
  }

  async function signOut() {
    await insforge.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
