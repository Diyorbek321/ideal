/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockOrders } from './mockData';

export const financeApi = {
  getPayments: async () => {
    await delay(300);
    // Simplified: generate payments from orders
    return mockOrders.filter(o => o.paidAmount > 0).map(o => ({
      id: `p-${o.id}`,
      orderId: o.id,
      amount: o.paidAmount,
      method: 'CASH',
      createdAt: o.createdAt
    }));
  },

  getStats: async () => {
    await delay(300);
    const totalRevenue = mockOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalDebt = mockOrders.reduce((sum, o) => sum + (o.totalAmount - o.paidAmount), 0);
    return {
      totalRevenue,
      totalDebt,
      ordersCount: mockOrders.length
    };
  }
};
