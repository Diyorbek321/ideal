/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockMaterials } from './mockData';

export const inventoryApi = {
  getMaterials: async () => {
    await delay(300);
    return mockMaterials;
  },

  updateStock: async (id: string, delta: number) => {
    await delay(300);
    const mat = mockMaterials.find(m => m.id === id);
    if (mat) {
      mat.stock += delta;
    }
    return mat;
  }
};
