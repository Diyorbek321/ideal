import type {
  Client, ClientDetail, CompanySettings, Dashboard, Debt, DesignerStat, DesignTask, DesignVersion, Equipment,
  Expense, FileAsset, Installation, InstallProblem, InstallProblemType, Material, Order, OrderDetail,
  OrderEvent, OrderSource, OrderStatus, Payment, PaymentKind, PaymentMethod, PayrollEntry, PriceListItem,
  PriceResult, ProductType, PublicApproval, QueueTask, ReportSummary, ShareInfo, SmsMessage, SmsStatusInfo, StockMovement,
  AppNotification, ClientImportResult, TrackInfo, User, MyKpi, TeamKpi, Lead, LeadStatus, ClientType,
  FinanceAnalytics, ClientsAnalytics, InventoryAnalytics, OverdueReport, MyOverdue, AttendanceMonth, AttendanceRecord,
  Feedback, FeedbackInput, FeedbackStats, AdScreen, AdScreensOverview, AdCampaign, AdCampaignView, AdOccupancy,
} from '@/types';
import { api } from './client';

export { ApiError, errorMessage, setUnauthorizedHandler, tokenStore } from './client';

export interface OrderItemInput {
  productType: string;
  materialId?: string | null;
  widthCm: number;
  heightCm: number;
  quantity: number;
  finishing: string[];
  unitPrice: number;
}

export interface ProductTypeInput {
  name: string;
  defaultMaterialId?: string | null;
  pricePerM2?: number;
  costPerM2?: number;
  isActive?: boolean;
}

export interface OrderInput {
  clientId: string;
  source: OrderSource;
  items: OrderItemInput[];
  discount?: number;
  deadline?: string | null;
  dueDate?: string | null;
  needsDesign?: boolean;
  needsInstallation?: boolean;
  installationAddress?: string | null;
  designerId?: string | null;
  notes?: string | null;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  clientType?: string;
  clientId?: string;
  designerId?: string;
  from?: string;
  to?: string;
  debtOnly?: boolean;
  overdueOnly?: boolean;
  search?: string;
  view?: 'table' | 'kanban';
}

