/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const roles = [
  { id: 'ADMIN', label: 'Admin (Direktor)', desc: 'Barcha ma\'lumotlar' },
  { id: 'MANAGER', label: 'Menejer', desc: 'Sotuv va mijozlar' },
  { id: 'DESIGNER', label: 'Dizayner', desc: 'Dizayn vazifalari' },
  { id: 'PRINTER', label: 'Pechatnik', desc: 'Ishlab chiqarish' },
  { id: 'INSTALLER', label: 'O\'rnatuvchi', desc: 'O\'rnatish ishlari' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<string | null>(null);

  const handleLogin = async (role: string) => {
    setLoading(role);
    try {
      await authApi.login(role);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full" title="Ideal Dizayn ERP" description="Tizimga kirish uchun rolni tanlang">
        <div className="space-y-4 mt-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleLogin(role.id)}
              disabled={!!loading}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
            >
              <div>
                <p className="font-bold text-gray-900 group-hover:text-blue-700">{role.label}</p>
                <p className="text-sm text-gray-500">{role.desc}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100">
                {loading === role.id ? (
                   <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                   </svg>
                ) : (
                  <span className="text-gray-400 group-hover:text-blue-600">→</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
