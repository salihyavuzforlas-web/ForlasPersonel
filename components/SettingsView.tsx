
import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase } from '../supabase';
// Added ChevronRight to the import list to fix the compilation error
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Mail,
  Smartphone,
  MessageSquare,
  Lock,
  SmartphoneNfc,
  ChevronRight
} from 'lucide-react';

interface SettingsViewProps {
  user: UserProfile;
}

type Tab = 'profile' | 'notifications' | 'security';

const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [displayName, setDisplayName] = useState(user.displayName);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Notification states
  const [notifs, setNotifs] = useState({
    email: true,
    push: true,
    sms: false
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          updated_at: Date.now(),
        })
        .eq('uid', user.uid);
      if (error) throw error;
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2">
                  <User size={14} className="text-red-600" /> Profil Yönetimi
                </h3>
                {status === 'success' && (
                  <span className="text-[9px] font-black text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> GÜNCELLENDİ
                  </span>
                )}
              </div>
              
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Tam Adınız</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-red-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">E-Posta Adresi (Salt Okunur)</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 shadow-md shadow-red-100"
                >
                  <Save size={14} />
                  {loading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2">
                <Globe size={14} className="text-red-600" /> Bölgesel Tercihler
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Para Birimi</label>
                  <select disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-not-allowed opacity-60">
                    <option>TRY (₺) - Türk Lirası</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Dil / Language</label>
                  <select disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-not-allowed opacity-60">
                    <option>Türkçe (TR)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2">
                <Bell size={14} className="text-red-600" /> Bildirim Kanalları
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {[
                { id: 'email', label: 'E-Posta Bildirimleri', desc: 'Masraf onayları ve haftalık özetler için.', icon: <Mail size={16}/>, state: notifs.email },
                { id: 'push', label: 'Mobil Bildirimler', desc: 'Önemli güncellemeler ve hatırlatıcılar için.', icon: <Smartphone size={16}/>, state: notifs.push },
                { id: 'sms', label: 'SMS Bildirimleri', desc: 'Acil onay talepleri ve kritik uyarılar için.', icon: <MessageSquare size={16}/>, state: notifs.sms },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-50 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">{item.icon}</div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 uppercase">{item.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{item.desc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotifs({...notifs, [item.id]: !item.state})}
                    className={`w-10 h-5 rounded-full relative transition-all ${item.state ? 'bg-red-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${item.state ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-blue-700">
                  Bildirim ayarlarınız sistem tarafından 1 saat içerisinde senkronize edilecektir.
                </p>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                <h3 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2">
                  <Lock size={14} className="text-red-600" /> Şifre ve Giriş
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <button className="w-full flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">
                  <span className="text-[11px] font-black text-slate-700 uppercase">Şifre Değiştir</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <SmartphoneNfc size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[11px] font-black text-slate-800 uppercase">İki Faktörlü Doğrulama</p>
                      <p className="text-[9px] text-red-600 font-bold uppercase">Devre Dışı</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-white border border-slate-200 rounded text-[9px] font-black uppercase text-slate-600 hover:bg-red-600 hover:text-white transition-all">ETKİNLEŞTİR</button>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                <Shield size={14} className="text-red-600" /> Aktif Oturumlar
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] p-2 bg-slate-50 rounded">
                  <div className="font-bold text-slate-600">Bu Cihaz (Windows / Chrome)</div>
                  <div className="font-black text-green-600 uppercase">AKTİF</div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Sistem Ayarları</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hesap ve Uygulama Tercihleri</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sidebar for Settings */}
        <div className="space-y-1.5">
          {[
            { id: 'profile', label: 'Profil Bilgileri', icon: <User size={14}/> },
            { id: 'notifications', label: 'Bildirimler', icon: <Bell size={14}/> },
            { id: 'security', label: 'Güvenlik', icon: <Shield size={14}/> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                activeTab === item.id 
                ? 'bg-red-600 text-white shadow-lg shadow-red-100 border-red-600' 
                : 'text-slate-500 hover:bg-slate-50 bg-white border-slate-200'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content Area */}
        <div className="md:col-span-2">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
