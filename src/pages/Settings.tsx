import React, { useEffect, useState } from 'react';
import { db, getDbMode, setDbMode } from '../db/dbClient';
import { isSupabaseConfigured } from '../db/adapters/supabaseAdapter';
import { Profile, Category, Expense, RecurringExpense } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Settings as SettingsIcon, 
  ToggleLeft, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Database, 
  Sliders, 
  ShieldAlert, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();
  
  // Data lists
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);

  // DB Mode state
  const [currentDbMode, setCurrentDbMode] = useState<'Local Sandbox' | 'Supabase DB'>(() => getDbMode());
  const [syncing, setSyncing] = useState(false);

  const handleResyncStats = async () => {
    setSyncing(true);
    try {
      for (const cat of categories) {
        await db.recalculateCategoryStats(cat.id);
      }
      alert('All category balances and spent amounts have been successfully resynced!');
      await loadSettingsData();
    } catch (err: any) {
      alert(err.message || 'Failed to sync database stats.');
    } finally {
      setSyncing(false);
    }
  };

  // Form modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form Fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'Admin' | 'Accountant'>('Accountant');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettingsData = async () => {
    try {
      const users = await db.getProfiles();
      const cats = await db.getCategories(true);
      const exps = await db.getExpenses();
      const rec = await db.getRecurringExpenses();

      setProfiles(users);
      setCategories(cats);
      setExpenses(exps);
      setRecurring(rec);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!userName.trim() || !userEmail.trim()) {
      setErrorMsg('Please fill out all fields.');
      return;
    }

    try {
      if (editingUser) {
        // Update user
        await db.updateProfile(editingUser.id, {
          name: userName.trim(),
          email: userEmail.toLowerCase().trim(),
          role: userRole
        }, currentUser?.email || 'System');
      } else {
        // Create user
        await db.createProfile(
          userEmail.toLowerCase().trim(),
          userName.trim(),
          userRole,
          currentUser?.email || 'System'
        );
      }

      setUserModalOpen(false);
      resetUserForm();
      loadSettingsData();
      refreshUser();
    } catch (err: any) {
      setErrorMsg(err.message || 'User operation failed.');
    }
  };

  const startEditUser = (profile: Profile) => {
    setEditingUser(profile);
    setUserName(profile.name);
    setUserEmail(profile.email);
    setUserRole(profile.role);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email.toLowerCase() === currentUser?.email.toLowerCase()) {
      alert('Security Policy: You cannot delete your own active Admin account!');
      return;
    }
    if (!confirm(`Are you sure you want to delete user account "${email}"? This will invalidate their credentials immediately.`)) {
      return;
    }
    try {
      await db.deleteProfile(id, currentUser?.email || 'System');
      loadSettingsData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('Accountant');
    setErrorMsg(null);
  };

  const handleDbModeToggle = (mode: 'Local Sandbox' | 'Supabase DB') => {
    try {
      setDbMode(mode);
      setCurrentDbMode(mode);
    } catch (err: any) {
      alert(err.message || 'Could not change database mode.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. HEADER */}
      <div className="flex items-center gap-2 border-b border-white/8 pb-5">
        <SettingsIcon className="h-6 w-6 text-cyan-405 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
            System Settings
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Admin console: manage staff access permissions, configure database integrations, and inspect system integrity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: USER MANAGEMENT (Col Span 2) */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-405 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
              <h3 className="font-display font-bold text-white text-lg">Staff User Access</h3>
            </div>
            
            <button 
              onClick={() => { resetUserForm(); setUserModalOpen(true); }}
              className="py-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1 transition shadow-[0_0_10px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Member</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#121326]/60 text-slate-400 font-bold uppercase tracking-wider border-b border-white/8 text-[10px]">
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Role Authorization</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 font-semibold text-slate-300">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition duration-150">
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 text-slate-450">{p.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        p.role === 'Admin' 
                          ? 'bg-purple-950/45 border-purple-500/35 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.25)]' 
                          : 'bg-indigo-950/45 border-indigo-500/35 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                      }`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => startEditUser(p)}
                          className="p-1 hover:bg-white/5 text-slate-400 rounded transition cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteUser(p.id, p.email)}
                          disabled={p.email.toLowerCase() === currentUser?.email.toLowerCase()}
                          className="p-1 hover:bg-rose-950/20 text-rose-455 rounded transition disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: SYSTEM CONFIGS & DIAGNOSTICS */}
        <div className="space-y-6">
          
          {/* Card 1: Database Adapter Toggle */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/8 pb-3">
              <Database className="h-5 w-5 text-cyan-405 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
              <h3 className="font-display font-bold text-white text-base">Database Provider</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Flip between the local browser database sandbox or secure your production workflow on the live Supabase PostgreSQL server.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleDbModeToggle('Local Sandbox')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    currentDbMode === 'Local Sandbox'
                      ? 'border-cyan-500/50 bg-cyan-550/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold'
                      : 'border-white/8 hover:bg-white/5'
                  }`}
                >
                  <div className="text-left font-semibold">
                    <p className="text-xs text-slate-200 font-bold">Local Sandbox</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Runs in browser localStorage</p>
                  </div>
                  {currentDbMode === 'Local Sandbox' && (
                    <span className="h-2 w-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
                  )}
                </button>

                <button
                  onClick={() => handleDbModeToggle('Supabase DB')}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    currentDbMode === 'Supabase DB'
                      ? 'border-cyan-500/50 bg-cyan-550/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold'
                      : 'border-white/8 hover:bg-white/5'
                  }`}
                >
                  <div className="text-left font-semibold">
                    <p className="text-xs text-slate-205 font-bold">Supabase Production</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PostgreSQL server database</p>
                  </div>
                  {currentDbMode === 'Supabase DB' && (
                    <span className="h-2 w-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
                  )}
                </button>
              </div>

              {/* Supabase status block */}
              <div className="p-3.5 bg-[#121326]/30 rounded-xl border border-white/5 flex items-start gap-2.5 text-xs text-slate-400 font-semibold">
                <Info className="h-4.5 w-4.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-white">Supabase Connection status:</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isSupabaseConfigured() ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold text-[10px] uppercase">Configured</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                        <span className="text-amber-500 font-extrabold text-[10px] uppercase">Keys Missing (.env)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Card 2: Diagnostics Summary */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/8 pb-3">
              <Sliders className="h-5 w-5 text-cyan-405 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
              <h3 className="font-display font-bold text-white text-base">Database Diagnostics</h3>
            </div>

            <div className="space-y-3 text-xs font-semibold text-slate-400">
              <div className="flex justify-between p-2.5 bg-[#121326]/30 border border-white/5 rounded-xl">
                <span>Active Categories</span>
                <span className="text-white font-extrabold">{categories.filter(c => !c.is_archived).length} cards</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#121326]/30 border border-white/5 rounded-xl">
                <span>Archived Categories</span>
                <span className="text-white font-extrabold">{categories.filter(c => c.is_archived).length} cards</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#121326]/30 border border-white/5 rounded-xl">
                <span>Expenses Recorded</span>
                <span className="text-white font-extrabold">{expenses.length} logs</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#121326]/30 border border-white/5 rounded-xl">
                <span>Active Recurring Tasks</span>
                <span className="text-white font-extrabold">{recurring.length} jobs</span>
              </div>
            </div>

            <button
              onClick={handleResyncStats}
              disabled={syncing}
              className="w-full py-2.5 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
            >
              <span>{syncing ? 'Resyncing database...' : 'Recalculate Category Stats'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* ==================== USER MODAL ==================== */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setUserModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-sm p-6 relative shadow-2xl z-10">
            <h3 className="font-display font-bold text-white text-lg border-b border-white/8 pb-3 text-left">
              {editingUser ? 'Edit Staff Profile' : 'Register Staff Account'}
            </h3>

            <form onSubmit={handleUserSubmit} className="mt-4 space-y-4 text-left">
              {errorMsg && <p className="text-xs text-rose-500 font-bold">{errorMsg}</p>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Muhammed Shamil"
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="shamil@zywo.in"
                  value={userEmail} 
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authorization Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'Admin' | 'Accountant')}
                  className="w-full px-3 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
                >
                  <option value="Accountant">Accountant (restricted settings)</option>
                  <option value="Admin">Admin (full database controls)</option>
                </select>
              </div>

              <div className="p-3 bg-[#121326]/40 rounded-xl text-[10px] text-indigo-300 font-semibold border border-white/5">
                Sandbox Mode Credential: registered users login using default password <strong className="text-white">"User@123"</strong>.
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setUserModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-white/8 text-slate-350 font-semibold text-xs hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs border border-white/10 hover:border-white/20 transition shadow-[0_0_10px_rgba(99,102,241,0.4)] cursor-pointer"
                >
                  {editingUser ? 'Save Updates' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Settings;
