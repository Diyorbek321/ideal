/** "943644401" → "94 364 44 01"; ortiqcha raqamlar kesiladi */
function groupLocal(d: string): string {
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/** Bitta raqam: "+998943644401" → "+998 94 364 44 01", "943644401" → "94 364 44 01" */
function formatOne(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const withCode = raw.trim().startsWith('+') || (digits.startsWith('998') && digits.length > 9);
  if (withCode) {
    const code = digits.slice(0, 3);
    const rest = digits.slice(3, 12);
    return rest ? `+${code} ${groupLocal(rest)}` : `+${code}`;
  }
  return groupLocal(digits.slice(0, 9));
}

/**
 * Yozish paytida telefonni guruhlaydi: "94 364 44 01". Vergul bilan bir nechta raqam ham bo'ladi.
 * Server bo'shliqlarni o'zi tozalaydi (+998XXXXXXXXX).
 */
export function formatPhoneInput(value: string): string {
  const parts = value.split(',');
  return parts
    .map((p, i) => {
      const f = formatOne(p);
      // Verguldan keyin yangi raqam boshlanayotganda bo'sh joy qoladi
      return i === 0 || !f ? f : ` ${f}`;
    })
    .join(',');
}
