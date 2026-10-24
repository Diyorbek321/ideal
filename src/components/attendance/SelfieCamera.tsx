import React from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  isLoading?: boolean;
}

/**
 * Check-in selfisi — faqat jonli old kameradan (galereyadan eski rasm tanlab bo'lmaydi).
 * Rasm 720px gacha kichraytirilib JPEG qilinadi — mobil internetda tez yuklanadi.
 */
export function SelfieCamera({ open, onClose, onCapture, isLoading }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [shot, setShot] = React.useState<{ file: File; preview: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || shot) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Bu brauzerda kamera ishlamaydi. Telefoningizdagi Chrome yoki Safari\'dan kiring');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError('Kameraga ruxsat bering — bugun check-in selfi bilan qilinadi'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, shot]);

  // Yopilganda oldingi rasm tozalanadi
  React.useEffect(() => {
    if (!open) setShot((s) => { if (s) URL.revokeObjectURL(s.preview); return null; });
  }, [open]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 720 / v.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return setError('Rasmni olib bo\'lmadi, qayta urinib ko\'ring');
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      setShot({ file, preview: URL.createObjectURL(blob) });
    }, 'image/jpeg', 0.85);
  };

  const retake = () => setShot((s) => { if (s) URL.revokeObjectURL(s.preview); return null; });

  return (
    <Modal open={open} onClose={onClose} title="Selfi bilan check-in"
      footer={shot ? (
        <>
          <Button variant="ghost" onClick={retake} disabled={isLoading}><RotateCcw className="h-4 w-4" />Qayta olish</Button>
          <Button isLoading={isLoading} onClick={() => onCapture(shot.file)}>Ishga keldim</Button>
        </>
      ) : (
        <Button disabled={!!error} onClick={capture}><Camera className="h-4 w-4" />Rasmga olish</Button>
      )}>
      <p className="mb-3 text-sm text-gray-600">Bugun check-in uchun selfi so'raldi. Yuzingiz aniq ko'rinsin.</p>
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : shot ? (
        <img src={shot.preview} alt="Selfi" className="mx-auto aspect-[3/4] w-full max-w-xs rounded-2xl object-cover" />
      ) : (
        // Old kamera ko'zgudek ko'rinsin — odamga tanish; saqlangan rasm esa aylantirilmaydi
        <video ref={videoRef} autoPlay playsInline muted className="mx-auto aspect-[3/4] w-full max-w-xs -scale-x-100 rounded-2xl bg-gray-900 object-cover" />
      )}
    </Modal>
  );
}
