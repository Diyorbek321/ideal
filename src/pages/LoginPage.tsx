import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '@/api';
import { HOME_BY_ROLE, useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
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
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-brand-400 px-6 py-6 lg:w-[44%] lg:px-12 lg:py-10">
        <Logo onYellow />
        <div className="relative mt-8 hidden lg:block">
          <p className="font-display text-4xl font-bold leading-[1.1] text-gray-900 xl:text-5xl">Buyurtmadan<br />montajgacha —<br />bitta tizimda.</p>
          <p className="mt-5 max-w-sm text-gray-800">Dizayn, tasdiq, pechat, o'rnatish va to'lovlar bir joyda kuzatiladi.</p>
        </div>
        <p className="relative mt-8 hidden text-sm text-gray-800 lg:block">Ideal Dizayn · Angren</p>
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 hidden h-80 w-80 rounded-full border-[40px] border-gray-900/10 lg:block" />
      </aside>
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-gray-900">Tizimga kirish</h1>
        <p className="mt-1.5 text-sm text-gray-500">Telefon raqamingiz va parolingizni kiriting</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
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
          <Button type="submit" size="lg" className="w-full" isLoading={busy}>Kirish</Button>
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
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
