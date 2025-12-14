import React, { useEffect, useState } from 'react';
import { AppView, UserProfile, AppTheme } from '../types';
import { Table2, PieChart, ShieldCheck, Users, Receipt, Shield, Github, Crown, Star, Clock, ChevronRight, UserCog } from 'lucide-react';
import * as DB from '../services/db';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  userProfile: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, userProfile }) => {
  const [theme, setTheme] = useState<AppTheme>(DB.DEFAULT_THEME);
  
  // Load Theme on Mount
  useEffect(() => {
      DB.getAppTheme().then(setTheme);
  }, []);

  // Determine current theme colors based on user status
  const currentTheme = React.useMemo(() => {
      if (!userProfile) return theme.trial;
      
      if (userProfile.role === 'admin') return theme.admin;
      if (userProfile.subscription_status === 'elite') return theme.elite;
      if (userProfile.subscription_status === 'pro') return theme.pro;
      return theme.trial;
  }, [userProfile, theme]);

  const menuItems = [
    { id: AppView.TIMESHEET, label: 'Registro Ore', icon: Table2 },
    { id: AppView.CLIENTS, label: 'Registro Progetti', icon: Users },
    { id: AppView.BILLING, label: 'Riepilogo', icon: Receipt },
    { id: AppView.REPORTS, label: 'Statistiche', icon: PieChart },
    { id: AppView.SETTINGS, label: 'Il mio Profilo', icon: UserCog },
  ];

  if (userProfile?.role === 'admin') {
      menuItems.push({ id: AppView.ADMIN_PANEL, label: 'Admin Panel', icon: Shield });
  }

  const getDaysLeft = () => {
      if (!userProfile || !userProfile.trial_ends_at) return 0;
      const endDate = new Date(userProfile.trial_ends_at).getTime();
      const now = Date.now();
      return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  };
  const daysLeft = getDaysLeft();

  const renderUserStatus = () => {
      if (!userProfile) return null;
      
      // Style text based on theme for consistency (simplified white/light for dark backgrounds)
      const textColor = 'text-white/80';

      if (userProfile.subscription_status === 'elite') {
          return (
              <div className="flex items-center gap-2 mt-1" style={{ color: currentTheme.accentColor }}>
                  <Crown size={14} fill="currentColor" />
                  <span className="text-xs font-bold uppercase tracking-wider">Elite Member</span>
              </div>
          );
      }
      
      if (userProfile.subscription_status === 'pro') {
          const renewDate = new Date(userProfile.trial_ends_at).toLocaleDateString('it-IT');
          const isAutoRenew = userProfile.auto_renew !== false; 
          
          return (
              <div className="mt-1">
                  <div className="flex items-center gap-2" style={{ color: currentTheme.accentColor }}>
                      <Star size={14} fill="currentColor" />
                      <span className="text-xs font-bold uppercase tracking-wider">Pro Plan</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isAutoRenew ? textColor : 'text-amber-500 font-medium'}`}>
                      {daysLeft < 0 
                        ? 'Scaduto' 
                        : (isAutoRenew ? `Rinnovo: ${renewDate}` : `Scadenza: ${renewDate}`)
                      }
                  </div>
              </div>
          );
      }

      const isExpired = daysLeft < 0;
      return (
          <div className="mt-1">
             <div className={`flex items-center gap-2 ${isExpired ? 'text-red-400' : ''}`} style={!isExpired ? { color: currentTheme.accentColor } : {}}>
                  <Clock size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Trial</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${isExpired ? 'text-red-500 font-bold' : textColor}`}>
                  {isExpired ? `Scaduto da ${Math.abs(daysLeft)} gg` : `${daysLeft} giorni rimanenti`}
              </div>
          </div>
      );
  };

  return (
    <aside 
        className="w-20 lg:w-72 flex flex-col h-full transition-all duration-300 shadow-xl z-20 print:hidden relative overflow-hidden"
        style={{ backgroundColor: currentTheme.sidebarBg }}
    >
      {/* Background Accent Top */}
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${currentTheme.activeBg}, ${currentTheme.accentColor})` }}></div>
      
      {/* Header */}
      <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${currentTheme.accentColor}20` }}>
            <ShieldCheck className="w-8 h-8" style={{ color: currentTheme.accentColor }} />
        </div>
        <div className="hidden lg:block ml-3 overflow-hidden">
            <span className="font-bold text-xl tracking-tight block leading-none truncate text-white">Cronosheet</span>
            <span className="text-[10px] uppercase tracking-widest font-semibold block" style={{ color: currentTheme.itemColor }}>SaaS Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto custom-scrollbar">
        <p className="hidden lg:block px-4 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: currentTheme.itemColor, opacity: 0.7 }}>Menu</p>
        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className="w-full flex items-center justify-center lg:justify-start lg:px-4 py-3.5 rounded-xl transition-all group relative"
              style={{
                  backgroundColor: isActive ? currentTheme.activeBg : 'transparent',
                  color: isActive ? currentTheme.activeText : currentTheme.itemColor
              }}
              onMouseEnter={(e) => {
                  if(!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#fff';
                  }
              }}
              onMouseLeave={(e) => {
                  if(!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = currentTheme.itemColor;
                  }
              }}
            >
              <item.icon 
                className="w-5 h-5 transition-colors" 
                style={{ color: isActive ? currentTheme.activeText : (undefined) }} // Let inherits or specific
              />
              <span className="hidden lg:block ml-3 font-medium text-sm">{item.label}</span>
              
              {isActive && (
                 <ChevronRight className="hidden lg:block ml-auto w-4 h-4 opacity-50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info Card */}
      <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
        
        <div className="rounded-xl p-4 hidden lg:block border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group cursor-default">
            <div className="flex items-center gap-3 mb-3">
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner border border-white/20 text-white"
                    style={{ backgroundColor: userProfile?.role === 'admin' ? currentTheme.activeBg : 'rgba(255,255,255,0.1)' }}
                >
                    {userProfile?.email.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate w-32" title={userProfile?.email}>
                        {userProfile?.email.split('@')[0]}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${userProfile?.role === 'admin' ? 'animate-pulse' : ''}`} style={{ backgroundColor: currentTheme.accentColor }}></div>
                        <p className="text-xs capitalize" style={{ color: currentTheme.itemColor }}>{userProfile?.role || 'User'}</p>
                    </div>
                </div>
            </div>
            <div className="rounded-lg p-3 border border-white/5 bg-black/20">
                {renderUserStatus()}
            </div>
        </div>

        {/* Mobile Icon */}
        <div className="lg:hidden flex flex-col items-center gap-4">
             <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: currentTheme.activeBg }}
             >
                {userProfile?.email.charAt(0).toUpperCase()}
             </div>
        </div>
        
        <div className="flex flex-col gap-2">
            <div className="flex justify-center lg:justify-between items-center px-1">
                <p className="hidden lg:block text-[10px]" style={{ color: currentTheme.itemColor }}>v2.6.0</p>
                <a 
                    href="https://github.com/Riccardoengin01/Cronosheet" 
                    target="_blank" 
                    rel="noreferrer"
                    className="transition-colors hover:text-white"
                    style={{ color: currentTheme.itemColor }}
                >
                    <Github size={16} />
                </a>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;