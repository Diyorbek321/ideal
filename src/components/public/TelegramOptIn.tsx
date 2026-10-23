import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { publicApi } from '@/api';

interface Props {
  /** Kuzatish (track) yoki maket tasdiqlash (approve) sahifasining tokeni */
  kind: 'track' | 'approve';
  token: string;
}

// Mijoz botni bir marta "Start" qilsa, keyingi xabarlar va maketlar Telegram'ga keladi. Bot sozlanmagan bo'lsa ko'rinmaydi
export function TelegramOptIn({ kind, token }: Props) {
  const { data } = useQuery({
    queryKey: ['public-telegram', kind, token],
    queryFn: () => (kind === 'track' ? publicApi.telegramByTrack(token) : publicApi.telegramByApproval(token)),
    retry: false,
    staleTime: Infinity,
  });
  if (!data?.url) return null;
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-left text-sky-900"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"><Send className="h-5 w-5" /></span>
      <span>
        <span className="block font-bold">Telegram'da xabar olish</span>
        <span className="block text-sm text-sky-700">Buyurtma holati va maketlar botga keladi — tasdiqlash bir tugma</span>
      </span>
    </a>
  );
}