export const authApi = {
  login: (phone: string, password: string) => api.post<{ token: string; user: User }>('/auth/login', { phone, password }),
  me: () => api.get<User>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const excelApi = {
  clientsTemplate: () => api.download('/excel/clients-template', 'mijozlar-shablon.xlsx'),
  importClients: (file: File, commit: boolean) =>
    api.upload<ClientImportResult>('/excel/clients-import', file, {}, { commit }),
  accounting: (from: string, to: string) =>
    api.download('/excel/accounting', `buxgalteriya_${from}_${to}.xlsx`, { from, to }),
};

export const notificationsApi = {
  list: () => api.get<AppNotification[]>('/notifications'),
};

export const usersApi = {
  list: (q: { role?: string; active?: boolean } = {}) => api.get<User[]>('/users', q),
  create: (body: Partial<User> & { password: string }) => api.post<User>('/users', body),
  update: (id: string, body: Partial<User> & { password?: string }) => api.patch<User>(`/users/${id}`, body),
};

export const clientsApi = {
  list: (q: { search?: string; type?: string; withDebt?: boolean; page?: number; limit?: number } = {}) =>
    api.page<Client[]>('/clients', q),
  get: (id: string) => api.get<ClientDetail>(`/clients/${id}`),
  create: (body: Partial<Client>) => api.post<Client>('/clients', body),
  update: (id: string, body: Partial<Client>) => api.patch<Client>(`/clients/${id}`, body),
};

export const ordersApi = {
  list: (f: OrderFilters = {}) => api.page<Order[]>('/orders', { ...f }),
  get: (id: string) => api.get<OrderDetail>(`/orders/${id}`),
  create: (body: OrderInput) => api.post<Order>('/orders', body),
  update: (id: string, body: Partial<OrderInput>) => api.patch<Order>(`/orders/${id}`, body),
  changeStatus: (id: string, status: OrderStatus, comment?: string) =>
    api.post<Order>(`/orders/${id}/status`, { status, comment }),
  comment: (id: string, message: string) => api.post<OrderEvent>(`/orders/${id}/comments`, { message }),
};

export interface PriceInput {
  materialCode: string;
  printCode?: string;
  widthCm: number;
  heightCm: number;
  quantity: number;
  finishingCodes: string[];
  needsDesign: boolean;
  installationCode?: string;
  urgent: boolean;
}

export const pricingApi = {
  calculate: (body: PriceInput) => api.post<PriceResult>('/pricing/calculate', body),
};

export const designsApi = {
  tasks: (designerId?: string) => api.get<DesignTask[]>('/designs/tasks', { designerId }),
  create: (body: { orderId: string; fileUrl: string; previewUrl: string; areaM2?: number; note?: string }) =>
    api.post<DesignVersion>('/designs', body),
  send: (id: string) => api.post<ShareInfo>(`/designs/${id}/send`),
  share: (id: string) => api.get<ShareInfo>(`/designs/${id}/share`),
  decide: (id: string, decision: 'APPROVE' | 'REQUEST_CHANGES', comment?: string) =>
    api.post<DesignVersion>(`/designs/${id}/decision`, { decision, comment }),
};

export const publicApi = {
  get: (token: string) => api.get<PublicApproval>(`/public/approve/${token}`),
  decide: (token: string, decision: 'APPROVE' | 'REQUEST_CHANGES', comment?: string, markupUrl?: string) =>
    api.post<{ status: string }>(`/public/approve/${token}`, { decision, comment, markupUrl }),
  track: (token: string) => api.get<TrackInfo>(`/public/track/${token}`),
  uploadMarkup: (token: string, file: File) => api.upload<{ url: string }>(`/public/approve/${token}/markup`, file),
  feedback: (token: string, body: FeedbackInput) => api.post<{ rating: number; createdAt: string }>(`/public/track/${token}/feedback`, body),
};

export const productionApi = {
  queue: (q: { equipmentId?: string; status?: string } = {}) => api.get<QueueTask[]>('/production/queue', q),
  update: (id: string, body: { equipmentId?: string | null; assigneeId?: string | null; materialId?: string | null }) =>
    api.patch(`/production/tasks/${id}`, body),
  start: (id: string, equipmentId?: string) => api.post(`/production/tasks/${id}/start`, { equipmentId }),
  finish: (id: string, body: { materialId?: string; materialUsed: number; wasteAmount: number; notes?: string }) =>
    api.post<{ orderReady: boolean; negativeStock: boolean }>(`/production/tasks/${id}/finish`, body),
};

export const equipmentApi = {
  list: () => api.get<Equipment[]>('/equipment'),
  create: (body: Partial<Equipment>) => api.post<Equipment>('/equipment', body),
  update: (id: string, body: Partial<Equipment>) => api.patch<Equipment>(`/equipment/${id}`, body),
};

export interface InstallationInput {
  orderId: string;
  scheduledAt: string;
  teamIds: string[];
  address?: string;
  mapUrl?: string;
  contactPhone?: string;
  mountingType?: string;
  sizesNote?: string;
  requiredItems?: string[];
  force?: boolean;
}

export const installationsApi = {
  list: (q: { from?: string; to?: string; status?: string; orderId?: string } = {}) =>
    api.get<Installation[]>('/installations', q),
  myToday: () => api.get<Installation[]>('/installations/my-today'),
  create: (body: InstallationInput) => api.post<Installation>('/installations', body),
  checklist: (id: string, key: string, done: boolean) => api.patch(`/installations/${id}/checklist`, { key, done }),
  depart: (id: string) => api.post(`/installations/${id}/depart`),
  start: (id: string) => api.post(`/installations/${id}/start`),
  photos: (id: string, kind: 'before' | 'after', urls: string[]) => api.post(`/installations/${id}/photos`, { kind, urls }),
  finish: (id: string, clientConfirmedName?: string) =>
    api.post<{ orderCompleted: boolean }>(`/installations/${id}/finish`, { clientConfirmedName }),
  problem: (id: string, body: { type: InstallProblemType; description: string; photoUrl?: string }) =>
    api.post<InstallProblem>(`/installations/${id}/problems`, body),
  resolveProblem: (problemId: string) => api.post(`/installations/problems/${problemId}/resolve`),
};

export const inventoryApi = {
  materials: (q: { search?: string; category?: string; lowStock?: boolean } = {}) =>
    api.get<Material[]>('/inventory/materials', q),
  createMaterial: (body: Partial<Material>) => api.post<Material>('/inventory/materials', body),
  updateMaterial: (id: string, body: Partial<Material>) => api.patch<Material>(`/inventory/materials/${id}`, body),
  stockIn: (body: { materialId: string; quantity: number; price?: number; supplier?: string; note?: string }) =>
    api.post('/inventory/in', body),
  stockOut: (body: { materialId: string; quantity: number; orderId?: string; note?: string }) =>
    api.post('/inventory/out', body),
  count: (items: Array<{ materialId: string; actual: number }>, note?: string) =>
    api.post<Array<{ materialId: string; name: string; expected: number; actual: number; difference: number }>>(
      '/inventory/count', { items, note }),
  movements: (q: { materialId?: string; type?: string; page?: number; limit?: number } = {}) =>
    api.page<StockMovement[]>('/inventory/movements', q),
};

export const paymentsApi = {
  list: (q: { from?: string; to?: string; method?: string; orderId?: string; page?: number; limit?: number } = {}) =>
    api.page<{ items: Payment[]; totalAmount: number }>('/payments', q),
  create: (body: { orderId: string; amount: number; method: PaymentMethod; kind?: PaymentKind; note?: string }) =>
    api.post<Payment>('/payments', body),
  remove: (id: string) => api.del(`/payments/${id}`),
  debts: () => api.get<{ items: Debt[]; total: number }>('/payments/debts'),
  remind: (orderId: string) =>
    api.post<{ message: string; phones: string[]; telegram: string | null; smsStatus: string | null; smsError: string | null }>(`/payments/debts/${orderId}/remind`),
};

export interface ExpenseInput {
  category: string;
  amount: number;
  method: PaymentMethod;
  note?: string | null;
  date?: string;
}

export const expensesApi = {
  list: (q: { from?: string; to?: string; category?: string; method?: PaymentMethod; q?: string; page?: number; limit?: number } = {}) =>
    api.page<{
      items: Expense[];
      totalAmount: number;
      byCategory: Array<{ category: string; amount: number }>;
      byMethod: Array<{ method: PaymentMethod; amount: number }>;
    }>('/expenses', q),
  categories: () => api.get<string[]>('/expenses/categories'),
  create: (body: ExpenseInput) => api.post<Expense>('/expenses', body),
  update: (id: string, body: Partial<ExpenseInput>) => api.patch<Expense>(`/expenses/${id}`, body),
  remove: (id: string) => api.del(`/expenses/${id}`),
};

export const payrollApi = {
  list: (period: string) => api.get<{ period: string; entries: PayrollEntry[]; total: number }>('/payroll', { period }),
  calculate: (period: string) =>
    api.post<{ period: string; entries: PayrollEntry[]; total: number }>('/payroll/calculate', { period }),
  adjust: (id: string, body: { bonus?: number; fine?: number; advance?: number }) =>
    api.patch<PayrollEntry>(`/payroll/${id}`, body),
  pay: (id: string) => api.post<PayrollEntry>(`/payroll/${id}/pay`),
};

export const reportsApi = {
  dashboard: () => api.get<Dashboard>('/reports/dashboard'),
  summary: (from: string, to: string) => api.get<ReportSummary>('/reports/summary', { from, to }),
  designers: (from: string, to: string) => api.get<DesignerStat[]>('/reports/designers', { from, to }),
};

export const settingsApi = {
  company: () => api.get<CompanySettings>('/settings/company'),
  updateCompany: (body: Partial<CompanySettings>) => api.patch<CompanySettings>('/settings/company', body),
  prices: () => api.get<PriceListItem[]>('/settings/prices'),
  createPrice: (body: Omit<PriceListItem, 'id' | 'isActive' | 'materialId'> & { materialId?: string | null }) =>
    api.post<PriceListItem>('/settings/prices', body),
  updatePrice: (id: string, body: Partial<PriceListItem>) => api.patch<PriceListItem>(`/settings/prices/${id}`, body),
  productTypes: () => api.get<ProductType[]>('/settings/product-types'),
  createProductType: (body: ProductTypeInput) => api.post<ProductType>('/settings/product-types', body),
  updateProductType: (id: string, body: Partial<ProductTypeInput>) => api.patch<ProductType>(`/settings/product-types/${id}`, body),
};

export const filesApi = {
  upload: (file: File, fields: { kind?: FileAsset['kind']; orderId?: string } = {}) =>
    api.upload<FileAsset>('/files', file, Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) as Record<string, string>),
};

