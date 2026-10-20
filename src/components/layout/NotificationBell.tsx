import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, ClipboardPlus, PackageCheck, PencilLine, UserCheck, Volume2, VolumeX } from 'lucide-react';
import { notificationsApi } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/lib/auth';
import { announce, notificationTitle, seenStore, showSystemNotification, voiceStore } from '@/lib/notify';
import { cn, formatDateTime } from '@/lib/utils';
import type { AppNotification } from '@/types';

const POLL_MS = 30_000;

const ICONS = {
  NEW_ORDER: { icon: ClipboardPlus, cls: 'bg-violet-50 text-violet-600' },
  ASSIGNED: { icon: UserCheck, cls: 'bg-violet-50 text-violet-600' },
  APPROVED: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  CHANGES_REQUESTED: { icon: PencilLine, cls: 'bg-amber-50 text-amber-600' },
  READY: { icon: PackageCheck, cls: 'bg-blue-50 text-blue-600' },
} as const;

// Yangi buyurtma, tayinlash, mijoz qarori, "tayyor": 30 soniyada tekshiriladi, yangisida o'zbekcha ovozli xabar
export default function NotificationBell() {
  const user = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [voice, setVoice] = React.useState(voiceStore.get);
  const voiceRef = React.useRef(voice);
  voiceRef.current = voice;
  const [seenAt, setSeenAt] = React.useState(() => seenStore.get(user.id) ?? Date.now());
  const known = React.useRef<Set<string> | null>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const { data = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });

  // Birinchi yuklashda signal yo'q; keyingi so'rovlarda faqat yangi kelganlar uchun
  React.useEffect(() => {
    if (known.current === null) {
      known.current = new Set(data.map((n) => n.id));
      return;
    }
    const fresh = data.filter((n) => !known.current!.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => known.current!.add(n.id));
    announce(fresh.map((n) => n.kind), voiceRef.current);
    fresh.forEach((n) => {
      toast.success(notificationTitle(n));
      showSystemNotification(n);
    });
    // Ro'yxatlar yangi holatni darhol ko'rsatsin
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['order'] });
    void queryClient.invalidateQueries({ queryKey: ['design-tasks'] });
  }, [data, toast, queryClient]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = data.filter((n) => new Date(n.createdAt).getTime() > seenAt).length;

  const markSeen = () => {
    const now = Date.now();
    setSeenAt(now);
    seenStore.set(user.id, now);
  };

  const toggle = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
    if (!open) markSeen();
    setOpen(!open);
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    voiceStore.set(next);
    if (next) announce([], true);
  };

  const go = (n: AppNotification) => {
    setOpen(false);
    navigate(`/orders/${n.orderId}`);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={toggle} className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label={`Bildirishnomalar${unread ? `: ${unread} ta yangi` : ''}`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <p className="text-sm font-semibold text-gray-900">Bildirishnomalar</p>
            <button onClick={toggleVoice} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100" aria-pressed={voice}>
              {voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}{voice ? 'Ovoz yoqilgan' : 'Ovoz o\'chiq'}
            </button>
          </div>
          {data.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Oxirgi 7 kunda yangilik yo'q</p>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
              {data.map((n) => {
                const { icon: Icon, cls } = ICONS[n.kind];
                return (
                  <li key={n.id}>
                    <button onClick={() => go(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-gray-50">
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cls)}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">{notificationTitle(n)}</span>
                        <span className="block truncate text-xs text-gray-500">{n.clientName}{n.message ? ` — ${n.message}` : ''}</span>
                        <span className="mt-0.5 block text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
