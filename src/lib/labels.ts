import type {
  ClientType, DesignStatus, EquipmentStatus, EquipmentType, InstallationStatus, InstallProblemType, MaterialUnit,
  OrderSource, OrderStatus, PaymentKind, PaymentMethod, PriceKind, PriceUnit, SmsEvent, SmsStatus, TaskStatus, UserRole, LeadStatus, HeardFrom, BonusUnit, OverdueKind, AdCampaignPhase,
} from '@/types';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  YANGI: 'Yangi',
  NARX_HISOBLANDI: 'Narxi hisoblandi',
  DIZAYNDA: 'Dizaynda',
  TASDIQDA: 'Tasdiqda',
  ISHLAB_CHIQARISHDA: 'Ishlab chiqarishda',
  TAYYOR: 'Tayyor',
  ORNATISHDA: 'O\'rnatishda',
  YETKAZISHDA: 'Yetkazishda',
  YAKUNLANDI: 'Yakunlandi',
  BEKOR_QILINDI: 'Bekor qilindi',
};

export const ORDER_FLOW: OrderStatus[] = [
  'YANGI', 'NARX_HISOBLANDI', 'DIZAYNDA', 'TASDIQDA', 'ISHLAB_CHIQARISHDA', 'TAYYOR', 'ORNATISHDA', 'YAKUNLANDI',
];

export const KANBAN_COLUMNS: OrderStatus[] = [
  'YANGI', 'NARX_HISOBLANDI', 'DIZAYNDA', 'TASDIQDA', 'ISHLAB_CHIQARISHDA', 'TAYYOR', 'ORNATISHDA', 'YETKAZISHDA', 'YAKUNLANDI',
];

export const SOURCE_LABELS: Record<OrderSource, string> = {
  WALK_IN: 'O\'zi keldi',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  TENDER: 'Tender',
  WEBSITE: 'Sayt',
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  BUDGET: 'Byudjet tashkiloti',
  MILITARY: 'Harbiy qism',
  SCHOOL: 'Maktab',
  COMPANY: 'Xususiy kompaniya',
  INDIVIDUAL: 'Jismoniy shaxs',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Direktor',
  MANAGER: 'Menejer',
  DESIGNER: 'Dizayner',
  PRINTER: 'Pechatnik',
  INSTALLER: 'Ustanovkachi',
};

export const UNIT_LABELS: Record<MaterialUnit, string> = { M2: 'm²', SHEET: 'list', PIECE: 'dona', METER: 'metr' };
export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = { M2: 'm²', PIECE: 'dona', METER: 'metr', FIXED: 'qat\'iy' };

export const PRICE_KIND_LABELS: Record<PriceKind, string> = {
  MATERIAL: 'Material',
  PRINT: 'Bosma',
  FINISHING: 'Pardozlash',
  DESIGN: 'Dizayn',
  INSTALLATION: 'O\'rnatish',
  OTHER: 'Boshqa',
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Naqd',
  CARD: 'Karta',
  TRANSFER: 'Bank o\'tkazmasi',
  TENDER: 'Tender',
};

export const KIND_LABELS: Record<PaymentKind, string> = { ADVANCE: 'Avans', PARTIAL: 'Qisman', FULL: 'To\'liq' };

export const DESIGN_STATUS_LABELS: Record<DesignStatus, string> = {
  DRAFT: 'Qoralama',
  SENT: 'Mijozda',
  APPROVED: 'Tasdiqlangan',
  CHANGES_REQUESTED: 'O\'zgartirish so\'raldi',
  SUPERSEDED: 'Eskirgan',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  QUEUED: 'Navbatda',
  IN_PROGRESS: 'Jarayonda',
  DONE: 'Tayyor',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  WORKING: 'Ishlayapti',
  IDLE: 'Bo\'sh',
  REPAIR: 'Ta\'mirda',
};

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  PRINTER: 'Printer',
  LASER: 'Lazer',
  CNC: 'Frezer (CNC)',
  PLOTTER: 'Plotter',
  OTHER: 'Boshqa',
};

export const INSTALL_STATUS_LABELS: Record<InstallationStatus, string> = {
  PLANNED: 'Rejalashtirilgan',
  ON_THE_WAY: 'Yo\'lda',
  IN_PROGRESS: 'Jarayonda',
  DONE: 'Bajarildi',
  PROBLEM: 'Muammo',
  CANCELLED: 'Bekor qilindi',
};

export const PROBLEM_LABELS: Record<InstallProblemType, string> = {
  WRONG_SIZE: 'O\'lcham xato',
  WALL_UNSUITABLE: 'Devor mos emas',
  MISSING_PART: 'Detal yetmadi',
  WRONG_ADDRESS: 'Manzil xato',
  CLIENT_ABSENT: 'Mijoz yo\'q',
  OTHER: 'Boshqa',
};

export const SMS_EVENT_LABELS: Record<SmsEvent, string> = {
  ORDER_CREATED: 'Buyurtma qabul qilindi',
  DESIGN_SENT: 'Dizayn tasdiqqa yuborildi',
  DESIGN_REMINDER: 'Dizayn tasdig\'i eslatmasi (24 soat)',
  ORDER_READY: 'Buyurtma tayyor (o\'rnatishsiz)',
  INSTALLATION_SCHEDULED: 'O\'rnatish vaqti belgilandi',
  PAYMENT_RECEIVED: 'To\'lov qabul qilindi',
  DEBT_REMINDER: 'Nasiya eslatmasi (haftada 1)',
  MANUAL: 'Qo\'lda yozilgan',
  TEST: 'Test',
  FEEDBACK_REQUEST: 'Buyurtma yakunlandi — baholash so\'rovi',
};

export const HEARD_FROM_LABELS: Record<HeardFrom, string> = {
  INSTAGRAM: 'Instagram', TELEGRAM: 'Telegram', WEBSITE: 'Sayt', FRIENDS: 'Tanishlar tavsiyasi',
  SIGNBOARD: 'Reklama / peshlavha', TENDER: 'Tender', REPEAT: 'Avval ham buyurtma berganman', OTHER: 'Boshqa',
};

export const BONUS_UNIT_LABELS: Record<BonusUnit, string> = {
  NONE: 'Bonussiz (faqat oylik)',
  M2: 'Har kv.m uchun',
  ORDER: 'Har buyurtma / o\'rnatish uchun',
};

export const OVERDUE_KIND_LABELS: Record<OverdueKind, string> = {
  DEADLINE: 'Muddat o\'tdi',
  SLA: 'Bosqichda uzoq turib qoldi',
  INSTALLATION: 'O\'rnatish kuni o\'tdi',
};

export const SMS_STATUS_LABELS: Record<SmsStatus, string> = {
  QUEUED: 'Navbatda', SENT: 'Yuborildi', FAILED: 'Xato', SKIPPED: 'O\'tkazildi',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Yangi',
  CONTACTED: 'Bog\'lanildi',
  CONVERTED: 'Mijozga aylandi',
  REJECTED: 'Rad etildi',
};

export const AD_PHASE_LABELS: Record<AdCampaignPhase, string> = {
  BRON: 'Bron',
  KUTILMOQDA: 'Kutilmoqda',
  EFIRDA: 'Efirda',
  TUGADI: 'Tugadi',
  BEKOR: 'Bekor',
};

export const options = <K extends string>(labels: Record<K, string>) =>
  (Object.entries(labels) as Array<[K, string]>).map(([value, label]) => ({ value, label }));
