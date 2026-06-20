import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../db/dbClient';
import { Notification } from '../types';
import { 
  LayoutDashboard, 
  FolderLock, 
  Receipt, 
  BookOpen, 
  FileText, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Bell, 
  Menu, 
  X, 
  Plus, 
  LogOut, 
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Calendar,
  Globe
} from 'lucide-react';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
  onOpenQuickTransaction: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children, onOpenQuickTransaction }) => {
  const { user, logout, dbMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await db.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 8 seconds for a lively experience
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await db.markNotificationAsRead(id);
    fetchNotifications();
  };

  const handleClearNotifications = async () => {
    await db.clearAllNotifications();
    fetchNotifications();
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Accountant'] },
    { id: 'categories', label: 'Categories', icon: FolderLock, roles: ['Admin', 'Accountant'] },
    { id: 'expenses', label: 'Expenses', icon: Receipt, roles: ['Admin', 'Accountant'] },
    { id: 'ledger', label: 'Ledger', icon: BookOpen, roles: ['Admin', 'Accountant'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['Admin', 'Accountant'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['Admin'] }, // Admin only
  ];

  const visibleNavItems = navigationItems.filter(item => user && item.roles.includes(user.role));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-[#05050d] text-slate-100 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient backdrop glow blobs to enhance glassmorphism depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/12 blur-[130px] pointer-events-none" />
      <div className="absolute top-[25%] left-[60%] w-[45%] h-[45%] rounded-full bg-pink-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/8 blur-[110px] pointer-events-none" />

      {/* 1. DESKTOP SIDEBAR - Liquid Glass Panels */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 bg-[#0a0b16]/40 backdrop-blur-[24px] border-r border-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.5)] z-30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <span className="font-display font-extrabold text-xl text-shadow-[0_0_8px_rgba(255,255,255,0.5)]">F</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg leading-tight">Fund Manager</h2>
              <span className="text-[10px] font-extrabold text-cyan-400 tracking-wider uppercase drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">Institutional</span>
            </div>
          </div>
        </div>

        {/* Sidebar "+ New Transaction" Button */}
        <div className="p-4">
          <button 
            onClick={onOpenQuickTransaction}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_22px_rgba(6,182,212,0.6)] border border-white/10 hover:border-white/20 transition-all duration-150 transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>New Transaction</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-xl font-medium text-sm transition-all duration-150 group cursor-pointer ${
                  isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Help Center & Logout */}
        <div className="p-4 border-t border-white/8 space-y-1">
          <a 
            href="#help" 
            onClick={(e) => { e.preventDefault(); alert("Help Center: Documentation is available in schema.sql and locally. Contact support@zywo.in for enterprise configurations."); }}
            className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-250 font-medium text-sm transition-all"
          >
            <HelpCircle className="h-5 w-5 text-slate-500" />
            <span>Help Center</span>
          </a>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 py-2 px-4 rounded-xl text-rose-450 hover:bg-rose-950/20 font-medium text-sm transition-all cursor-pointer"
          >
            <LogOut className="h-5 w-5 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WINDOW CONTAINER */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 z-10">
        
        {/* HEADER PANEL - Liquid Glass */}
        <header className="sticky top-0 bg-[#0a0b16]/30 backdrop-blur-[24px] border-b border-white/8 h-16 flex items-center justify-between px-4 sm:px-6 z-20 transition-colors">
          
          {/* Mobile hamburger menu, brand logo, search */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-white/5 transition cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Mobile Title */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <span className="font-display font-extrabold text-sm">F</span>
              </div>
              <span className="font-display font-bold text-white text-sm">Fund Manager</span>
            </div>

            {/* Diagnostics Sync Indicator (Sandbox vs Supabase) */}
            <div className="hidden sm:flex items-center gap-2 bg-[#121324]/40 px-3 py-1 rounded-full text-xs font-semibold text-slate-350 border border-white/5">
              <span className={`h-2 w-2 rounded-full ${dbMode === 'Supabase DB' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'}`} />
              <span>{dbMode}</span>
            </div>
          </div>

          {/* Action buttons (Notification, User Profile) */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Notification Bell */}
            <button 
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-xl text-slate-305 hover:bg-white/5 transition duration-150 cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 bg-rose-550 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-white/8" />

            {/* User Profile avatar bubble */}
            <div className="flex items-center gap-3 pl-1">
              <div className="h-9 w-9 rounded-full bg-indigo-950/40 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/20">
                {user ? getInitials(user.name) : 'FM'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT WRAPPER */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {children}
          {/* Spacer to prevent mobile content cut off by the bottom bar (positioned correctly inside main) */}
          <div className="h-20 lg:hidden" />
        </main>
      </div>

      {/* 3. MOBILE MENU SLIDE-OUT DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop mask */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Drawer sheet - Liquid Glass */}
          <div className="relative flex flex-col w-72 max-w-xs bg-[#0a0b16]/75 backdrop-blur-[24px] h-full p-5 border-r border-white/8 shadow-2xl z-10 transition-transform">
            <div className="flex items-center justify-between pb-5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <span className="font-display font-extrabold text-sm">F</span>
                </div>
                <span className="font-display font-bold text-white text-base">Fund Manager</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick action button inside mobile drawer */}
            <div className="my-4">
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickTransaction();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Transaction</span>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition group cursor-pointer border ${
                      isActive 
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                        : 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-205'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-slate-500 group-hover:text-slate-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom logout */}
            <div className="pt-4 border-t border-white/8">
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-950/20 rounded-xl mb-4 border border-white/5">
                <div className="h-8 w-8 rounded-full bg-indigo-950/40 text-indigo-350 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                  {user ? getInitials(user.name) : 'FM'}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">{user?.role}</p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-rose-450 hover:bg-rose-950/20 font-medium text-sm transition cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. NOTIFICATIONS SLIDE-OUT PANEL */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop mask */}
          <div 
            onClick={() => setNotificationsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Notifications sheet - Liquid Glass */}
          <div className="relative w-full max-w-md bg-[#0a0b16]/75 backdrop-blur-[24px] h-full p-6 shadow-2xl flex flex-col z-10 border-l border-white/8 transition-transform">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
                <h3 className="font-display font-bold text-white text-lg">Alert Notification Center</h3>
              </div>
              <button 
                onClick={() => setNotificationsOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Alert List scrollable container */}
            <div className="flex-1 overflow-y-auto my-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Bell className="h-8 w-8 stroke-1 text-slate-600" />
                  <p className="text-sm font-semibold">Your alert feed is clean</p>
                  <p className="text-xs text-slate-600 text-center">We will warn you here of budget events.</p>
                </div>
              ) : (
                notifications.map(item => {
                  const isLow = item.type === 'low_balance';
                  const isNegative = item.type === 'negative_balance';
                  const isLarge = item.type === 'large_expense';
                  const isNewFunds = item.type === 'new_funds';

                  let bgStyle = 'bg-[#121326]/30 border border-white/5';
                  let icon = <Bell className="h-5 w-5 text-indigo-400" />;

                  if (isNegative) {
                     bgStyle = 'bg-rose-950/20 border border-rose-900/30 border-l-4 border-l-rose-500';
                     icon = <AlertTriangle className="h-5 w-5 text-rose-455" />;
                  } else if (isLow) {
                     bgStyle = 'bg-amber-950/20 border border-amber-900/30 border-l-4 border-l-amber-500';
                     icon = <AlertTriangle className="h-5 w-5 text-amber-455" />;
                  } else if (isLarge) {
                     bgStyle = 'bg-purple-950/20 border border-purple-900/30 border-l-4 border-l-purple-500';
                     icon = <ArrowUpRight className="h-5 w-5 text-purple-455" />;
                  } else if (isNewFunds) {
                     bgStyle = 'bg-emerald-950/20 border border-emerald-900/30 border-l-4 border-l-emerald-500';
                     icon = <ArrowDownLeft className="h-5 w-5 text-emerald-455" />;
                  } else if (item.type === 'recurring_generated') {
                     bgStyle = 'bg-blue-950/20 border border-blue-900/30 border-l-4 border-l-blue-500';
                     icon = <Calendar className="h-5 w-5 text-blue-455" />;
                  }

                  return (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-xl relative transition-all ${bgStyle} ${item.read ? 'opacity-50' : 'opacity-100'}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{icon}</div>
                        <div className="flex-1 pr-6">
                          <p className="text-xs font-semibold text-slate-200 leading-normal">{item.message}</p>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {!item.read && (
                        <button 
                          onClick={() => handleMarkAsRead(item.id)}
                          className="absolute top-3 right-3 text-[10px] font-bold text-cyan-400 hover:underline transition cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Clear All drawer footer */}
            {notifications.length > 0 && (
              <div className="pt-4 border-t border-white/8">
                <button 
                  onClick={handleClearNotifications}
                  className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-sm rounded-xl transition border border-white/5 cursor-pointer"
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BOTTOM MOBILE NAVIGATION BAR (Optimized 5-Tab Layout) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0b16]/65 backdrop-blur-[24px] border-t border-white/8 flex items-center justify-around z-30 px-2 transition-colors shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        {/* Left Side Tabs */}
        {(() => {
          const mobileBarItems = visibleNavItems.filter(item => 
            ['dashboard', 'categories', 'expenses', 'reports'].includes(item.id)
          );
          
          return (
            <>
              {mobileBarItems.slice(0, 2).map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer ${
                      isActive ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-0.5">{item.label}</span>
                  </button>
                );
              })}

              {/* Center Menu Action Button */}
              <button 
                onClick={onOpenQuickTransaction}
                className="h-10 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.5)] transform active:scale-90 transition cursor-pointer border border-white/10"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Right Side Tabs */}
              {mobileBarItems.slice(2, 4).map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer ${
                      isActive ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-0.5">{item.label}</span>
                  </button>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );
};
export default Layout;
