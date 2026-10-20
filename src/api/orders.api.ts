/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockOrders } from './mockData';
import { Order, OrderStatus } from '../types';

export const ordersApi = {
  getOrders: async (filters?: any) => {
    await delay(300);
    let orders = [...mockOrders];
    if (filters?.status) {
      orders = orders.filter(o => o.status === filters.status);
    }
    return orders;
  },

  getOrderById: async (id: string) => {
    await delay(300);
    return mockOrders.find(o => o.id === id) || null;
  },

  createOrder: async (order: Partial<Order>) => {
    await delay(300);
    const newOrder = {
      ...order,
      id: `o${mockOrders.length + 1}`,
      number: `ID-2026-${(mockOrders.length + 1).toString().padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      statusChangedAt: new Date().toISOString(),
      revisionCount: 0,
    } as Order;
    mockOrders.unshift(newOrder);
    return newOrder;
  },

  updateStatus: async (orderId: string, status: OrderStatus) => {
    await delay(300);
    const order = mockOrders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.statusChangedAt = new Date().toISOString();
    }
    return order;
  }
};
