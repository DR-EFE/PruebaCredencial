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
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Cargar datos del profesor
        loadProfesor(session.user.id);
      } else {
        setLoading(false);
        setStoreLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadProfesor(session.user.id);
      } else {
        setProfesor(null);
        setLoading(false);
        setStoreLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfesor = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profesores')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfesor(data);
    } catch (error) {
      console.error('Error loading profesor:', error);
      setProfesor(null);
    } finally {
      setLoading(false);
      setStoreLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
