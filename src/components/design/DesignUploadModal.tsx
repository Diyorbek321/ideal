import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
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

// Ikki fayl: ishchi fayl (cdr/ai/pdf) — pechatnikka, rasm (jpg/png) — mijozga ko'rsatiladi
export function DesignUploadModal({ open, onClose, orderId, orderNumber, defaultAreaM2 }: Props) {
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const [file, setFile] = React.useState<FileAsset | null>(null);
  const [preview, setPreview] = React.useState<FileAsset | null>(null);
  const [area, setArea] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) { setFile(null); setPreview(null); setArea(defaultAreaM2 ? String(defaultAreaM2) : ''); setNote(''); }
  }, [open, defaultAreaM2]);

  const save = useMutation({
    mutationFn: () => designsApi.create({
      orderId,
      fileUrl: (file ?? preview)!.url,
      previewUrl: preview!.url,
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
          <p className="text-sm font-medium text-gray-700">1. Ko'rinish rasmi (mijoz shuni ko'radi) *</p>
          <div className="flex items-center gap-3">
            <FileButton variant="outline" size="sm" accept="image/*" kind="DESIGN" orderId={orderId} onUploaded={setPreview}>Rasm tanlash</FileButton>
            {preview && <span className="flex items-center text-sm text-emerald-700"><CheckCircle2 className="mr-1 h-4 w-4" />{preview.name}</span>}
          </div>
          {preview && <img src={fileUrl(preview.url)} alt="Ko'rinish" className="max-h-48 rounded-lg border border-gray-100" />}
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
