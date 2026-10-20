/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockEmployees } from './mockData';

export const authApi = {
  login: async (role: string) => {
    await delay(500);
    const user = mockEmployees.find(u => u.role === role);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    }
    throw new Error('User not found');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  logout: () => {
    localStorage.removeItem('user');
  }
};
