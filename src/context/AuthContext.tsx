import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, ADMIN_EMAIL } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      setProfile(docSnap.exists() ? ({ uid, ...docSnap.data() } as UserProfile) : null);
    } catch (err) {
      console.error('Profile load failed:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        if (currentUser) {
          await fetchProfile(currentUser.uid);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  const isAdmin =
    (!!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) || profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, logout, refreshProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
