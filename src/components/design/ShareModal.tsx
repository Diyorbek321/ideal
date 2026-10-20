import { Copy, Send } from 'lucide-react';
import type { ShareInfo } from '@/types';
import { copyText, telegramShareUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

// Mijozga yuboriladigan havola va tayyor Telegram xabari
export function ShareModal({ info, onClose }: { info: ShareInfo | null; onClose: () => void }) {
  const toast = useToast();
  const copy = async (text: string) => {
    if (await copyText(text)) toast.success('Nusxa olindi');
    else toast.error(new Error('Nusxa olib bo\'lmadi — matnni qo\'lda belgilang'));
  };

  return (
    <Modal open={!!info} onClose={onClose} title="Mijozga yuborish">
      {info && (
        <div className="space-y-4">
          {info.smsQueued && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Mijozga havola SMS orqali avtomatik yuborildi. Kerak bo'lsa Telegram orqali ham yuboring.</p>}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Tasdiqlash havolasi</p>
            <div className="flex gap-2">
              <input readOnly value={info.approvalUrl} className="h-10 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm" onFocus={(e) => e.target.select()} />
              <Button variant="outline" onClick={() => copy(info.approvalUrl)} aria-label="Havoladan nusxa"><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">Telegram xabari</p>
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-800">{info.telegramMessage}</pre>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => copy(info.telegramMessage)}><Copy className="mr-2 h-4 w-4" />Xabardan nusxa</Button>
            <a href={telegramShareUrl(info.telegramMessage)} target="_blank" rel="noreferrer">
              <Button><Send className="mr-2 h-4 w-4" />Telegram'da yuborish</Button>
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}
