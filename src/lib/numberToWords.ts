const ONES = ['', 'bir', 'ikki', 'uch', 'to\'rt', 'besh', 'olti', 'yetti', 'sakkiz', 'to\'qqiz'];
const TENS = ['', 'o\'n', 'yigirma', 'o\'ttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'to\'qson'];
const SCALES = ['', 'ming', 'million', 'milliard', 'trillion'];

function triple(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  return [h ? `${ONES[h]} yuz` : '', TENS[t], ONES[o]].filter(Boolean).join(' ');
}

// 1250000 → "bir million ikki yuz ellik ming"
export function numberToWordsUz(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'nol';
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.unshift([triple(chunk), SCALES[scale]].filter(Boolean).join(' '));
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return parts.join(' ');
}
