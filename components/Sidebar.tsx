
import React, { useEffect, useState } from 'react';
import { AppView, UserProfile, AppTheme } from '../types';
import { Table2, PieChart, ShieldCheck, Users, Receipt, Shield, Clock, ChevronRight, UserCog, Globe, Archive, Award, LayoutDashboard, Wallet } from 'lucide-react';
import * as DB from '../services/db';
import { useLanguage } from '../lib/i18n';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  userProfile: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, userProfile }) => {
  const [theme, setTheme] = useState<AppTheme>(DB.DEFAULT_THEME);
  const { t, language, setLanguage } = useLanguage();
  
  useEffect(() => {
      DB.getAppTheme().then(setTheme);
  }, []);

  const currentTheme = React.useMemo(() => {
      if (!userProfile) return theme.trial;
      if (userProfile.role === 'admin') return theme.admin;
      if (userProfile.subscription_status === 'elite') return theme.elite;
      if (userProfile.subscription_status === 'pro') return theme.pro;
      return theme.trial;
  }, [userProfile, theme]);

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.TIMESHEET, label: t('menu.timesheet'), icon: Table2 },
    { id: AppView.CLIENTS, label: 'Anagrafica & Ritmi', icon: Users },
    { id: AppView.EXPENSES, label: 'Spese Studio', icon: Wallet },
    { id: AppView.BILLING, label: t('menu.billing'), icon: Receipt },
    { id: AppView.ARCHIVE, label: t('billing.billed'), icon: Archive },
    { id: AppView.REPORTS, label: t('menu.reports'), icon: PieChart },
    { id: AppView.SECURE_TRAIN, label: t('menu.secure_train'), icon: Award },
    { id: AppView.SETTINGS, label: t('menu.profile'), icon: UserCog },
  ];

  if (userProfile?.role === 'admin') {
      menuItems.push({ id: AppView.ADMIN_PANEL, label: t('menu.admin'), icon: Shield });
  }

  const renderUserStatus = () => {
      if (!userProfile) return null;
      return (
          <div className="mt-1">
             <div className={`flex items-center gap-2 text-indigo-300`}>
                  <Shield size={10} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{userProfile.subscription_status}</span>
              </div>
          </div>
      );
  };

  return (
    <aside className="w-16 lg:w-64 flex flex-col h-full transition-all duration-300 shadow-2xl z-30 print:hidden relative overflow-hidden shrink-0 border-r border-white/5" style={{ backgroundColor: currentTheme.sidebarBg }}>
      <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5 relative z-10">
        <div className="p-2 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105" style={{ backgroundColor: `${currentTheme.accentColor}20`, border: `1px solid ${currentTheme.accentColor}30` }}>
            <ShieldCheck className="w-6 h-6" style={{ color: currentTheme.accentColor }} />
        </div>
        <div className="hidden lg:block ml-3 overflow-hidden">
            <span className="font-black text-xl tracking-tight block leading-none text-white italic">FluxLedger</span>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-40 mt-1 block" style={{ color: currentTheme.itemColor }}>Professional ERP</span>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto custom-scrollbar relative z-10">
        <div className="hidden lg:flex justify-between items-center px-3 mb-3">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-30" style={{ color: currentTheme.itemColor }}>Business Workspace</p>
            <button onClick={() => setLanguage(language === 'it' ? 'en' : 'it')} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5 active:scale-95" style={{ color: currentTheme.itemColor }}>
                <Globe size={11} /> {language === 'it' ? 'ITA' : 'ENG'}
            </button>
        </div>
        
        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button key={item.id} onClick={() => onChangeView(item.id)} className={`w-full flex items-center justify-center lg:justify-start lg:px-4 py-2.5 rounded-xl transition-all group relative overflow-hidden cursor-pointer`} style={{ backgroundColor: isActive ? currentTheme.activeBg : 'transparent', color: isActive ? currentTheme.activeText : currentTheme.itemColor }}>
              <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className={`hidden lg:block ml-3 font-semibold text-[13px] tracking-wide ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>
              {isActive && <ChevronRight className="hidden lg:block ml-auto w-3.5 h-3.5 opacity-30" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/10 backdrop-blur-xl relative z-10">
        <div className="rounded-2xl p-3 hidden lg:block border border-white/5 bg-white/5 transition-all group cursor-default">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-lg border border-white/10 text-white shrink-0" style={{ backgroundColor: currentTheme.activeBg }}>
                    {userProfile?.email.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-[13px] font-black text-white truncate w-32 tracking-tight" title={userProfile?.email}>{userProfile?.email.split('@')[0]}</p>
                    {renderUserStatus()}
                </div>
            </div>
            <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em] mt-3">© 2026 Ingi.RiccardoRighini</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
