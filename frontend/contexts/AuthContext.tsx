import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser, setProfesor, setLoading: setStoreLoading } = useAuthStore();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfesor(session.user.id, session);
      }
      setLoading(false);
      setStoreLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfesor(session.user.id, session);
      } else {
        setProfesor(null);
      }
      setLoading(false);
      setStoreLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadProfesor = async (userId: string, session: Session | null) => {
    if (!session) return;

    try {
      const { data: profesor, error } = await supabase
        .from('profesores')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newProfesor, error: insertError } = await supabase
          .from('profesores')
          .insert({
            id: userId,
            nombre: session.user.user_metadata.nombre,
            apellido: session.user.user_metadata.apellido,
            verified: !!session.user.email_confirmed_at,
          })
          .select('*')
          .single();

        if (insertError) throw insertError;
        setProfesor(newProfesor);
      } else if (profesor && session.user.email_confirmed_at && !profesor.verified) {
        const { data: updatedProfesor, error: updateError } = await supabase
          .from('profesores')
          .update({ verified: true })
          .eq('id', userId)
          .select('*')
          .single();

        if (updateError) throw updateError;
        setProfesor(updatedProfesor);
      } else {
        setProfesor(profesor);
      }
    } catch (err) {
      console.error('Error loading or updating professor:', err);
      setProfesor(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};