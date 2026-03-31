
export enum UserRole {
  YONETICI = 'YONETICI',
  FINANS_MUDURU = 'FINANS_MUDURU',
  SEVKIYAT_MUDURU = 'SEVKIYAT_MUDURU',
  PERSONEL = 'PERSONEL'
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
}

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expenseDate: string; // ISO String
  monthKey: string; // YYYY-MM
  status: ExpenseStatus;
  rejectionReason?: string;
  receiptData?: string; // Base64 image or PDF data
  receiptType?: string; // mimeType
  branchId?: string;
  route?: string; // Rut/Güzergah
  plateNumber?: string; // Plaka (Araç masrafı için)
  liter?: number; // Litre (Yakıt için)
  literPrice?: number; // Litre Fiyatı (Yakıt için)
  createdAt: number;
  updatedAt: number;
}

export interface MonthlySummary {
  monthKey: string;
  totalAmount: number;
  count: number;
  userTotals: Record<string, { userName: string, total: number }>;
}

export enum RoutePlanStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface RoutePlan {
  id: string;
  title: string;
  routeDate: string; // YYYY-MM-DD
  startLocation: string;
  endLocation: string;
  stops?: string;
  assignedUserId: string; // backward compatibility (first assignee)
  assignedUserName: string; // backward compatibility (first assignee)
  assignedUserIds: string[];
  assignedUserNames: string[];
  distanceKm?: number;
  roundTripKm?: number;
  estimatedHours?: number;
  durationDays?: number;
  status: RoutePlanStatus;
  notes?: string;
  createdById: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

export interface MeetingNote {
  id: string;
  title: string;
  meetingDate: string; // YYYY-MM-DD
  attendees: string;
  note: string;
  rules?: string;
  imageData?: string;
  imageType?: string;
  createdById: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

export interface PersonnelTarget {
  id: string;
  userId: string;
  userName: string;
  title: string;
  targetType: PersonnelTargetType;
  productName?: string;
  description?: string;
  metricUnit: string;
  targetValue: number;
  currentValue?: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  createdById: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}

export enum PersonnelTargetType {
  SALES = 'SALES',
  COLLECTION = 'COLLECTION',
  PRODUCT_QUANTITY = 'PRODUCT_QUANTITY',
}

export interface PersonnelSale {
  id: string;
  userId: string;
  userName: string;
  saleDate: string; // YYYY-MM-DD
  amount: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export enum PromotionType {
  PROMOTION = 'PROMOTION',
  CAMPAIGN = 'CAMPAIGN',
  BONUS = 'BONUS'
}

export interface PromotionCampaign {
  id: string;
  title: string;
  type: PromotionType;
  details: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetAudience: string;
  budget?: number;
  discountRate?: number;
  imageData?: string;
  imageType?: string;
  isActive: boolean;
  createdById: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
}
