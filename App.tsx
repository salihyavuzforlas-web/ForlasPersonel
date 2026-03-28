
import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile } from './types.ts';
import Auth from './components/Auth.tsx';
import Layout from './components/Layout.tsx';
import StaffDashboard from './components/StaffDashboard.tsx';
import ManagerDashboard from './components/ManagerDashboard.tsx';
import PersonnelView from './components/PersonnelView.tsx';
import SettingsView from './components/SettingsView.tsx';
import RoutePlannerView from './components/RoutePlannerView';
import MeetingNotesView from './components/MeetingNotesView';
import PromotionsView from './components/PromotionsView';
import { mapUserProfile, supabase } from './supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    let mounted = true;
    const loadingGuard = window.setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 7000);
    const fallbackUserFromAuth = (authUser: { id: string; email?: string | null; user_metadata?: any }): UserProfile => ({
      uid: authUser.id,
      email: authUser.email || '',
      displayName: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Kullanıcı',
      role: UserRole.PERSONEL,
      createdAt: Date.now(),
    });

    const ensureUserProfile = async (authUser: { id: string; email?: string | null; user_metadata?: any }) => {
      const now = Date.now();
      let profileRow: any = null;
      const usersTable: any = supabase.from('users');

      const { data: byUid } = await usersTable
        .select('*')
        .eq('uid', authUser.id)
        .maybeSingle();
      if (byUid) profileRow = byUid;

      if (!profileRow) {
        const { data: byId } = await usersTable
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        if (byId) profileRow = byId;
      }

      if (!profileRow && authUser.email) {
        const { data: byEmail } = await usersTable
          .select('*')
          .eq('email', authUser.email)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (byEmail && byEmail.length > 0) profileRow = byEmail[0];
      }

      if (!profileRow) {
        const payload = {
          id: authUser.id,
          uid: authUser.id,
          email: authUser.email || '',
          display_name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Kullanıcı',
          role: UserRole.PERSONEL,
          created_at: now,
          updated_at: now,
        };
        const { data: created, error: createError } = await usersTable
          .upsert(payload as any)
          .select()
          .maybeSingle();
        if (createError) throw createError;
        profileRow = created || payload;
      } else if (profileRow.uid !== authUser.id || profileRow.email !== authUser.email) {
        const { data: updated, error: updateError } = await usersTable
          .update({
            uid: authUser.id,
            email: authUser.email || profileRow.email || '',
            updated_at: now,
          } as any)
          .eq('id', profileRow.id)
          .select()
          .maybeSingle();
        if (updateError) throw updateError;
        profileRow = updated || { ...profileRow, uid: authUser.id, email: authUser.email || profileRow.email || '' };
      }

      return mapUserProfile(profileRow);
    };

    const loadProfile = async () => {
      let authUser: { id: string; email?: string | null; user_metadata?: any } | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        authUser = authData?.user || null;
        if (!authUser) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        const resolvedUser = await ensureUserProfile(authUser);
        if (mounted) {
          setUser(resolvedUser);
          setLoading(false);
        }
      } catch (_error) {
        if (mounted) {
          if (authUser) {
            setUser(fallbackUserFromAuth(authUser));
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      }
    };

    loadProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Do not block auth state callback with awaits.
      setUser(fallbackUserFromAuth(session.user));
      setLoading(false);

      void (async () => {
        try {
          const resolvedUser = await ensureUserProfile(session.user);
          if (mounted) setUser(resolvedUser);
        } catch (_error) {
          // Keep fallback user to avoid login deadlock.
        }
      })();
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingGuard);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="bg-[#E31E24] w-24 h-24 flex items-center justify-center rounded-2xl shadow-2xl animate-bounce">
            <span className="text-xl font-black text-white">FORLAS</span>
          </div>
          <div className="w-24 h-1 bg-slate-200 overflow-hidden rounded-full">
            <div className="w-full h-full bg-[#E31E24] origin-left animate-[loading_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  const renderContent = () => {
    if (user.role === UserRole.YONETICI) {
      switch (activeView) {
        case 'dashboard':
          return <ManagerDashboard user={user} />;
        case 'personnel':
          return <PersonnelView currentUser={user} />;
        case 'route-planner':
          return <RoutePlannerView user={user} />;
        case 'meeting-notes':
          return <MeetingNotesView user={user} />;
        case 'promotions':
          return <PromotionsView user={user} />;
        case 'settings':
          return <SettingsView user={user} />;
        default:
          return <ManagerDashboard user={user} />;
      }
    }

    if (user.role === UserRole.FINANS_MUDURU) {
      if (activeView === 'settings') return <SettingsView user={user} />;
      if (activeView === 'personnel') return <PersonnelView currentUser={user} />;
      return <ManagerDashboard user={user} />;
    }

    if (user.role === UserRole.PERSONEL) {
      if (activeView === 'settings') return <SettingsView user={user} />;
      if (activeView === 'expenses') return <StaffDashboard user={user} />;
      if (activeView === 'route-planner') return <RoutePlannerView user={user} />;
      if (activeView === 'meeting-notes') return <MeetingNotesView user={user} />;
      if (activeView === 'promotions') return <PromotionsView user={user} />;
      return <StaffDashboard user={user} />;
    }

    if (user.role === UserRole.SEVKIYAT_MUDURU) {
      if (activeView === 'settings') return <SettingsView user={user} />;
      if (activeView === 'personnel') return <PersonnelView currentUser={user} />;
      if (activeView === 'route-planner' || activeView === 'dashboard') return <RoutePlannerView user={user} />;
      return <RoutePlannerView user={user} />;
    }
    return <StaffDashboard user={user} />;
  };

  return (
    <Layout user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