export const smsApi = {
  status: () => api.get<SmsStatusInfo>('/sms/status'),
  messages: (q: { orderId?: string; status?: string; page?: number; limit?: number } = {}) =>
    api.page<SmsMessage[]>('/sms/messages', q),
  send: (orderId: string, text: string) => api.post<SmsMessage>('/sms/send', { orderId, text }),
  test: (phone: string) => api.post<SmsMessage>('/sms/test', { phone }),
  retry: (id: string) => api.post<SmsMessage>(`/sms/messages/${id}/retry`),
};

export const kpiApi = {
  me: (period?: string) => api.get<MyKpi>('/kpi/me', period ? { period } : {}),
  team: (period?: string) => api.get<TeamKpi>('/kpi', period ? { period } : {}),
};

export const leadsApi = {
  list: (q: { status?: LeadStatus; search?: string; page?: number; limit?: number } = {}) => api.page<Lead[]>('/leads', { ...q }),
  count: () => api.get<{ new: number }>('/leads/count'),
  get: (id: string) => api.get<Lead>(`/leads/${id}`),
  update: (id: string, body: { status?: Exclude<LeadStatus, 'CONVERTED'>; note?: string | null; assignedToId?: string | null }) =>
    api.patch<Lead>(`/leads/${id}`, body),
  convert: (id: string, body: { type: ClientType; name?: string }) =>
    api.post<{ lead: Lead; clientId: string; clientCreated: boolean }>(`/leads/${id}/convert`, body),
};

