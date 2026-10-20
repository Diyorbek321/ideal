/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { delay, mockEmployees } from './mockData';

export const employeesApi = {
  getEmployees: async () => {
    await delay(300);
    return mockEmployees;
  }
};
