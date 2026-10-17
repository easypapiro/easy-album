"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

type AuthState = { user: User | null; loading: boolean };

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: isFirebaseConfigured,
  });

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), (user) => setState({ user, loading: false }));
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {!isFirebaseConfigured && (
        <div role="alert" className="bg-heart px-4 py-2 text-center text-[13px] text-white">
          Firebase non è configurato: copia <code>.env.example</code> in <code>.env.local</code> e riavvia il server.
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Organizers sign in with email; guests are anonymous. */
export function isRegistered(user: User | null): user is User {
  return Boolean(user && !user.isAnonymous);
}
