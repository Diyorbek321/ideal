/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'DESIGNER' | 'PRINTER' | 'INSTALLER';
export type PayType = 'FIXED' | 'PER_M2';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  payType: PayType;
  salary?: number;
  ratePerM2?: number;
  isActive: boolean;
  avatarUrl?: string;
}

export type ClientType = 'BUDGET' | 'MILITARY' | 'SCHOOL' | 'COMPANY' | 'INDIVIDUAL';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  inn?: string;
  contactPerson?: string;
  phones: string[];
  telegram?: string;
  address?: string;
  bankDetails?: string;
  source: string;
  notes?: string;
  createdAt: string;
}

export type OrderStatus = 
  | 'YANGI' 
  | 'NARX_HISOBLANDI' 
  | 'DIZAYNDA' 
  | 'TASDIQDA' 
  | 'ISHLAB_CHIQARISHDA' 
  | 'TAYYOR' 
  | 'ORNATISHDA' 
  | 'YAKUNLANDI' 
  | 'BEKOR_QILINDI';

export type OrderSource = 'WALK_IN' | 'TELEGRAM' | 'INSTAGRAM' | 'TENDER';

export interface Order {
  id: string;
  number: string;
  clientId: string;
  source: OrderSource;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  deadline: string;
  needsInstallation: boolean;
  installationAddress?: string;
  managerId: string;
  designerId?: string;
  revisionCount: number;
  notes?: string;
  createdAt: string;
  statusChangedAt: string;
}

export interface OrderItem {
  id: string;
  productType: string;
  materialId: string;
  widthCm: number;
  heightCm: number;
  areaM2: number;
  quantity: number;
  finishing: string[];
  unitPrice: number;
  total: number;
}

export type DesignStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface DesignVersion {
  id: string;
  orderId: string;
  version: number;
  fileUrl: string;
  previewUrl: string;
  areaM2: number;
  designerId: string;
  status: DesignStatus;
  clientComment?: string;
  approvalToken: string;
  sentAt?: string;
  decidedAt?: string;
}

export type ProductionStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY';

export interface ProductionTask {
  id: string;
  orderId: string;
  orderItemId: string;
  equipmentId: string;
  status: ProductionStatus;
  assigneeId?: string;
  materialUsed?: number;
  wasteAmount?: number;
  startedAt?: string;
  finishedAt?: string;
}

export type InstallationStatus = 'PLANNED' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'DONE' | 'PROBLEM';

export interface Installation {
  id: string;
  orderId: string;
  scheduledAt: string;
  address: string;
  mapUrl?: string;
  teamIds: string[];
  checklist: {
    task: string;
    completed: boolean;
  }[];
  status: InstallationStatus;
  beforePhotos: string[];
  afterPhotos: string[];
  problems: InstallProblem[];
}

export interface InstallProblem {
  id: string;
  description: string;
  reportedAt: string;
  reporterId: string;
  photos: string[];
}

export type MaterialUnit = 'M2' | 'SHEET' | 'PIECE' | 'METER';

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: MaterialUnit;
  stock: number;
  minStock: number;
  purchasePrice: number;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';

export interface StockMovement {
  id: string;
  materialId: string;
  type: StockMovementType;
  quantity: number;
  price?: number;
  orderId?: string;
  supplier?: string;
  userId: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'TENDER';
export type PaymentKind = 'ADVANCE' | 'PARTIAL' | 'FULL';

export interface Payment {
  id: string;
  orderId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  dueDate?: string;
  userId: string;
  createdAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  status: 'WORKING' | 'IDLE' | 'REPAIR';
  lastMaintenance?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  userId: string;
  createdAt: string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  period: string; // YYYY-MM
  fixedAmount: number;
  m2Amount: number;
  bonus: number;
  fine: number;
  advance: number;
  total: number;
  isPaid: boolean;
  paidAt?: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  userId: string;
  type: 'STATUS_CHANGE' | 'COMMENT' | 'DESIGN_UPLOAD' | 'PAYMENT' | 'PROBLEM';
  payload: any;
  createdAt: string;
}

export interface PriceListItem {
  id: string;
  category: 'MATERIAL' | 'PRINT' | 'FINISHING' | 'DESIGN' | 'INSTALLATION';
  name: string;
  price: number;
  unit: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phones: string[];
  bankDetails: string;
  logoUrl?: string;
  slaHours: Record<OrderStatus, number>;
}
