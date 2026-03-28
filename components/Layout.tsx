import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { MENU_ITEMS } from '../constants';
import { LogOut, User, ChevronRight, Menu, X } from 'lucide-react';

interface LayoutProps {
  user: UserProfile;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeView, setActiveView, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredMenuItems = MENU_ITEMS.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-52 bg-slate-950 text-white flex-col shadow-2xl z-20 border-r border-white/5">
        <div className="p-5 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="bg-[#E31E24] w-full aspect-square flex items-center justify-center rounded-lg shadow-lg mb-3 transform hover:scale-105 transition-transform duration-300">
            <span className="text-2xl font-black tracking-tighter text-white select-none">FORLAS</span>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] opacity-80 mt-1">Kurumsal Portal</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredMenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-lg transition-all group text-[11px] font-bold uppercase tracking-tight ${
                activeView === item.id 
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`${activeView === item.id ? 'text-white' : 'opacity-50 group-hover:opacity-100'}`}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {activeView === item.id && <ChevronRight size={12} className="text-white/50" />}
            </button>
          ))}
        </nav>

        <div className="p-3 bg-black/20 backdrop-blur-md border-t border-white/5">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#E31E24] flex items-center justify-center text-[10px] font-black border border-white/20">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate leading-none">{user.displayName}</p>
              <p className="text-[8px] text-slate-400 font-black truncate mt-1 uppercase tracking-tighter opacity-70">
                {user.role === UserRole.YONETICI
                  ? 'Yönetici'
                  : user.role === UserRole.FINANS_MUDURU
                  ? 'Finans Müdürü'
                  : user.role === UserRole.SEVKIYAT_MUDURU
                  ? 'Sevkiyat Müdürü'
                  : 'Personel'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-[9px] font-black text-white/50 hover:text-white bg-white/5 hover:bg-red-600 rounded-md transition-all uppercase border border-white/5"
          >
            <LogOut size={12} /> SİSTEMDEN ÇIK
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden h-14 bg-slate-950 border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-2">
           <div className="bg-[#E31E24] px-2 py-1 rounded">
             <span className="text-sm font-black text-white tracking-tighter">FORLAS</span>
           </div>
           <span className="text-[8px] font-black text-white/40 uppercase tracking-widest border-l border-white/10 pl-2">Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
            {user.displayName.charAt(0)}
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white bg-white/5 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-over Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-lg animate-in fade-in slide-in-from-right duration-300">
           <div className="flex flex-col h-full pt-20 p-6 space-y-4">
              <div className="mb-8">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Hoş Geldiniz</p>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">{user.displayName}</h2>
              </div>
              
              <div className="space-y-2">
                {filteredMenuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setIsMobileMenuOpen(false); }}
                    className={`flex items-center w-full gap-4 p-4 rounded-xl text-sm font-black uppercase tracking-tight transition-all ${
                      activeView === item.id ? 'bg-red-600 text-white shadow-xl' : 'text-slate-400 bg-white/5'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-auto pb-8 space-y-3">
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center gap-3 w-full p-4 bg-white/5 text-red-500 rounded-xl text-sm font-black uppercase border border-red-500/20"
                >
                  <LogOut size={18} /> OTURUMU KAPAT
                </button>
                <p className="text-center text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">Forlas v2.5 Mobile</p>
              </div>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#fcfcfc]">
        {/* Desktop Title Bar */}
        <header className="hidden md:flex h-10 bg-white border-b border-slate-200 items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            FORLAS <span className="text-slate-300">/</span> <span className="text-red-600">{activeView.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase">Bulut Senkronize</span>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </section>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 px-4 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          {filteredMenuItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${
                activeView === item.id ? 'text-red-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${activeView === item.id ? 'bg-red-50' : ''}`}>
                {/* Fix: Cast item.icon to React.ReactElement<any> to allow 'size' property in cloneElement */}
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Layout;