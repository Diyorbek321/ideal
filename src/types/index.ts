// Backend (/api/v1) javoblari bilan bir xil turlar. Pul — so'mda butun son, sana — ISO satr.

export type UserRole = 'ADMIN' | 'MANAGER' | 'DESIGNER' | 'PRINTER' | 'INSTALLER';
export type PayType = 'FIXED' | 'PER_M2';

export interface User {
  id: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  payType: PayType;
  salary: number | null;
  ratePerM2: number | null;
  bonusUnit: BonusUnit;
  bonusThreshold: number;
  bonusRate: number;
  bonusRateOver: number;
  isActive: boolean;
  telegramLinked?: boolean;
  createdAt: string;
}

/** Ish hajmi bonusi birligi: m² yoki buyurtma (o'rnatish) soni */
export type BonusUnit = 'NONE' | 'M2' | 'ORDER';

export type ClientType = 'BUDGET' | 'MILITARY' | 'SCHOOL' | 'COMPANY' | 'INDIVIDUAL';
export type OrderSource = 'WALK_IN' | 'TELEGRAM' | 'INSTAGRAM' | 'TENDER' | 'WEBSITE';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  inn: string | null;
  contactPerson: string | null;
  phones: string[];
  telegram: string | null;
  address: string | null;
  bankDetails: string | null;
  source: OrderSource;
  notes: string | null;
  smsOptOut: boolean;
  isArchived: boolean;
  createdAt: string;
  totalOrdered?: number;
  totalPaid?: number;
  debt?: number;
  ordersCount?: number;
}

export interface ClientDetail extends Client {
  orders: Array<Pick<Order, 'id' | 'number' | 'status' | 'totalAmount' | 'paidAmount' | 'createdAt' | 'deadline'>>;
  payments: Payment[];
}

export type OrderStatus =
  | 'YANGI'
  | 'NARX_HISOBLANDI'
  | 'DIZAYNDA'
  | 'TASDIQDA'
  | 'ISHLAB_CHIQARISHDA'
  | 'TAYYOR'
  | 'ORNATISHDA'
  | 'YETKAZISHDA'
  | 'YAKUNLANDI'
  | 'BEKOR_QILINDI';

export interface SlaInfo {
  hoursInStatus: number;
  slaHours: number | null;
  isOverdue: boolean;
}

export interface OrderItem {
  id: string;
  productType: string;
  materialId: string | null;
  widthCm: number;
  heightCm: number;
  areaM2: number;
  quantity: number;
  finishing: string[];
  unitPrice?: number; // moliya rollaridan boshqalarga yuborilmaydi
  total?: number;
  material?: { id: string; name: string; unit: MaterialUnit } | null;
}

export interface UserRef {
  id: string;
  fullName: string;
}

export interface Order {
  id: string;
  number: string;
  clientId: string;
  source: OrderSource;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount?: number;
  paidAmount?: number;
  discount?: number;
  remainingAmount?: number;
  deadline: string | null;
  dueDate?: string | null;
  needsDesign: boolean;
  needsInstallation: boolean;
  installationAddress: string | null;
  managerId: string;
  designerId: string | null;
  revisionCount: number;
  notes: string | null;
  createdAt: string;
  statusChangedAt: string;
  completedAt: string | null;
  trackingToken?: string;
  client: Pick<Client, 'id' | 'name' | 'type' | 'phones'>;
  designer: UserRef | null;
  manager: UserRef;
  totalAreaM2?: number;
  isLate: boolean;
  sla: SlaInfo;
}

export type OrderEventType =
  | 'CREATED' | 'STATUS_CHANGE' | 'COMMENT' | 'PAYMENT' | 'DESIGN' | 'PRODUCTION' | 'INSTALLATION' | 'UPDATED' | 'ASSIGNED';

export interface OrderEvent {
  id: string;
  orderId: string;
  type: OrderEventType;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  message: string | null;
  createdAt: string;
  user: (UserRef & { role: UserRole }) | null;
}

