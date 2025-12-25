
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
    <aside className="w-20 lg:w-72 flex flex-col h-full transition-all duration-300 shadow-2xl z-30 print:hidden relative overflow-hidden shrink-0 border-r border-white/5" style={{ backgroundColor: currentTheme.sidebarBg }}>
      <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8 border-b border-white/5 relative z-10">
        <div className="p-2.5 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105" style={{ backgroundColor: `${currentTheme.accentColor}20`, border: `1px solid ${currentTheme.accentColor}30` }}>
            <ShieldCheck className="w-7 h-7" style={{ color: currentTheme.accentColor }} />
        </div>
        <div className="hidden lg:block ml-4 overflow-hidden">
            <span className="font-black text-2xl tracking-tighter block leading-none text-white italic">FluxLedger</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40 mt-1 block" style={{ color: currentTheme.itemColor }}>Professional ERP</span>
        </div>
      </div>

      <nav className="flex-1 py-10 space-y-1.5 px-4 overflow-y-auto custom-scrollbar relative z-10">
        <div className="hidden lg:flex justify-between items-center px-4 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30" style={{ color: currentTheme.itemColor }}>Engineering System</p>
            <button onClick={() => setLanguage(language === 'it' ? 'en' : 'it')} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5 active:scale-95" style={{ color: currentTheme.itemColor }}>
                <Globe size={12} /> {language === 'it' ? 'ITA' : 'ENG'}
            </button>
        </div>
        
        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button key={item.id} onClick={() => onChangeView(item.id)} className={`w-full flex items-center justify-center lg:justify-start lg:px-5 py-3.5 rounded-2xl transition-all group relative overflow-hidden cursor-pointer`} style={{ backgroundColor: isActive ? currentTheme.activeBg : 'transparent', color: isActive ? currentTheme.activeText : currentTheme.itemColor }}>
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className={`hidden lg:block ml-4 font-bold text-sm tracking-wide ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>
              {isActive && <ChevronRight className="hidden lg:block ml-auto w-4 h-4 opacity-30" />}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 bg-black/10 backdrop-blur-xl relative z-10">
        <div className="rounded-2xl p-4 hidden lg:block border border-white/5 bg-white/5 transition-all group cursor-default">
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg border border-white/10 text-white shrink-0" style={{ backgroundColor: currentTheme.activeBg }}>
                    {userProfile?.email.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-black text-white truncate w-32 tracking-tight" title={userProfile?.email}>{userProfile?.email.split('@')[0]}</p>
                    {renderUserStatus()}
                </div>
            </div>
            <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em] mt-4">Protected by Ing. Righini</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
