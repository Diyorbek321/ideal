import type { AppNotification } from '@/types';

export const NOTIFICATION_TEXT: Record<AppNotification['kind'], string> = {
  NEW_ORDER: 'Yangi buyurtma',
  ASSIGNED: 'Sizga biriktirildi',
  APPROVED: 'dizaynni tasdiqladi',
  CHANGES_REQUESTED: 'o\'zgartirish so\'radi',
  READY: 'Buyurtma tayyor',
};

export function notificationTitle(n: AppNotification): string {
  if (n.kind === 'READY' || n.kind === 'NEW_ORDER' || n.kind === 'ASSIGNED') return `${n.orderNumber}: ${NOTIFICATION_TEXT[n.kind]}`;
  return `${n.orderNumber}: ${n.byClient ? 'mijoz' : 'menejer'} ${NOTIFICATION_TEXT[n.kind]}`;
}

const seenKey = (userId: string) => `ideal.notif.seen.${userId}`;

export const seenStore = {
  get: (userId: string): number | null => {
    try {
      const v = localStorage.getItem(seenKey(userId));
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  },
  set: (userId: string, at: number) => {
    try {
      localStorage.setItem(seenKey(userId), String(at));
    } catch {
      // saqlab bo'lmasa — sahifa ochiq turguncha xotirada qoladi
    }
  },
};

const voiceKey = 'ideal.notif.voice';

export const voiceStore = {
  get: (): boolean => {
    try {
      return localStorage.getItem(voiceKey) !== 'off';
    } catch {
      return true;
    }
  },
  set: (on: boolean) => {
    try {
      localStorage.setItem(voiceKey, on ? 'on' : 'off');
    } catch {
      // saqlab bo'lmasa — sahifa ochiq turguncha amal qiladi
    }
  },
};

// Madina (uz-UZ) ovozida oldindan yozilgan iboralar — public/sounds/
const VOICE_FILES: Record<AppNotification['kind'], string> = {
  NEW_ORDER: '/sounds/new-order.mp3',
  ASSIGNED: '/sounds/assigned.mp3',
  APPROVED: '/sounds/approved.mp3',
  CHANGES_REQUESTED: '/sounds/changes.mp3',
  READY: '/sounds/ready.mp3',
};
const CHIME_MS = 550;
const MAX_SPOKEN = 3;

const playFile = (src: string) => new Promise<void>((resolve) => {
  const audio = new Audio(src);
  audio.onended = () => resolve();
  audio.onerror = () => resolve();
  // Brauzer avtomatik ovozni bloklasa (sahifa bilan hali ishlanmagan) — jim o'tadi
  audio.play().catch(() => resolve());
});

let queue = Promise.resolve();

// Signal, keyin har bir turdagi xabar bir marta ovoz bilan aytiladi (ketma-ket, ustma-ust emas)
export function announce(kinds: Array<AppNotification['kind']>, voice: boolean) {
  queue = queue.then(async () => {
    playChime();
    if (!voice) return;
    await new Promise((r) => setTimeout(r, CHIME_MS));
    for (const kind of [...new Set(kinds)].slice(0, MAX_SPOKEN)) await playFile(VOICE_FILES[kind]);
  });
}

// Qisqa ikki tonli signal — fayl kerak emas
export function playChime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    // brauzer ovozni bloklagan — jim qoladi
  }
}

export function showSystemNotification(n: AppNotification) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    new Notification(notificationTitle(n), { body: n.message ?? n.clientName, tag: n.id });
  } catch {
    // ba'zi mobil brauzerlarda konstruktor yo'q
  }
}