export interface FileAsset {
  id: string;
  orderId: string | null;
  kind: 'REFERENCE' | 'DESIGN' | 'DOCUMENT' | 'PHOTO' | 'OTHER';
  url: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface OrderDetail extends Omit<Order, 'client'> {
  client: Partial<Client> & Pick<Client, 'id' | 'name' | 'type' | 'phones'>;
  events: OrderEvent[];
  designVersions: DesignVersion[];
  productionTasks: ProductionTask[];
  installations: Installation[];
  payments?: Payment[];
  files: FileAsset[];
  allowedNextStatuses: OrderStatus[];
  feedback: Omit<Feedback, 'client' | 'order'> | null;
}

export type DesignStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'CHANGES_REQUESTED' | 'SUPERSEDED';

export interface DesignVersion {
  id: string;
  orderId: string;
  version: number;
  fileUrl: string;
  previewUrl: string;
  areaM2: number;
  designerId: string;
  status: DesignStatus;
  note: string | null;
  clientComment: string | null;
  clientMarkupUrl: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  designer?: UserRef;
}

export interface DesignTask extends Omit<Order, 'totalAmount' | 'paidAmount' | 'discount'> {
  latestVersion: DesignVersion | null;
  files: FileAsset[];
}

export interface ShareInfo {
  approvalUrl: string;
  telegramMessage: string;
  smsQueued?: boolean;
}

export type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE';

export interface ProductionTask {
  id: string;
  orderId: string;
  orderItemId: string | null;
  equipmentId: string | null;
  assigneeId: string | null;
  materialId: string | null;
  status: TaskStatus;
  materialUsed: number;
  wasteAmount: number;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  equipment?: { id: string; name: string; type: EquipmentType } | null;
  assignee?: UserRef | null;
}

export interface QueueTask extends ProductionTask {
  order: { id: string; number: string; deadline: string | null; status: OrderStatus; client: { name: string } };
  orderItem: Pick<OrderItem, 'productType' | 'widthCm' | 'heightCm' | 'quantity' | 'areaM2' | 'finishing'> | null;
  material: { id: string; name: string; unit: MaterialUnit; stock: number } | null;
  approvedDesign: Pick<DesignVersion, 'orderId' | 'version' | 'fileUrl' | 'previewUrl'> | null;
}

export type EquipmentType = 'PRINTER' | 'LASER' | 'CNC' | 'PLOTTER' | 'OTHER';
export type EquipmentStatus = 'WORKING' | 'IDLE' | 'REPAIR';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  notes: string | null;
  openTasks: number;
}

export type InstallationStatus = 'PLANNED' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'DONE' | 'PROBLEM' | 'CANCELLED';
export type InstallProblemType =
  | 'WRONG_SIZE' | 'WALL_UNSUITABLE' | 'MISSING_PART' | 'WRONG_ADDRESS' | 'CLIENT_ABSENT' | 'OTHER';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface InstallProblem {
  id: string;
  type: InstallProblemType;
  description: string;
  photoUrl: string | null;
  resolved: boolean;
  createdAt: string;
  reportedBy?: UserRef;
}

export interface Installation {
  id: string;
  orderId: string;
  /** null — sana hali kelishilmagan */
  scheduledAt: string | null;
  address: string;
  mapUrl: string | null;
  contactPhone: string | null;
  mountingType: string | null;
  sizesNote: string | null;
  requiredItems: string[];
  checklist: ChecklistItem[];
  status: InstallationStatus;
  beforePhotos: string[];
  afterPhotos: string[];
  clientConfirmedName: string | null;
  departedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  team: Array<UserRef & { phone: string }>;
  problems: InstallProblem[];
  order?: {
    id: string;
    number: string;
    status: OrderStatus;
    notes: string | null;
    client: { id: string; name: string; phones: string[]; contactPerson: string | null };
    items: Array<Pick<OrderItem, 'productType' | 'widthCm' | 'heightCm' | 'quantity' | 'finishing'>>;
    designVersions: Array<{ version: number; previewUrl: string }>;
  };
}

export type MaterialUnit = 'M2' | 'SHEET' | 'PIECE' | 'METER';

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: MaterialUnit;
  stock: number;
  minStock: number;
  purchasePrice: number | null;
  isActive: boolean;
  isLow: boolean;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';

