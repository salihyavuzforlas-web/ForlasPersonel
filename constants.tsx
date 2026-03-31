
import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3,
  Receipt, 
  Users, 
  Settings, 
  Route,
  NotebookText,
  Megaphone,
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText 
} from 'lucide-react';

export const CATEGORIES = [
  "Öğlen yemeği",
  "Akşam yemeği",
  "Konaklama",
  "Yakıt",
  "Araç masrafı",
  "Diğer"
];

export const STATUS_UI = {
  DRAFT: { label: 'Taslak', color: 'bg-slate-100 text-slate-700', icon: <FileText size={16} /> },
  SUBMITTED: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700', icon: <Clock size={16} /> },
  APPROVED: { label: 'Onaylı', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={16} /> },
  REJECTED: { label: 'Red', color: 'bg-red-100 text-red-700', icon: <XCircle size={16} /> }
};

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, roles: ['YONETICI', 'FINANS_MUDURU'] },
  { id: 'expenses', label: 'Masraflarım', icon: <Receipt size={16} />, roles: ['PERSONEL'] },
  { id: 'sales-tracking', label: 'Satış Takibi', icon: <BarChart3 size={16} />, roles: ['PERSONEL'] },
  { id: 'route-planner', label: 'Rut Planlayıcı', icon: <Route size={16} />, roles: ['PERSONEL', 'SEVKIYAT_MUDURU', 'YONETICI'] },
  { id: 'meeting-notes', label: 'Toplantı Notları', icon: <NotebookText size={16} />, roles: ['PERSONEL', 'YONETICI'] },
  { id: 'promotions', label: 'Kampanyalar', icon: <Megaphone size={16} />, roles: ['PERSONEL', 'YONETICI'] },
  { id: 'personnel', label: 'Personeller', icon: <Users size={16} />, roles: ['YONETICI', 'FINANS_MUDURU', 'SEVKIYAT_MUDURU'] },
  { id: 'settings', label: 'Ayarlar', icon: <Settings size={16} />, roles: ['PERSONEL', 'SEVKIYAT_MUDURU', 'FINANS_MUDURU', 'YONETICI'] },
];
