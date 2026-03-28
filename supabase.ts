import { createClient } from '@supabase/supabase-js';
import { Expense, MeetingNote, PromotionCampaign, RoutePlan, UserProfile, UserRole } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://gtvjvwmmrdhrquemafxp.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmp2d21tcmRocnF1ZW1hZnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTI0MjAsImV4cCI6MjA5MDI2ODQyMH0.my2O0rI8bLNSGGyOCpzcSLJWkb4LI-J_hs94Qxqts3o';

type SupabaseClientSingleton = ReturnType<typeof createClient>;

const globalForlas = globalThis as typeof globalThis & {
  __forlasSupabaseClient?: SupabaseClientSingleton;
};

if (!globalForlas.__forlasSupabaseClient) {
  globalForlas.__forlasSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalForlas.__forlasSupabaseClient;

export const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeRole = (rawRole: string): UserRole => {
  if (rawRole === UserRole.YONETICI || rawRole === 'YÖNETİCİ' || rawRole === 'ADMIN') {
    return UserRole.YONETICI;
  }
  if (rawRole === UserRole.FINANS_MUDURU) return UserRole.FINANS_MUDURU;
  if (rawRole === UserRole.SEVKIYAT_MUDURU) return UserRole.SEVKIYAT_MUDURU;
  return UserRole.PERSONEL;
};

export const mapUserProfile = (row: any): UserProfile => ({
  uid: row.uid || row.id,
  email: row.email || '',
  displayName: row.display_name || row.displayName || 'Kullanıcı',
  role: normalizeRole(row.role),
  createdAt: row.created_at || row.createdAt || Date.now(),
});

export const mapExpense = (row: any): Expense => ({
  id: row.id,
  userId: row.user_id || row.userId,
  userName: row.user_name || row.userName,
  amount: Number(row.amount || 0),
  currency: row.currency || 'TRY',
  category: row.category || 'Diğer',
  description: row.description || '',
  expenseDate: row.expense_date || row.expenseDate,
  monthKey: row.month_key || row.monthKey,
  status: row.status,
  rejectionReason: row.rejection_reason || row.rejectionReason,
  receiptData: row.receipt_data || row.receiptData,
  receiptType: row.receipt_type || row.receiptType,
  branchId: row.branch_id || row.branchId,
  route: row.route,
  plateNumber: row.plate_number || row.plateNumber,
  liter: row.liter != null ? Number(row.liter) : undefined,
  literPrice: row.liter_price != null ? Number(row.liter_price) : undefined,
  createdAt: row.created_at || row.createdAt || Date.now(),
  updatedAt: row.updated_at || row.updatedAt || Date.now(),
});

export const mapRoutePlan = (row: any): RoutePlan => ({
  id: row.id,
  title: row.title,
  routeDate: row.route_date || row.routeDate,
  startLocation: row.start_location || row.startLocation,
  endLocation: row.end_location || row.endLocation,
  stops: row.stops,
  assignedUserId: row.assigned_user_id || row.assignedUserId,
  assignedUserName: row.assigned_user_name || row.assignedUserName,
  assignedUserIds:
    (Array.isArray(row.raw?.assigned_user_ids) && row.raw.assigned_user_ids) ||
    (row.assigned_user_id ? [row.assigned_user_id] : []),
  assignedUserNames:
    (Array.isArray(row.raw?.assigned_user_names) && row.raw.assigned_user_names) ||
    (row.assigned_user_name ? [row.assigned_user_name] : []),
  distanceKm: row.raw?.distance_km != null ? Number(row.raw.distance_km) : undefined,
  roundTripKm: row.raw?.round_trip_km != null ? Number(row.raw.round_trip_km) : undefined,
  estimatedHours: row.raw?.estimated_hours != null ? Number(row.raw.estimated_hours) : undefined,
  durationDays: row.raw?.duration_days != null ? Number(row.raw.duration_days) : undefined,
  status: row.status,
  notes: row.notes,
  createdById: row.created_by_id || row.createdById,
  createdByName: row.created_by_name || row.createdByName,
  createdAt: row.created_at || row.createdAt || Date.now(),
  updatedAt: row.updated_at || row.updatedAt || Date.now(),
});

export const mapMeetingNote = (row: any): MeetingNote => ({
  id: row.id,
  title: row.title,
  meetingDate: row.meeting_date || row.meetingDate,
  attendees: row.attendees,
  note: row.note,
  rules: row.rules || row.raw?.rules || '',
  createdById: row.created_by_id || row.createdById,
  createdByName: row.created_by_name || row.createdByName,
  createdAt: row.created_at || row.createdAt || Date.now(),
  updatedAt: row.updated_at || row.updatedAt || Date.now(),
});

export const mapPromotionCampaign = (row: any): PromotionCampaign => ({
  id: row.id,
  title: row.title,
  type: row.type,
  details: row.details,
  startDate: row.start_date || row.startDate,
  endDate: row.end_date || row.endDate,
  targetAudience: row.target_audience || row.targetAudience,
  budget: row.budget != null ? Number(row.budget) : undefined,
  discountRate: row.discount_rate != null ? Number(row.discount_rate) : undefined,
  isActive: !!row.is_active,
  createdById: row.created_by_id || row.createdById,
  createdByName: row.created_by_name || row.createdByName,
  createdAt: row.created_at || row.createdAt || Date.now(),
  updatedAt: row.updated_at || row.updatedAt || Date.now(),
});