export interface StockMovement {
  id: string;
  materialId: string;
  type: StockMovementType;
  quantity: number;
  price: number | null;
  supplier: string | null;
  note: string | null;
  createdAt: string;
  material: { id: string; name: string; unit: MaterialUnit };
  user: UserRef;
  order: { id: string; number: string } | null;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'TENDER';
export type PaymentKind = 'ADVANCE' | 'PARTIAL' | 'FULL';

export interface Payment {
  id: string;
  orderId: string | null;
  campaignId?: string | null;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  note: string | null;
  createdAt: string;
  order?: { id: string; number: string } | null;
  campaign?: { id: string; number: string; title: string } | null;
  client?: { id: string; name: string };
  user?: UserRef;
}

export interface Debt {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  client: Pick<Client, 'id' | 'name' | 'type' | 'phones' | 'telegram'>;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  dueDate: string | null;
  daysOverdue: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  date: string;
  user?: UserRef;
}

export interface PayrollEntry {
  id: string;
  userId: string;
  period: string;
  baseAmount: number;
  m2Total: number;
  bonus: number;
  planBonus: number;
  onTimeBonus: number;
  kpiDetails: { plan?: number; closedCount?: number; overPlan?: number; fund?: number; onTimeOrders?: KpiOrderRef[] };
  fine: number;
  advance: number;
  /** Davomatdan: kelmagan kunlar ulushi va kechikish jarimasi */
  absentDays: number;
  absenceDeduction: number;
  lateCount: number;
  latePenalty: number;
  /** Hisoblangan (avansdan oldin) */
  gross: number;
  /** Qo'lga: gross − avans */
  total: number;
  paidAmount: number;
  remaining: number;
  details: Array<{ orderId: string; orderNumber: string; areaM2: number; amount: number }>;
  workBonus: number;
  workDetails: Partial<WorkBonusDetails>;
  isPaid: boolean;
  paidAt: string | null;
  user: UserRef & { role: UserRole; payType: PayType; bonusUnit: BonusUnit };
}

export type PayrollTxKind = 'ADVANCE' | 'PAYMENT' | 'BONUS' | 'FINE';
export type AbsenceReason = 'SICK' | 'VACATION' | 'DAY_OFF' | 'OTHER';

export interface PayrollTransaction {
  id: string;
  kind: PayrollTxKind;
  amount: number;
  method: PaymentMethod | null;
  reason: string | null;
  date: string;
}

export interface AbsenceExcuse {
  id: string;
  day: string;
  reason: AbsenceReason;
  note: string | null;
}

/** Xodimning oylik varag'i */
export interface PayrollSheet {
  user: UserRef & { role: UserRole; payType: PayType };
  period: string;
  entry: Omit<PayrollEntry, 'user'>;
  lines: Array<{ label: string; amount: number }>;
  transactions: PayrollTransaction[];
  absentDays: string[];
  lateDays: Array<{ day: string; minutes: number }>;
  excuses: AbsenceExcuse[];
  rules: { latePenalty: number; lateGraceMin: number; absenceFrom: string | null; workDaysInMonth: number };
}

export type PriceKind = 'MATERIAL' | 'PRINT' | 'FINISHING' | 'DESIGN' | 'INSTALLATION' | 'OTHER';
export type PriceUnit = 'M2' | 'PIECE' | 'METER' | 'FIXED';

export interface PriceListItem {
  id: string;
  code: string;
  kind: PriceKind;
  name: string;
  unit: PriceUnit;
  price: number;
  costPrice: number;
  materialId: string | null;
  isActive: boolean;
}

export interface PriceLine {
  code: string;
  name: string;
  kind: PriceKind;
  unit: PriceUnit;
  amount: number;
  price: number;
  total: number;
  cost: number;
}

export interface PriceResult {
  areaM2PerUnit: number;
  totalAreaM2: number;
  perimeterM: number;
  lines: PriceLine[];
  materialCost: number;
  printCost: number;
  finishingCost: number;
  designCost: number;
  installationCost: number;
  subtotal: number;
  urgencyExtra: number;
  total: number;
  unitPrice: number;
  costTotal: number;
  marginAmount: number;
  marginPercent: number;
  suggestedPrice: number;
}

export interface ProductType {
  id: string;
  name: string;
  defaultMaterialId: string | null;
  /** 0 — narx qo'lda kiritiladi */
  pricePerM2: number;
  costPerM2: number;
  isActive: boolean;
}

export interface CompanySettings {
  name: string;
  inn: string | null;
  address: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  mfo: string | null;
  directorName: string | null;
  logoUrl: string | null;
  slaHours: Partial<Record<OrderStatus, number>>;
  urgencyMultiplier: number;
  defaultMarginPercent: number;
  installationCapacity: number;
  smsEnabled: boolean;
  smsEvents: Partial<Record<SmsEvent, boolean>>;
  kpiMonthlyPlan: number;
  kpiOverPlanBonus: number;
  kpiOnTimeBonus: number;
  workStartTime: string;
  officeLat: number | null;
  officeLng: number | null;
  officeRadiusM: number;
  /** Oylik: kechikish jarimasi (0 — o'chiq), necha daqiqadan keyin; kelmagan kunlar qaysi sanadan sanaladi */
  latePenalty: number;
  lateGraceMin: number;
  absenceFrom: string | null;
  /** Direktorga Telegram orqali kunlik hisobot (Toshkent vaqti, "20:00") */
  dailyReportEnabled: boolean;
  dailyReportTime: string;
}

export interface Dashboard {
  kpi: {
    todayOrders: number;
    inProgress: number;
    waitingApproval: number;
    overdue: number;
    revenueThisMonth: number;
    totalDebt: number;
  };
  ordersBySource: Array<{ source: OrderSource; count: number }>;
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  revenueByDay: Array<{ day: string; amount: number }>;
  problemOrders: Array<{
    id: string; number: string; status: OrderStatus; statusChangedAt: string; deadline: string | null; client: { name: string };
  }>;
  lowStock: Array<{ id: string; name: string; stock: number; minStock: number; unit: MaterialUnit }>;
}

export interface ReportSummary {
  revenue: number;
  expenses: number;
  cashFlow: number;
  ordersCount: number;
  ordersAmount: number;
  bySource: Array<{ source: OrderSource; count: number; amount: number }>;
  byClientType: Array<{ type: ClientType; count: number; amount: number }>;
  byProductType: Array<{ productType: string; areaM2: number; quantity: number; amount: number }>;
  revenueByDay: Array<{ day: string; amount: number }>;
}

export interface DesignerStat {
  id: string;
  fullName: string;
  approvedCount: number;
  approvedM2: number;
  versionsCount: number;
  revisions: number;
  avgApprovalHours: number | null;
}

export interface PublicApproval {
  version: number;
  status: DesignStatus;
  previewUrl: string;
  note: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  clientComment: string | null;
  canDecide: boolean;
  order: {
    number: string;
    clientName: string;
    deadline: string | null;
    totalAmount: number;
    items: Array<Pick<OrderItem, 'productType' | 'widthCm' | 'heightCm' | 'quantity' | 'finishing'>>;
  };
  company: { name: string; phone: string | null; logoUrl: string | null } | null;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export type SmsEvent =
  | 'ORDER_CREATED' | 'DESIGN_SENT' | 'DESIGN_REMINDER' | 'ORDER_READY' | 'INSTALLATION_SCHEDULED'
  | 'PAYMENT_RECEIVED' | 'DEBT_REMINDER' | 'MANUAL' | 'TEST' | 'FEEDBACK_REQUEST';
export type SmsStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface SmsMessage {
  id: string;
  phone: string;
  text: string;
  event: SmsEvent;
  status: SmsStatus;
  error: string | null;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  order: { id: string; number: string } | null;
  client: { id: string; name: string } | null;
}

export interface SmsStatusInfo {
  provider: string;
  live: boolean;
  enabled: boolean;
  events: Partial<Record<SmsEvent, boolean>>;
  balance: number | null;
  last30Days: Partial<Record<SmsStatus, number>>;
}

export interface TrackInfo {
  number: string;
  clientName: string;
  status: OrderStatus;
  needsDesign: boolean;
  needsInstallation: boolean;
  createdAt: string;
  deadline: string | null;
  steps: Array<{ status: OrderStatus; at: string }>;
  items: Array<{ productType: string; widthCm: number; heightCm: number; quantity: number }>;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  approvalUrl: string | null;
  installation: { scheduledAt: string | null; status: InstallationStatus } | null;
  feedback: { rating: number; createdAt: string } | null;
  canFeedback: boolean;
  company: { name: string; phone: string | null; logoUrl: string | null } | null;
}

export type NotificationKind = 'NEW_ORDER' | 'ASSIGNED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'READY' | 'NEW_LEAD';

export interface AppNotification {
  id: string;
  /** NEW_LEAD uchun bo'sh */
  orderId: string;
  leadId?: string;
  orderNumber: string;
  clientName: string;
  kind: NotificationKind;
  message: string | null;
  byClient: boolean;
  createdAt: string;
}

export interface ClientImportRow {
  row: number;
  name: string;
  type: ClientType | null;
  inn: string | null;
  phones: string[];
  debt: number;
  debtDate: string | null;
  action: 'create' | 'exists' | 'error';
  addsDebt: boolean;
  existingClientId: string | null;
  errors: string[];
  warnings: string[];
}

export interface ClientImportResult {
  committed: boolean;
  summary: { total: number; toCreate: number; existing: number; errors: number; debtRows: number; debtTotal: number };
  rows: ClientImportRow[];
}

// ───────────── KPI ─────────────

export interface KpiOrderRef { orderId: string; orderNumber: string }

export interface KpiSummary {
  period: string;
  plan: number;
  closedCount: number;
  overPlan: number;
  fund: number;
  planShare: number;
  onTimeCount: number;
  progress: number;
}

export interface MyKpi extends KpiSummary {
  eligible: boolean;
  planBonus: number;
  onTimeBonus: number;
  onTimeOrders: KpiOrderRef[];
  total: number;
}

export interface TeamKpi extends KpiSummary {
  users: Array<UserRef & { role: UserRole; planBonus: number; onTimeBonus: number; onTimeOrders: KpiOrderRef[]; total: number }>;
}

// ───────────── Saytdan arizalar ─────────────

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'REJECTED';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  service: string | null;
  message: string | null;
  details: string | null;
  source: string;
  status: LeadStatus;
  note: string | null;
  assignedTo: UserRef | null;
  client: { id: string; name: string } | null;
  contactedAt: string | null;
  createdAt: string;
  existingClient?: { id: string; name: string } | null;
}

// ───────────── Ish hajmi bonusi ─────────────

export interface WorkBonusDetails {
  unit: BonusUnit;
  quantity: number;
  threshold: number;
  baseUnits: number;
  overUnits: number;
  rate: number;
  rateOver: number;
  amount: number;
  items: Array<{ orderId: string; orderNumber: string; areaM2: number }>;
}

// ───────────── Tahlil (oylik) ─────────────

export interface MonthPoint {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
  newClients: number;
  expenseRatio: number | null;
}

export interface FinanceAnalytics {
  period: string;
  current: MonthPoint;
  previous: MonthPoint | null;
  trend: MonthPoint[];
  expensesByCategory: Array<{ category: string; amount: number; count: number; share: number; ofRevenue: number | null; prevAmount: number }>;
  expensesByDay: Array<{ day: string; amount: number }>;
}

export type HeardFrom = 'INSTAGRAM' | 'TELEGRAM' | 'WEBSITE' | 'FRIENDS' | 'SIGNBOARD' | 'TENDER' | 'REPEAT' | 'OTHER';

export interface FeedbackStats {
  count: number;
  avgRating: number | null;
  avgQuality: number | null;
  avgSpeed: number | null;
  avgService: number | null;
  recommendPercent: number | null;
  distribution: Array<{ score: number; count: number }>;
  heardFrom: Array<{ source: HeardFrom; count: number }>;
}

export interface Feedback {
  id: string;
  orderId: string;
  rating: number;
  quality: number | null;
  speed: number | null;
  service: number | null;
  recommend: boolean | null;
  heardFrom: HeardFrom | null;
  comment: string | null;
  byStaffId: string | null;
  createdAt: string;
  client: { id: string; name: string };
  order: { id: string; number: string };
}

export interface FeedbackInput {
  rating: number;
  quality?: number;
  speed?: number;
  service?: number;
  recommend?: boolean;
  heardFrom?: HeardFrom;
  comment?: string;
}

export interface Insight { tone: 'good' | 'warn' | 'info'; text: string }

export interface ClientsAnalytics {
  period: string;
  newClients: number;
  prevNewClients: number;
  newClientsBySource: Array<{ source: OrderSource; count: number }>;
  activeClients: number;
  returningClients: number;
  ordersCount: number;
  ordersAmount: number;
  avgCheck: number;
  ordersBySource: Array<{ source: OrderSource; count: number; amount: number }>;
  byClientType: Array<{ type: ClientType; count: number; amount: number }>;
  leads: { total: number; converted: number };
  completedOrders: number;
  feedback: FeedbackStats;
  trend: Array<{ period: string; newClients: number; orders: number; avgRating: number | null }>;
  insights: Insight[];
}

export interface InventoryAnalytics {
  period: string;
  totals: { consumedCost: number; purchasedCost: number; wasteCost: number; lowStock: number };
  materials: Array<{
    id: string; name: string; category: string; unit: MaterialUnit; stock: number; minStock: number;
    consumed: number; received: number; waste: number; wastePercent: number; consumedCost: number; purchasedCost: number;
    daysLeft: number | null; isLow: boolean;
  }>;
  byCategory: Array<{ category: string; cost: number }>;
  byDay: Array<{ day: string; cost: number }>;
  trend: Array<{ period: string; consumedCost: number; purchasedCost: number }>;
}

export type OverdueKind = 'DEADLINE' | 'SLA' | 'INSTALLATION';

export interface OverdueItem {
  kind: OverdueKind;
  orderId: string;
  orderNumber: string;
  clientName: string;
  status: OrderStatus;
  since: string;
  hoursLate: number;
  responsibleIds: string[];
  responsible?: UserRef[];
}

export interface LateCompleted {
  orderId: string;
  orderNumber: string;
  clientName: string;
  deadline: string;
  completedAt: string;
  responsible?: UserRef[];
}

export interface OverdueReport {
  period: string;
  items: OverdueItem[];
  lateCompleted: LateCompleted[];
  completedCount: number;
  lateCount: number;
  users: Array<UserRef & { role: UserRole; open: number; lateDone: number; onTimeDone: number; onTimePercent: number | null }>;
}

export interface MyOverdue {
  period: string;
  items: OverdueItem[];
  lateCompleted: LateCompleted[];
  completedCount: number;
}

// ───────────── Davomat ─────────────

export interface AttendanceRecord {
  id: string;
  userId: string;
  day: string;
  checkInAt: string;
  checkOutAt: string | null;
  lateMinutes: number;
  distanceM: number | null;
}

export interface AttendanceMonth {
  period: string;
  workStartTime: string;
  workDays: string[];
  users: Array<UserRef & { role: UserRole; present: number; late: number; lateMinutes: number; absent: number }>;
  records: AttendanceRecord[];
}

// ───────────── LED ekranlar (tashqi reklama) ─────────────

export interface AdScreen {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  widthM: number;
  heightM: number;
  resolution: string | null;
  photoUrl: string | null;
  slotSeconds: number;
  maxSlots: number;
  workFrom: string;
  workTo: string;
  pricePerDay: number;
  isActive: boolean;
  showOnWebsite: boolean;
  notes: string | null;
  usedToday: number;
  freeToday: number;
  freeNext30: number;
}

export interface AdScreensOverview {
  items: AdScreen[];
  summary: { screens: number; activeCampaigns: number; occupancyPct: number; debt: number };
}

export type AdCampaignStatus = 'BRON' | 'TASDIQLANDI' | 'BEKOR';
export type AdCampaignPhase = 'BRON' | 'KUTILMOQDA' | 'EFIRDA' | 'TUGADI' | 'BEKOR';
export type AdCampaignView = 'active' | 'upcoming' | 'finished' | 'booked' | 'cancelled' | 'debt' | 'all';

export interface AdCampaign {
  id: string;
  number: string;
  screenId: string;
  clientId: string;
  title: string;
  startDate: string;
  endDate: string;
  slots: number;
  pricePerDay: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: AdCampaignStatus;
  phase: AdCampaignPhase;
  days: number;
  daysLeft: number;
  creativeUrl: string | null;
  notes: string | null;
  createdAt: string;
  screen: { id: string; name: string; address: string; maxSlots: number; slotSeconds: number };
  client: { id: string; name: string; phones: string[] };
  manager: UserRef;
  payments?: Array<Payment & { user?: UserRef }>;
}

export interface AdOccupancy {
  maxSlots: number;
  days: Array<{ day: string; used: number; free: number }>;
}
