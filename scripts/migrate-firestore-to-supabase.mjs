import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FIREBASE_AUTH_EMAIL',
  'FIREBASE_AUTH_PASSWORD',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Eksik ortam değişkeni: ${key}`);
  }
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAJiYacN7z1Z_o9C9f7WOEN4A0y8RiGlhk',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'forlas.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'forlas',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'forlas.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '86299941512',
  appId: process.env.FIREBASE_APP_ID || '1:86299941512:web:cec3c5ea20897ba7825d3d',
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const chunkSize = 500;

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }
  if (value && typeof value === 'object') {
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) next[k] = removeUndefined(v);
    }
    return next;
  }
  return value;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function batchUpsert(tableName, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
    if (error) {
      throw new Error(`[${tableName}] upsert hatası: ${error.message}`);
    }
  }
}

async function fetchCollectionDocs(collectionName) {
  const snapshot = await getDocs(collection(firestore, collectionName));
  return snapshot.docs.map((docItem) => ({ id: docItem.id, data: removeUndefined(docItem.data()) }));
}

function mapUsers(docs) {
  return docs.map(({ id, data }) => ({
    id: data.uid || id,
    uid: data.uid || id,
    email: data.email || null,
    display_name: data.displayName || null,
    role: data.role || null,
    created_at: toNumberOrNull(data.createdAt),
    updated_at: toNumberOrNull(data.updatedAt),
    raw: data,
  }));
}

function mapExpenses(docs) {
  return docs.map(({ id, data }) => ({
    id,
    user_id: data.userId || null,
    user_name: data.userName || null,
    amount: toNumberOrNull(data.amount),
    currency: data.currency || null,
    category: data.category || null,
    description: data.description || null,
    expense_date: data.expenseDate || null,
    month_key: data.monthKey || null,
    status: data.status || null,
    rejection_reason: data.rejectionReason || null,
    receipt_data: data.receiptData || null,
    receipt_type: data.receiptType || null,
    branch_id: data.branchId || null,
    route: data.route || null,
    plate_number: data.plateNumber || null,
    liter: toNumberOrNull(data.liter),
    liter_price: toNumberOrNull(data.literPrice),
    created_at: toNumberOrNull(data.createdAt),
    updated_at: toNumberOrNull(data.updatedAt),
    raw: data,
  }));
}

function mapRoutePlans(docs) {
  return docs.map(({ id, data }) => ({
    id,
    title: data.title || null,
    route_date: data.routeDate || null,
    start_location: data.startLocation || null,
    end_location: data.endLocation || null,
    stops: data.stops || null,
    assigned_user_id: data.assignedUserId || null,
    assigned_user_name: data.assignedUserName || null,
    status: data.status || null,
    notes: data.notes || null,
    created_by_id: data.createdById || null,
    created_by_name: data.createdByName || null,
    created_at: toNumberOrNull(data.createdAt),
    updated_at: toNumberOrNull(data.updatedAt),
    raw: data,
  }));
}

function mapMeetingNotes(docs) {
  return docs.map(({ id, data }) => ({
    id,
    title: data.title || null,
    meeting_date: data.meetingDate || null,
    attendees: data.attendees || null,
    note: data.note || null,
    created_by_id: data.createdById || null,
    created_by_name: data.createdByName || null,
    created_at: toNumberOrNull(data.createdAt),
    updated_at: toNumberOrNull(data.updatedAt),
    raw: data,
  }));
}

function mapPromotionsCampaigns(docs) {
  return docs.map(({ id, data }) => ({
    id,
    title: data.title || null,
    type: data.type || null,
    details: data.details || null,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    target_audience: data.targetAudience || null,
    budget: toNumberOrNull(data.budget),
    discount_rate: toNumberOrNull(data.discountRate),
    is_active: typeof data.isActive === 'boolean' ? data.isActive : false,
    created_by_id: data.createdById || null,
    created_by_name: data.createdByName || null,
    created_at: toNumberOrNull(data.createdAt),
    updated_at: toNumberOrNull(data.updatedAt),
    raw: data,
  }));
}

async function run() {
  console.log('Firebase oturumu açılıyor...');
  await signInWithEmailAndPassword(
    firebaseAuth,
    process.env.FIREBASE_AUTH_EMAIL,
    process.env.FIREBASE_AUTH_PASSWORD
  );

  const jobs = [
    { source: 'users', target: 'users', mapper: mapUsers },
    { source: 'expenses', target: 'expenses', mapper: mapExpenses },
    { source: 'routePlans', target: 'route_plans', mapper: mapRoutePlans },
    { source: 'meetingNotes', target: 'meeting_notes', mapper: mapMeetingNotes },
    { source: 'promotionsCampaigns', target: 'promotions_campaigns', mapper: mapPromotionsCampaigns },
  ];

  for (const job of jobs) {
    console.log(`Koleksiyon okunuyor: ${job.source}`);
    const docs = await fetchCollectionDocs(job.source);
    const rows = job.mapper(docs);
    console.log(`Supabase upsert: ${job.target} (${rows.length} kayıt)`);
    await batchUpsert(job.target, rows);
  }

  console.log('Migration tamamlandı.');
}

run().catch((error) => {
  console.error('Migration başarısız:', error.message);
  process.exit(1);
});
