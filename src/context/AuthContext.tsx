import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '../types';
import { db, getDbMode } from '../db/dbClient';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  dbMode: 'Local Sandbox' | 'Supabase DB';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Seeds in memory credentials for local verification
const LOCAL_CREDENTIALS: Record<string, { name: string; role: 'Admin' | 'Accountant'; pass: string }> = {
  'zywo.in@gmail.com': { name: 'System Admin', role: 'Admin', pass: 'Zywo@7575' },
  'muhammedshamil251@gmail.com': { name: 'Finance Accountant', role: 'Accountant', pass: 'Shamil@#23' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbMode] = useState<'Local Sandbox' | 'Supabase DB'>(() => getDbMode());

  const loadSession = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('fund_manager_session');
      if (stored) {
        const cachedUser = JSON.parse(stored) as Profile;
        setUser(cachedUser);

        // Run auto recurring expense calculations on check-in
        if (cachedUser.role === 'Admin') {
          await db.processRecurringExpenses(cachedUser.email);
        }
      }
    } catch (e) {
      console.error('Failed to restore authentication session:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const mode = getDbMode();
      
      if (mode === 'Local Sandbox') {
        const credentials = LOCAL_CREDENTIALS[email.toLowerCase().trim()];
        if (credentials && credentials.pass === password) {
          // Validated seeded accounts
          const profiles = await db.getProfiles();
          let profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase().trim());
          
          if (!profile) {
            // Re-seed dynamically just in case
            profile = await db.createProfile(
              email.toLowerCase().trim(), 
              credentials.name, 
              credentials.role, 
              'zywo.in@gmail.com'
            );
          }
          
          setUser(profile);
          localStorage.setItem('fund_manager_session', JSON.stringify(profile));

          // Run recurring expenses check-in for Admin
          if (profile.role === 'Admin') {
            await db.processRecurringExpenses(profile.email);
          }
          
          setLoading(false);
          return true;
        }

        // For non-seeded dynamically added users in sandbox settings
        const profiles = await db.getProfiles();
        const customProfile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase().trim());
        if (customProfile) {
          // If custom user, we let them login with a default password (e.g. User@123) for simple local sandbox testing!
          if (password === 'User@123' || password === 'admin123') {
            setUser(customProfile);
            localStorage.setItem('fund_manager_session', JSON.stringify(customProfile));
            setLoading(false);
            return true;
          }
        }
        
        throw new Error('Invalid email or password credentials.');
      } else {
        // Supabase DB Auth flow
        // In real Supabase, we log in using their Auth library:
        // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        // Since we are mocking connection, we fall back gracefully to checking profiles and authenticating
        const profiles = await db.getProfiles();
        const profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase().trim());
        
        if (profile) {
          // In real production, password is verified by Supabase Auth engine.
          // For demo integration, we verify against standard seed passwords
          const standardSeed = LOCAL_CREDENTIALS[email.toLowerCase().trim()];
          const isCorrectPass = standardSeed ? standardSeed.pass === password : (password === 'User@123' || password === 'admin123');
          
          if (isCorrectPass) {
            setUser(profile);
            localStorage.setItem('fund_manager_session', JSON.stringify(profile));
            setLoading(false);
            return true;
          }
        }
        throw new Error('Invalid credentials or account does not exist in Supabase.');
      }
    } catch (e: any) {
      setLoading(false);
      throw new Error(e.message || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fund_manager_session');
  };

  const refreshUser = async () => {
    if (!user) return;
    const profiles = await db.getProfiles();
    const updated = profiles.find(p => p.id === user.id);
    if (updated) {
      setUser(updated);
      localStorage.setItem('fund_manager_session', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, dbMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
