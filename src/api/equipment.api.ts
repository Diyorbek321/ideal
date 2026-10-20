/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockEquipment } from './mockData';

export const equipmentApi = {
  getEquipment: async () => {
    await delay(300);
    return mockEquipment;
  }
};
