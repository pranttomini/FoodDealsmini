import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Bell, Award, Trash2, Plus, UserCircle, LogOut, Lock, Moon, Languages, Camera } from 'lucide-react';
import { UserProfile, Language } from '../types';
import { getTranslation } from '../translations';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { Capacitor } from '@capacitor/core';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (user: UserProfile) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdateUser, lang, setLang }) => {
  const { user: authUser, session, signOut, profile, refreshProfile, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'alerts' | 'badges'>('alerts');
  const [newAlert, setNewAlert] = useState('');
  const [localAlerts, setLocalAlerts] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const t = (key: any) => getTranslation(lang, key);

  // Load food alerts from Supabase on mount
  useEffect(() => {
    if (!authUser?.id || !session?.access_token) return;
    const loadAlerts = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/food_alerts?user_id=eq.${authUser.id}`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.[0]?.cuisine_types) setLocalAlerts(data[0].cuisine_types);
        }
      } catch {}
    };
    loadAlerts();
  }, [authUser?.id, session?.access_token]);

  // Persist alerts to Supabase
  const saveAlerts = async (alerts: string[]) => {
    if (!authUser?.id || !session?.access_token) return;
    const headers = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    };
    try {
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/food_alerts?user_id=eq.${authUser.id}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } }
      );
      const existing = await checkRes.json();

      if (existing?.[0]) {
        await fetch(`${SUPABASE_URL}/rest/v1/food_alerts?id=eq.${existing[0].id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ cuisine_types: alerts }),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/food_alerts`, {
          method: 'POST', headers,
          body: JSON.stringify({ user_id: authUser.id, cuisine_types: alerts }),
        });
      }
    } catch (err) { console.error('Failed to save alerts:', err); }
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.trim()) return;
    if (localAlerts.includes(newAlert.trim())) return;
    const updated = [...localAlerts, newAlert.trim()];
    setLocalAlerts(updated);
    saveAlerts(updated);
    setNewAlert('');
  };

  const handleRemoveAlert = (alertToRemove: string) => {
    const updated = localAlerts.filter(a => a !== alertToRemove);
    setLocalAlerts(updated);
    saveAlerts(updated);
  };

  const handleLogout = async () => {
    try { await signOut(); } catch {}
  };

  // Avatar upload helpers
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAvatar(file);
  };

  const openAvatarPicker = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
          quality: 70,
          allowEditing: true,
        });
        if (photo.base64Data) {
          const binary = atob(photo.base64Data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          await uploadAvatar(file);
        }
      } catch (err) {
        console.error('Camera error:', err);
      }
    } else {
      avatarInputRef.current?.click();
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!authUser?.id || !session?.access_token) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(t('avatarTooLarge'));
      return;
    }
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${authUser.id}_avatar.${ext}`;
      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: file,
        }
      );
      if (!uploadRes.ok) {
        // File may already exist — try PUT (upsert)
        const upsertRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': file.type,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: file,
          }
        );
        if (!upsertRes.ok) { console.error('Avatar upload failed'); return; }
      }

      // Build public URL and update profile
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
      setAvatarUrl(publicUrl);

      // Update profiles row
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      // Refresh profile in context
      await refreshProfile();
      showToast(t('avatarUpdated'));
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  };

  const handleChangePassword = async () => {
    if (!authUser?.email) return;
    try {
      await resetPassword(authUser.email);
      showToast(t('passwordResetSent'));
    } catch (err) { console.error('Password reset error:', err); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-full w-full animate-in slide-in-from-bottom duration-300">
        
        {/* Header Profile Info */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 pb-8 relative rounded-b-[2.5rem] shadow-xl z-10">
            <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <ChevronLeft size={24} className="text-white" />
            </button>
            
            <div className="flex flex-col items-center mt-4">
                {/* Hidden file input for web avatar picker */}
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />

                <button onClick={openAvatarPicker} className="relative mb-3">
                    <div className="bg-orange-500 rounded-full p-1.5 shadow-lg shadow-orange-500/20">
                        <div className="bg-white rounded-full p-1 overflow-hidden" style={{ width: 88, height: 88 }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <UserCircle size={80} className="text-gray-800" />
                            )}
                        </div>
                    </div>
                    {/* Camera overlay badge — always visible on touch devices */}
                    <div className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full shadow-md border-2 border-white">
                        <Camera size={14} />
                    </div>
                </button>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                     <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Level {user.level}</span>
                     <span className="text-gray-400 text-sm">Foodie</span>
                </div>
            </div>
            
            <div className="flex justify-between mt-8 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                <div className="text-center flex-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('posted')}</div>
                    <div className="font-bold text-xl">{user.dealsPosted}</div>
                </div>
                <div className="w-[1px] bg-white/10"></div>
                <div className="text-center flex-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('xp')}</div>
                    <div className="font-bold text-xl">{user.xp}</div>
                </div>
                <div className="w-[1px] bg-white/10"></div>
                <div className="text-center flex-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('saved')}</div>
                    <div className="font-bold text-xl text-green-400">{user.moneySaved.toFixed(0)}€</div>
                </div>
            </div>
        </div>

        {/* Content Container */}
        <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-gray-50'} pt-6`}>
            <div className="px-4 mb-6">
                 {/* Tabs */}
                <div className={`flex ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-1 rounded-xl shadow-sm border mb-6`}>
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'alerts' ? 'bg-gray-900 text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Bell size={16} /> {t('alerts')}
                    </button>
                    <button
                        onClick={() => setActiveTab('badges')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'badges' ? 'bg-gray-900 text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Award size={16} /> {t('badges')}
                    </button>
                </div>

                {activeTab === 'alerts' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
                            <Bell className="text-blue-500 shrink-0 mt-0.5" size={20} />
                            <p className="text-sm text-blue-800 leading-snug">
                                {t('alertsDesc')}
                            </p>
                        </div>

                        <form onSubmit={handleAddAlert} className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder={t('placeholderAlert')}
                                    className={`w-full p-3 pl-4 ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-200'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-black shadow-sm`}
                                    value={newAlert}
                                    onChange={(e) => setNewAlert(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="bg-black text-white p-3 rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-400/50">
                                <Plus size={24} />
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {localAlerts.map(alert => (
                                <div key={alert} className={`${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border pl-4 pr-2 py-2 rounded-full flex items-center gap-2 shadow-sm`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>{alert}</span>
                                    <button onClick={() => handleRemoveAlert(alert)} className={`${isDark ? 'bg-slate-700 hover:bg-red-900' : 'bg-gray-100 hover:bg-red-100'} p-1 rounded-full hover:text-red-500 transition-colors`}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {localAlerts.length === 0 && (
                                <div className="text-center w-full py-8 opacity-50">
                                    <Bell size={48} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-gray-400 font-medium">{t('noAlertsYet')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'} uppercase tracking-wide mb-3 ml-1`}>{t('unlockedCollection')}</h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {user.badges.filter(b => b.unlocked).map(badge => (
                                <div key={badge.id} className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} p-4 rounded-2xl border shadow-sm flex flex-col items-center text-center gap-2`}>
                                    <div className="text-4xl mb-1">{badge.icon}</div>
                                    <div>
                                        <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{badge.name}</div>
                                        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} leading-tight mt-1`}>{badge.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h3 className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wide mb-3 ml-1`}>{t('stillLocked')}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {user.badges.filter(b => !b.unlocked).map(badge => (
                                <div key={badge.id} className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'} p-4 rounded-2xl border flex flex-col items-center text-center gap-2 opacity-60 grayscale`}>
                                    <div className="text-4xl mb-1">{badge.icon}</div>
                                    <div>
                                        <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{badge.name}</div>
                                        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} leading-tight mt-1`}>{badge.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Account Settings Section */}
            <div className="px-4 pb-8">
                <h3 className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-wide mb-3 ml-1`}>{t('settings')}</h3>
                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
                     {/* Language Switcher */}
                     <button
                        onClick={() => setLang(lang === 'en' ? 'de' : 'en')}
                        className={`w-full flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-50 hover:bg-gray-50'} transition-colors text-left`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} p-2 rounded-lg`}><Languages size={18} className={isDark ? 'text-white' : 'text-gray-700'}/></div>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('language')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'} uppercase`}>{lang}</span>
                             <span className="text-gray-300">›</span>
                        </div>
                    </button>

                    <button onClick={handleChangePassword} className={`w-full flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-50 hover:bg-gray-50'} transition-colors text-left`}>
                        <div className="flex items-center gap-3">
                            <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} p-2 rounded-lg`}><Lock size={18} className={isDark ? 'text-white' : 'text-gray-700'}/></div>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('changePassword')}</span>
                        </div>
                        <span className={isDark ? 'text-slate-500' : 'text-gray-300'}>›</span>
                    </button>
                    <button onClick={toggleTheme} className={`w-full flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-50 hover:bg-gray-50'} transition-colors text-left`}>
                        <div className="flex items-center gap-3">
                            <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} p-2 rounded-lg`}><Moon size={18} className={isDark ? 'text-orange-400' : 'text-gray-700'}/></div>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>{t('darkMode')}</span>
                        </div>
                         <div className={`w-10 h-6 ${isDark ? 'bg-orange-500' : 'bg-gray-200'} rounded-full relative transition-colors`}>
                            <div className={`absolute ${isDark ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all`}></div>
                         </div>
                    </button>
                     <button onClick={handleLogout} className={`w-full flex items-center justify-between p-4 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-red-50'} transition-colors text-left group`}>
                        <div className="flex items-center gap-3">
                            <div className={`${isDark ? 'bg-slate-700 group-hover:bg-red-900' : 'bg-red-50 group-hover:bg-red-100'} p-2 rounded-lg`}><LogOut size={18} className="text-red-500"/></div>
                            <span className="font-medium text-red-600">{t('logout')}</span>
                        </div>
                    </button>
                </div>
                <div className="text-center mt-6 text-xs text-gray-300">
                    Version 1.1.0 • FoodDeals Berlin
                </div>
            </div>
        </div>
    </div>
  );
};