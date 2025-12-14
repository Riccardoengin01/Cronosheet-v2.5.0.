import React from 'react';
import { AppView, UserProfile } from '../types';
import { Table2, PieChart, ShieldCheck, Users, Receipt, Shield, Github, Crown, Star, Clock, ChevronRight, UserCog } from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  userProfile: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, userProfile }) => {
  const menuItems = [
    { id: AppView.TIMESHEET, label: 'Registro', icon: Table2 },
    { id: AppView.CLIENTS, label: 'Clienti', icon: Users },
    { id: AppView.BILLING, label: 'Riepilogo', icon: Receipt },
    { id: AppView.REPORTS, label: 'Statistiche', icon: PieChart },
    { id: AppView.SETTINGS, label: 'Il mio Profilo', icon: UserCog },
  ];

  if (userProfile?.role === 'admin') {
      menuItems.push({ id: AppView.ADMIN_PANEL, label: 'Admin Panel', icon: Shield });
  }

  // Helper per calcolare giorni rimanenti REALI dal DB
  const getDaysLeft = () => {
      if (!userProfile || !userProfile.trial_ends_at) return 0;
      
      const endDate = new Date(userProfile.trial_ends_at).getTime();
      const now = Date.now();
      
      return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysLeft();

  const renderUserStatus = () => {
      if (!userProfile) return null;

      // ELITE: Nessuna scadenza, nessuna data mostrata
      if (userProfile.subscription_status === 'elite') {
          return (
              <div className="flex items-center gap-2 text-amber-400 mt-1">
                  <Crown size={14} fill="currentColor" />
                  <span className="text-xs font-bold uppercase tracking-wider">Elite Member</span>
              </div>
          );
      }
      
      // PRO: Mostra data rinnovo o giorni se in scadenza
      if (userProfile.subscription_status === 'pro') {
          const renewDate = new Date(userProfile.trial_ends_at).toLocaleDateString('it-IT');
          // Default to true if undefined
          const isAutoRenew = userProfile.auto_renew !== false; 
          
          return (
              <div className="mt-1">
                  <div className="flex items-center gap-2 text-indigo-400">
                      <Star size={14} fill="currentColor" />
                      <span className="text-xs font-bold uppercase tracking-wider">Pro Plan</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isAutoRenew ? 'text-slate-400' : 'text-amber-500 font-medium'}`}>
                      {daysLeft < 0 
                        ? 'Scaduto' 
                        : (isAutoRenew ? `Rinnovo: ${renewDate}` : `Scadenza: ${renewDate}`)
                      }
                  </div>
              </div>
          );
      }

      // TRIAL: Mostra conteggio giorni su 60
      const isExpired = daysLeft < 0;
      return (
          <div className="mt-1">
             <div className={`flex items-center gap-2 ${isExpired ? 'text-red-400' : 'text-blue-400'}`}>
                  <Clock size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Trial</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${isExpired ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                  {isExpired ? `Scaduto da ${Math.abs(daysLeft)} gg` : `${daysLeft} giorni rimanenti`}
              </div>
          </div>
      );
  };

  return (
    <aside className="w-20 lg:w-72 bg-slate-900 text-white flex flex-col h-full transition-all duration-300 shadow-xl z-20 print:hidden relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      {/* Header */}
      <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-indigo-500/10 p-2 rounded-lg shrink-0">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="hidden lg:block ml-3 overflow-hidden">
            <span className="font-bold text-xl tracking-tight block leading-none truncate">Cronosheet</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">SaaS Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto custom-scrollbar">
        <p className="hidden lg:block px-4 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Menu</p>
        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center justify-center lg:justify-start lg:px-4 py-3.5 rounded-xl transition-all group relative ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400 transition-colors'}`} />
              <span className="hidden lg:block ml-3 font-medium text-sm">{item.label}</span>
              
              {isActive && (
                 <ChevronRight className="hidden lg:block ml-auto w-4 h-4 opacity-50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info Card (Bottom) */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 space-y-3">
        
        {/* User Card */}
        <div className="bg-slate-800/40 rounded-xl p-4 hidden lg:block border border-slate-700/30 hover:border-slate-600 transition-colors group cursor-default">
            {/* User Profile Header */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner border border-slate-600 ${userProfile?.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {userProfile?.email.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate w-32" title={userProfile?.email}>
                        {userProfile?.email.split('@')[0]}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${userProfile?.role === 'admin' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
                        <p className="text-xs text-slate-400 capitalize">{userProfile?.role || 'User'}</p>
                    </div>
                </div>
            </div>
            {/* Plan Info Details */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                {renderUserStatus()}
            </div>
        </div>

        {/* Mobile Icon Only View */}
        <div className="lg:hidden flex flex-col items-center gap-4">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${userProfile?.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {userProfile?.email.charAt(0).toUpperCase()}
             </div>
        </div>
        
        {/* Footer Links & Copyright */}
        <div className="flex flex-col gap-2">
            <div className="flex justify-center lg:justify-between items-center px-1">
                <p className="hidden lg:block text-[10px] text-slate-600">v2.5.0</p>
                <a 
                    href="https://github.com/Riccardoengin01/Cronosheet" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-slate-600 hover:text-white transition-colors"
                    title="GitHub Repo"
                >
                    <Github size={16} />
                </a>
            </div>
            <div className="hidden lg:block text-center border-t border-slate-800 pt-2 mt-1">
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                    © Ing. Riccardo Righini<br/>All rights reserved
                </p>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;