import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

export function useAuth() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    if (user && !user.guest) await supabase.auth.signOut();
    setUser(null);
  }, [user]);

  const isGuest = user?.guest ?? false;

  return { user, setUser, signOut, isGuest };
}
