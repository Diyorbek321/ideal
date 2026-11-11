import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, X } from 'lucide-react';
import { designsApi } from '@/api';
import type { FileAsset } from '@/types';
import { isFinance, useUser } from '@/lib/auth';
import { fileUrl, parseDecimal } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Button } from '@/components/ui/Button';
import { FileButton } from '@/components/ui/FileButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  defaultAreaM2?: number;
}

const MAX_PREVIEWS = 10;

// Ikki fayl: ishchi fayl (cdr/ai/pdf) — pechatnikka, rasm (jpg/png) — mijozga ko'rsatiladi
export function DesignUploadModal({ open, onClose, orderId, orderNumber, defaultAreaM2 }: Props) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [file, setFile] = React.useState<FileAsset | null>(null);
  const [previews, setPreviews] = React.useState<FileAsset[]>([]);
  const preview = previews[0] ?? null;
  const addPreview = (f: FileAsset) => setPreviews((p) => (p.length >= MAX_PREVIEWS || p.some((x) => x.url === f.url) ? p : [...p, f]));
  const [area, setArea] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) { setFile(null); setPreviews([]); setArea(defaultAreaM2 ? String(defaultAreaM2) : ''); setNote(''); }
  }, [open, defaultAreaM2]);

  const save = useMutation({
    mutationFn: () => designsApi.create({
      orderId,
      fileUrl: (file ?? preview)!.url,
      previewUrl: preview!.url,
      extraPreviewUrls: previews.slice(1).map((p) => p.url),
      // Dizayner uchun m² serverda buyurtmadan hisoblanadi
      areaM2: isFinance(user.role) && (parseDecimal(area) ?? 0) > 0 ? parseDecimal(area)! : undefined,
      note: note.trim() || undefined,
    }),
    onSuccess: (v) => {
      toast.success(`Variant v${v.version} yuklandi`);
      invalidateOrderViews(qc);
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${orderNumber}: yangi dizayn varianti`}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button disabled={!preview} isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">1. Ko'rinish rasmlari (mijoz hammasini ko'radi) *</p>
          <div className="flex items-center gap-3">
            <FileButton variant="outline" size="sm" accept="image/*" kind="DESIGN" orderId={orderId} paste="modal" onUploaded={addPreview} disabled={previews.length >= MAX_PREVIEWS}>
              {previews.length ? 'Yana rasm qo\'shish' : 'Rasm tanlash'}
            </FileButton>
            <span className="text-xs text-gray-400">
              {previews.length ? <span className="text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{previews.length} ta rasm</span> : 'yoki skrinshotni Ctrl+V bilan qo\'ying'}
            </span>
          </div>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={p.url} className="relative">
                  <img src={fileUrl(p.url)} alt={`Rasm ${i + 1}`} className="h-28 w-full rounded-lg border border-gray-100 object-contain" />
                  <button type="button" aria-label="Rasmni olib tashlash" onClick={() => setPreviews((ps) => ps.filter((x) => x.url !== p.url))}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 shadow">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">2. Ishchi fayl (CDR, AI, PDF) — pechat uchun</p>
          <div className="flex items-center gap-3">
            <FileButton variant="outline" size="sm" kind="DESIGN" orderId={orderId} onUploaded={setFile}>Fayl tanlash</FileButton>
            {file && <span className="flex items-center text-sm text-emerald-700"><CheckCircle2 className="mr-1 h-4 w-4" />{file.name}</span>}
          </div>
        </div>
        {isFinance(user.role) && (
          <Input label="Maydon, m² (bo'sh qolsa buyurtmadan olinadi)" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
        )}
        <Textarea label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}
