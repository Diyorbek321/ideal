import React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Download, ImagePlus, MessageSquare, X } from 'lucide-react';
import { publicApi } from '@/api';
import { DESIGN_STATUS_LABELS } from '@/lib/labels';
import { fileUrl, formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { errorMessage } from '@/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';

// Mijoz uchun ochiq sahifa — login talab qilinmaydi
export default function PublicApprovalPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [mode, setMode] = React.useState<'view' | 'revision'>('view');
  const [comment, setComment] = React.useState('');
  const [markupUrl, setMarkupUrl] = React.useState<string | undefined>();
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<'APPROVE' | 'REQUEST_CHANGES' | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['public', token], queryFn: () => publicApi.get(token), retry: false });
  const decide = useMutation({
    mutationFn: (decision: 'APPROVE' | 'REQUEST_CHANGES') => publicApi.decide(token, decision, comment.trim() || undefined, markupUrl),
    onSuccess: (_, d) => setDone(d),
  });

  const uploadMarkup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setUploadError(null);
    try {
      setMarkupUrl((await publicApi.uploadMarkup(token, f)).url);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Yuklanmoqda...</div>;
  if (error || !data) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4"><Card className="w-full max-w-md p-8"><ErrorState error={error} /></Card></div>;
  }

  const company = data.company?.name ?? 'Ideal Dizayn';
  if (done) {
    const approved = done === 'APPROVE';
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${approved ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        <Card className="w-full max-w-md p-12 text-center">
          <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${approved ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {approved ? <Check className="h-10 w-10 text-emerald-600" /> : <MessageSquare className="h-10 w-10 text-amber-600" />}
          </div>
          <h1 className="mb-2 text-2xl font-black text-gray-900">{approved ? 'Tasdiqlandi!' : 'Izohingiz yuborildi'}</h1>
          <p className="mb-8 text-gray-600">
            {approved ? 'Dizayn tasdiqlandi. Buyurtmangiz ishlab chiqarishga yo\'naltirildi.' : 'Dizayner o\'zgartirishlarni kiritib, yangi variantni yuboradi.'}
          </p>
          <p className="text-sm italic text-gray-400">"{company}" jamoasi sizga rahmat aytadi!</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center space-x-3">
            {data.company?.logoUrl ? <img src={fileUrl(data.company.logoUrl)} alt={company} className="h-8" /> : <span className="text-xl font-black text-blue-600">{company}</span>}
            <Badge variant="outline">TASDIQLASH</Badge>
          </div>
          <p className="text-sm font-bold text-gray-900">{data.order.number}</p>
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-8 px-4 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Dizayn — ${data.version}-variant`} description="Kattalashtirish uchun rasm ustiga bosing">
            <a href={fileUrl(data.previewUrl)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-100 bg-white">
              <img src={fileUrl(data.previewUrl)} alt="Dizayn" className="h-auto w-full cursor-zoom-in" />
            </a>
            {data.note && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{data.note}</p>}
            <div className="mt-6 flex justify-center">
              <a href={fileUrl(data.previewUrl)} download><Button variant="outline"><Download className="mr-2 h-4 w-4" />Yuklab olish</Button></a>
            </div>
          </Card>

          {mode === 'revision' && data.canDecide && (
            <Card className="border-amber-200 bg-amber-50">
              <h3 className="mb-4 flex items-center font-bold text-amber-900"><MessageSquare className="mr-2 h-5 w-5" />Nimani o'zgartirish kerak?</h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-amber-200 p-4 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="Masalan: shriftni kattalashtiring, telefon raqamini qo'shing..."
                maxLength={2000}
              />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadMarkup} />
              <Button variant="ghost" size="sm" className="mt-2 text-amber-800" isLoading={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />{markupUrl ? 'Rasm biriktirildi ✓' : 'Belgilangan rasm biriktirish'}
              </Button>
              {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
              {decide.error && <p className="mt-2 text-sm text-red-600">{(decide.error as Error).message}</p>}
              <div className="mt-4 flex justify-end space-x-3">
                <Button variant="ghost" onClick={() => { setMode('view'); setComment(''); setMarkupUrl(undefined); setUploadError(null); }}>Bekor qilish</Button>
                <Button className="bg-amber-600 hover:bg-amber-700" disabled={!comment.trim()} isLoading={decide.isPending} onClick={() => decide.mutate('REQUEST_CHANGES')}>
                  Yuborish
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Buyurtma">
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Mijoz</p>
                <p className="font-bold text-gray-900">{data.order.clientName}</p>
              </div>
              <div className="space-y-2 border-t border-gray-50 pt-4">
                {data.order.items.map((it, i) => (
                  <div key={i}>
                    <p className="text-sm font-bold text-gray-900">{it.productType}</p>
                    <p className="text-xs text-gray-500">{it.widthCm}×{it.heightCm} sm × {it.quantity}{it.finishing.length ? ` · ${it.finishing.join(', ')}` : ''}</p>
                  </div>
                ))}
              </div>
              {data.order.deadline && <p className="text-sm text-gray-600">Topshirish: {formatDate(data.order.deadline)}</p>}
              <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                <p className="text-xs font-black uppercase text-gray-400">Jami</p>
                <p className="text-2xl font-black text-blue-600">{formatCurrency(data.order.totalAmount)}</p>
              </div>
            </div>
          </Card>

          {data.canDecide && mode === 'view' && (
            <div className="grid grid-cols-1 gap-4">
              {decide.error && <p className="text-sm text-red-600">{(decide.error as Error).message}</p>}
              <Button size="lg" className="h-16 bg-emerald-600 text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700" isLoading={decide.isPending} onClick={() => decide.mutate('APPROVE')}>
                <Check className="mr-2 h-6 w-6" />Tasdiqlayman
              </Button>
              <Button variant="outline" size="lg" className="h-16 border-amber-200 text-lg text-amber-700 hover:bg-amber-50" onClick={() => setMode('revision')}>
                <X className="mr-2 h-6 w-6" />O'zgartirish kerak
              </Button>
            </div>
          )}
          {!data.canDecide && (
            <Card className="p-5 text-center">
              <Badge variant={data.status === 'APPROVED' ? 'success' : 'default'}>{DESIGN_STATUS_LABELS[data.status]}</Badge>
              <p className="mt-2 text-sm text-gray-600">
                {data.status === 'SUPERSEDED' ? 'Bu variant eskirgan — yangi havolani kuting.' : 'Bu variant bo\'yicha qaror qabul qilingan.'}
              </p>
            </Card>
          )}

          {data.company?.phone && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <h4 className="mb-2 font-bold text-blue-900">Savollar bormi?</h4>
              <p className="mb-4 text-sm text-blue-700">Menejer bilan bog'laning:</p>
              <a href={`tel:${data.company.phone}`} className="flex items-center justify-center rounded-xl bg-white p-3 font-bold text-blue-600 shadow-sm">
                {formatPhone(data.company.phone)}
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