export const analyticsApi = {
  finance: (period: string) => api.get<FinanceAnalytics>('/analytics/finance', { period }),
  clients: (period: string) => api.get<ClientsAnalytics>('/analytics/clients', { period }),
  inventory: (period: string) => api.get<InventoryAnalytics>('/analytics/inventory', { period }),
  overdue: (period: string) => api.get<OverdueReport>('/analytics/overdue', { period }),
  myOverdue: (period: string) => api.get<MyOverdue>('/analytics/overdue/me', { period }),
};

export const attendanceApi = {
  today: () => api.get<{ record: AttendanceRecord | null; workStartTime: string; geofence: boolean }>('/attendance/me/today'),
  checkIn: (coords?: { lat: number; lng: number }) => api.post<AttendanceRecord>('/attendance/check-in', coords ?? {}),
  checkOut: () => api.post<AttendanceRecord>('/attendance/check-out'),
  month: (period: string) => api.get<AttendanceMonth>('/attendance', { period }),
};

export const feedbackApi = {
  list: (q: { from?: string; to?: string; maxRating?: number; page?: number; limit?: number } = {}) =>
    api.page<{ items: Feedback[]; stats: FeedbackStats }>('/feedback', q),
  createForOrder: (orderId: string, body: FeedbackInput) => api.post<Feedback>(`/feedback/orders/${orderId}`, body),
};

export type AdScreenInput = Omit<AdScreen, 'id' | 'usedToday' | 'freeToday' | 'freeNext30'>;

export interface AdCampaignInput {
  screenId: string;
  clientId: string;
  title: string;
  startDate: string;
  endDate: string;
  slots: number;
  pricePerDay?: number;
  discount?: number;
  status?: 'BRON' | 'TASDIQLANDI';
  creativeUrl?: string | null;
  notes?: string | null;
}

export const adScreensApi = {
  overview: () => api.get<AdScreensOverview>('/ad-screens'),
  create: (body: AdScreenInput) => api.post<AdScreen>('/ad-screens', body),
  update: (id: string, body: Partial<AdScreenInput>) => api.patch<AdScreen>(`/ad-screens/${id}`, body),
  remove: (id: string) => api.del(`/ad-screens/${id}`),
  occupancy: (id: string, q: { from?: string; days?: number } = {}) => api.get<AdOccupancy>(`/ad-screens/${id}/occupancy`, q),
  campaigns: (q: { view?: AdCampaignView; screenId?: string; clientId?: string; search?: string; page?: number; limit?: number } = {}) =>
    api.page<AdCampaign[]>('/ad-screens/campaigns', q),
  campaign: (id: string) => api.get<AdCampaign>(`/ad-screens/campaigns/${id}`),
  createCampaign: (body: AdCampaignInput) => api.post<AdCampaign>('/ad-screens/campaigns', body),
  updateCampaign: (id: string, body: Partial<Omit<AdCampaignInput, 'screenId' | 'clientId' | 'status'>> & { status?: AdCampaign['status'] }) =>
    api.patch<AdCampaign>(`/ad-screens/campaigns/${id}`, body),
  pay: (id: string, body: { amount: number; method: PaymentMethod; note?: string }) =>
    api.post<Payment>(`/ad-screens/campaigns/${id}/payments`, body),
};
