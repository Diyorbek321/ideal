import React from 'react';

/** Bufer almashinuvidan (Ctrl+V) birinchi faylni oladi; skrinshot nomi "image.png" bo'ladi — o'qiladigan nom beramiz */
export function fileFromClipboard(data: DataTransfer | null, accept?: string): File | null {
  const file = Array.from(data?.files ?? []).find((f) => matchesAccept(f, accept));
  if (!file) return null;
  if (!file.type.startsWith('image/') || (file.name && file.name !== 'image.png')) return file;
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  const ext = file.type.split('/')[1] || 'png';
  return new File([file], `skrinshot_${stamp}.${ext}`, { type: file.type });
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  return accept.split(',').map((a) => a.trim()).some((a) =>
    a.endsWith('/*') ? file.type.startsWith(a.slice(0, -1)) : a.startsWith('.') ? file.name.toLowerCase().endsWith(a) : file.type === a);
}

/**
 * Sahifada Ctrl+V bosilganda fayl (skrinshot) ushlab olinadi. Oddiy matn joylashtirish buzilmaydi —
 * buferda fayl bo'lmasa hodisaga tegilmaydi. `scope: 'modal'` oynadagi tutqich sahifadagidan oldin
 * ishlaydi va hodisani to'xtatadi — ochiq oynaga qo'yilgan rasm orqadagi sahifaga ham yuklanib ketmasin.
 */
export function usePasteFile(onFile: (file: File) => void, opts: { enabled?: boolean; scope?: 'page' | 'modal'; accept?: string } = {}) {
  const { enabled = true, scope = 'page', accept } = opts;
  const handler = React.useRef(onFile);
  handler.current = onFile;

  React.useEffect(() => {
    if (!enabled) return undefined;
    const target: Window | Document = scope === 'modal' ? window : document;
    const listener = (e: Event) => {
      const data = (e as ClipboardEvent).clipboardData;
      // Word/Excel'dan matn nusxalanganda buferga rasm ham qo'shiladi — matn maydoniga matn qo'yilsin
      if (isEditable(e.target) && data?.types.includes('text/plain')) return;
      const file = fileFromClipboard(data, accept);
      if (!file) return;
      e.preventDefault();
      if (scope === 'modal') e.stopPropagation();
      handler.current(file);
    };
    target.addEventListener('paste', listener, scope === 'modal');
    return () => target.removeEventListener('paste', listener, scope === 'modal');
  }, [enabled, scope, accept]);
}
