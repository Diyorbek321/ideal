import * as React from 'react';

// "1250000" → "1 250 000". Faqat raqamlardan iborat bo'lmasa — o'zgarishsiz
export const groupDigits = (s: string) => (/^\d+$/.test(s) ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s);

const digitsOnly = (s: string) => s.replace(/\D/g, '');

// Kursorni formatlangan matnda N-raqamdan keyingi joyga qo'yadi
function placeCaret(el: HTMLInputElement, digitsBefore: number) {
  if (document.activeElement !== el) return;
  const v = el.value;
  let pos = 0;
  let seen = 0;
  while (pos < v.length && seen < digitsBefore) {
    if (/\d/.test(v[pos])) seen++;
    pos++;
  }
  el.setSelectionRange(pos, pos);
}

/**
 * Pul maydoni: ekranda har 3 raqamdan keyin probel ("1 250 000"), ota komponentga esa
 * faqat raqamlar ("1250000") uzatiladi — parseMoney va boshqa hisob-kitoblar o'zgarmaydi.
 */
export function useMoneyFormat(
  value: React.InputHTMLAttributes<HTMLInputElement>['value'],
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined,
) {
  const elRef = React.useRef<HTMLInputElement | null>(null);
  const pendingCaret = React.useRef<number | null>(null);
  const raw = digitsOnly(String(value ?? ''));

  const flushCaret = React.useCallback(() => {
    const el = elRef.current;
    const want = pendingCaret.current;
    if (!el || want === null) return;
    pendingCaret.current = null;
    placeCaret(el, want);
  }, []);

  React.useLayoutEffect(flushCaret);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    let next = digitsOnly(el.value);
    let digitsBefore = digitsOnly(el.value.slice(0, caret)).length;

    // Probel ustida Backspace/Delete — probel o'rniga yonidagi raqam o'chadi
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (next === raw && next.length > 0) {
      if (inputType === 'deleteContentBackward' && digitsBefore > 0) {
        next = next.slice(0, digitsBefore - 1) + next.slice(digitsBefore);
        digitsBefore -= 1;
      } else if (inputType === 'deleteContentForward' && digitsBefore < next.length) {
        next = next.slice(0, digitsBefore) + next.slice(digitsBefore + 1);
      }
    }

    pendingCaret.current = digitsBefore;
    el.value = next;
    onChange?.(e);
    // Qiymat o'zgarmasa (masalan, harf yozildi) render bo'lmaydi — kursorni keyingi kadrda tiklaymiz
    requestAnimationFrame(flushCaret);
  };

  return { elRef, displayValue: groupDigits(raw), handleChange };
}
