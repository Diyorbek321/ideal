/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, Client, Order, Material, Equipment, 
  Payment, Expense, PayrollEntry, PriceListItem 
} from './types';

// Helper to delay response
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const USE_MOCK = true;

// 10 Employees
export const mockEmployees: User[] = [
  { id: 'u1', fullName: 'Azizov Bahrom', phone: '+998 90 123 45 67', role: 'ADMIN', payType: 'FIXED', salary: 10000000, isActive: true },
  { id: 'u2', fullName: 'Karimov Sanjar', phone: '+998 91 234 56 78', role: 'MANAGER', payType: 'FIXED', salary: 6000000, isActive: true },
  { id: 'u3', fullName: 'Saidov Jamshid', phone: '+998 93 345 67 89', role: 'DESIGNER', payType: 'PER_M2', ratePerM2: 5000, isActive: true },
  { id: 'u4', fullName: 'Nazarov Alisher', phone: '+998 94 456 78 90', role: 'DESIGNER', payType: 'PER_M2', ratePerM2: 5000, isActive: true },
  { id: 'u5', fullName: 'Toshmatov Dilshod', phone: '+998 95 567 89 01', role: 'PRINTER', payType: 'FIXED', salary: 4500000, isActive: true },
  { id: 'u6', fullName: 'Olimov Farrux', phone: '+998 97 678 90 12', role: 'INSTALLER', payType: 'FIXED', salary: 4000000, isActive: true },
  { id: 'u7', fullName: 'Rustamov Eldor', phone: '+998 98 789 01 23', role: 'INSTALLER', payType: 'FIXED', salary: 4000000, isActive: true },
  { id: 'u8', fullName: 'Zokirov Jasur', phone: '+998 99 890 12 34', role: 'INSTALLER', payType: 'FIXED', salary: 4000000, isActive: true },
  { id: 'u9', fullName: 'Hasanov Sardor', phone: '+998 90 901 23 45', role: 'INSTALLER', payType: 'FIXED', salary: 4000000, isActive: true },
  { id: 'u10', fullName: 'Ismoilov Botir', phone: '+998 91 012 34 56', role: 'INSTALLER', payType: 'FIXED', salary: 4000000, isActive: true },
];

// 40 Clients
export const mockClients: Client[] = Array.from({ length: 40 }).map((_, i) => ({
  id: `c${i + 1}`,
  name: i % 5 === 0 ? `Byudjet Tashkiloti #${i}` : (i % 7 === 0 ? `Harbiy Qism #${i}` : `Mijoz ${i + 1}`),
  type: i % 5 === 0 ? 'BUDGET' : (i % 7 === 0 ? 'MILITARY' : (i % 3 === 0 ? 'COMPANY' : 'INDIVIDUAL')),
  phones: [`+998 90 ${1000000 + i}`],
  source: i % 4 === 0 ? 'WALK_IN' : (i % 4 === 1 ? 'TELEGRAM' : (i % 4 === 2 ? 'INSTAGRAM' : 'TENDER')),
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

// 15 Materials
export const mockMaterials: Material[] = [
  { id: 'm1', name: 'Banner 440g', category: 'Banner', unit: 'M2', stock: 450, minStock: 100, purchasePrice: 12000 },
  { id: 'm2', name: 'Banner 510g', category: 'Banner', unit: 'M2', stock: 120, minStock: 50, purchasePrice: 18000 },
  { id: 'm3', name: 'Fomeks 3mm', category: 'Plastik', unit: 'SHEET', stock: 45, minStock: 10, purchasePrice: 85000 },
  { id: 'm4', name: 'Fomeks 5mm', category: 'Plastik', unit: 'SHEET', stock: 12, minStock: 10, purchasePrice: 145000 },
  { id: 'm5', name: 'Akril Shafoff 3mm', category: 'Akril', unit: 'SHEET', stock: 8, minStock: 5, purchasePrice: 320000 },
  { id: 'm6', name: 'Orakal 641', category: 'Plonka', unit: 'M2', stock: 85, minStock: 20, purchasePrice: 15000 },
  { id: 'm7', name: 'LED Modul 3-lik', category: 'Elektrika', unit: 'PIECE', stock: 1200, minStock: 200, purchasePrice: 1200 },
  { id: 'm8', name: 'Blok Pitaniya 12V 400W', category: 'Elektrika', unit: 'PIECE', stock: 15, minStock: 5, purchasePrice: 145000 },
  { id: 'm9', name: 'Alyumin Profil 13cm', category: 'Profil', unit: 'METER', stock: 45, minStock: 20, purchasePrice: 22000 },
];

// 6 Equipment
export const mockEquipment: Equipment[] = [
  { id: 'e1', name: 'Katta formatli printer (Konica)', status: 'WORKING' },
  { id: 'e2', name: 'Lazer kesuvchi stanok', status: 'WORKING' },
  { id: 'e3', name: 'CNC Router (Frezer)', status: 'WORKING' },
  { id: 'e4', name: 'Plotter (Graphtec)', status: 'IDLE' },
  { id: 'e5', name: 'Laminator', status: 'WORKING' },
  { id: 'e6', name: 'UV Printer', status: 'REPAIR' },
];

// 80 Orders
export const mockOrders: Order[] = Array.from({ length: 80 }).map((_, i) => {
  const statusOptions: Order['status'][] = ['YANGI', 'NARX_HISOBLANDI', 'DIZAYNDA', 'TASDIQDA', 'ISHLAB_CHIQARISHDA', 'TAYYOR', 'ORNATISHDA', 'YAKUNLANDI'];
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  const totalAmount = (Math.floor(Math.random() * 20) + 1) * 100000;
  
  return {
    id: `o${i + 1}`,
    number: `ID-2026-${(i + 1).toString().padStart(4, '0')}`,
    clientId: `c${(i % 40) + 1}`,
    source: i % 3 === 0 ? 'WALK_IN' : (i % 3 === 1 ? 'TELEGRAM' : 'INSTAGRAM'),
    status,
    items: [
      { 
        id: `oi${i}-1`, 
        productType: 'Banner', 
        materialId: 'm1', 
        widthCm: 300, 
        heightCm: 200, 
        areaM2: 6, 
        quantity: 1, 
        finishing: ['Luvers'], 
        unitPrice: 25000, 
        total: 150000 
      }
    ],
    totalAmount,
    paidAmount: status === 'YAKUNLANDI' ? totalAmount : (status === 'YANGI' ? 0 : totalAmount / 2),
    deadline: new Date(Date.now() + (Math.random() * 7 * 86400000)).toISOString(),
    needsInstallation: i % 2 === 0,
    installationAddress: i % 2 === 0 ? 'Toshkent sh., Yunusobod tumani, 4-kvartal' : undefined,
    managerId: 'u2',
    designerId: i % 4 === 0 ? 'u3' : 'u4',
    revisionCount: Math.floor(Math.random() * 3),
    createdAt: new Date(Date.now() - (Math.random() * 30 * 86400000)).toISOString(),
    statusChangedAt: new Date().toISOString(),
  };
});
