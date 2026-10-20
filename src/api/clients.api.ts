/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockClients } from './mockData';
import { Client } from '../types';

export const clientsApi = {
  getClients: async () => {
    await delay(300);
    return mockClients;
  },

  getClientById: async (id: string) => {
    await delay(300);
    return mockClients.find(c => c.id === id) || null;
  },

  createClient: async (client: Partial<Client>) => {
    await delay(300);
    const newClient = {
      ...client,
      id: `c${mockClients.length + 1}`,
      createdAt: new Date().toISOString(),
    } as Client;
    mockClients.unshift(newClient);
    return newClient;
  }
};
