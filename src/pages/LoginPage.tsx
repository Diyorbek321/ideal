import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '@/api';
import { HOME_BY_ROLE, useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

// Faqat dev rejimida: seed'dagi demo hisoblar (backend/prisma/seed.ts)
const DEMO = [
  { label: 'Direktor', phone: '+998900000001' },
  { label: 'Menejer', phone: '+998900000002' },
  { label: 'Dizayner', phone: '+998900000003' },
  { label: 'Pechatnik', phone: '+998900000005' },
  { label: 'Ustanovkachi', phone: '+998900000010' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = React.useState('+998 ');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(phone, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md" title="Ideal Dizayn ERP" description="Tizimga kirish">
        <form onSubmit={submit} className="mt-2 space-y-4">
          <Input
            label="Telefon raqam"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            required
          />
          <Input
            label="Parol"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" isLoading={busy}>Kirish</Button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Demo hisoblar (parol: ideal12345)</p>
            <div className="flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.phone}
                  type="button"
                  onClick={() => { setPhone(d.phone); setPassword('ideal12345'); }}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-400 hover:text-blue-600"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
