
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { UserRole } from '../types';
import { Mail, Lock, User, Briefcase, AlertCircle } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>(UserRole.PERSONEL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const AUTH_TIMEOUT_MS = 12000;
  const hardStopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hardStopTimerRef.current) {
        window.clearTimeout(hardStopTimerRef.current);
      }
    };
  }, []);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: number | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error(timeoutMessage));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  };

  const getFriendlyAuthError = (error: any, mode: 'login' | 'signup'): string => {
    const message = String(error?.message || '').toLowerCase();
    const status = error?.status;

    if (message.includes('email logins are disabled')) {
      return "Supabase ayarı: Email giriş kapalı. Dashboard > Authentication > Providers > Email seçeneğini aktif etmelisiniz.";
    }

    if (message.includes('email signups are disabled')) {
      return "Supabase ayarı: Email kayıt kapalı. Dashboard > Authentication > Providers > Email altında 'Enable email signup' seçeneğini açmalısınız.";
    }

    if (message.includes('invalid login credentials')) {
      return 'E-posta veya şifre hatalı.';
    }

    if (message.includes('user already registered')) {
      return 'Bu e-posta ile zaten kayıt var. Giriş sekmesinden devam edin.';
    }

    if (message.includes('email not confirmed')) {
      return "E-posta doğrulaması tamamlanmadı. Gelen kutunuzdan doğrulama linkine tıklayın veya aşağıdan doğrulama mailini tekrar gönderin.";
    }

    if (status === 400 && mode === 'signup') {
      return 'Kayıt isteği reddedildi. Supabase Auth ayarlarınızı kontrol edin.';
    }

    if (status === 422) {
      return 'Kimlik doğrulama isteği işlenemedi. Auth provider ayarlarını kontrol edin.';
    }

    return error?.message || 'Beklenmeyen bir hata oluştu.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setShowResendButton(false);
    setLoading(true);
    if (hardStopTimerRef.current) {
      window.clearTimeout(hardStopTimerRef.current);
    }
    hardStopTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      setError('Hata: Giriş isteği beklenenden uzun sürdü. Lütfen tekrar deneyin.');
    }, 15000);

    try {
      if (isLogin) {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_TIMEOUT_MS,
          'Giriş isteği zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        );
        if (error) throw error;
      } else {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({ email, password }),
          AUTH_TIMEOUT_MS,
          'Kayıt isteği zaman aşımına uğradı. Lütfen tekrar deneyin.'
        );
        if (error) throw error;
        const user = data.user;
        if (!user) throw new Error('Kullanıcı oluşturulamadı.');
        const { error: profileError } = await (supabase.from('users') as any).upsert({
          id: user.id,
          uid: user.id,
          email,
          display_name: name,
          role,
          created_at: Date.now(),
          updated_at: Date.now(),
        } as any);
        if (profileError) throw profileError;
      }
    } catch (err: any) {
      const normalizedError = getFriendlyAuthError(err, isLogin ? 'login' : 'signup');
      setError('Hata: ' + normalizedError);
      if (String(err?.message || '').toLowerCase().includes('email not confirmed')) {
        setShowResendButton(true);
      }
    } finally {
      if (hardStopTimerRef.current) {
        window.clearTimeout(hardStopTimerRef.current);
        hardStopTimerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Hata: Doğrulama maili için önce e-posta girin.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resend({
          type: 'signup',
          email,
        }),
        AUTH_TIMEOUT_MS,
        'Doğrulama e-postası isteği zaman aşımına uğradı. Lütfen tekrar deneyin.'
      );
      if (error) throw error;
      setInfo('Doğrulama e-postası tekrar gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.');
    } catch (err: any) {
      setError('Hata: ' + (err?.message || 'Doğrulama e-postası gönderilemedi.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-[340px] w-full">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-[#E31E24] w-32 h-32 flex items-center justify-center rounded-2xl shadow-2xl mb-4 transform -rotate-3">
             <span className="text-3xl font-black text-white select-none">FORLAS</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">Masraf Takip Sistemi</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${isLogin ? 'text-[#E31E24] bg-white' : 'text-slate-300 bg-slate-50 hover:bg-slate-100'}`}
            >
              GİRİŞ
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'text-[#E31E24] bg-white' : 'text-slate-300 bg-slate-50 hover:bg-slate-100'}`}
            >
              KAYIT
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-[#E31E24] text-red-700 p-2 text-[10px] font-bold flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-50 border-l-4 border-green-600 text-green-700 p-2 text-[10px] font-bold flex items-center gap-2">
                <AlertCircle size={14} />
                {info}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Ad Soyad</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#E31E24] outline-none transition-all font-bold"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">E-Posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#E31E24] outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#E31E24] outline-none transition-all font-bold"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Rol</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#E31E24] outline-none appearance-none cursor-pointer font-bold"
                  >
                    <option value={UserRole.YONETICI}>Yönetici</option>
                    <option value={UserRole.PERSONEL}>Personel</option>
                    <option value={UserRole.SEVKIYAT_MUDURU}>Sevkiyat Müdürü</option>
                    <option value={UserRole.FINANS_MUDURU}>Finans Müdürü</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E31E24] text-white font-black text-xs py-3.5 rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest mt-4"
            >
              {loading ? 'YÜKLENİYOR...' : (isLogin ? 'GİRİŞ YAP' : 'KAYIT OL')}
            </button>
            {showResendButton && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading}
                className="w-full bg-white border border-slate-200 text-slate-700 font-black text-[10px] py-3 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest"
              >
                Doğrulama Mailini Tekrar Gönder
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
