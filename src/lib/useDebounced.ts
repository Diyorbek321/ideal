import React from 'react';

/** Qiymat `ms` davomida o'zgarmay tursa qaytariladi (qidiruv so'rovlarini kamaytirish uchun) */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
