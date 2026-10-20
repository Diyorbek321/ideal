import React from 'react';
import { Upload } from 'lucide-react';
import { filesApi } from '@/api';
import type { FileAsset } from '@/types';
import { Button, type ButtonProps } from './Button';
import { useToast } from './Toast';

interface FileButtonProps extends Omit<ButtonProps, 'onChange'> {
  accept?: string;
  kind?: FileAsset['kind'];
  orderId?: string;
  onUploaded: (file: FileAsset) => void;
  capture?: boolean;
}

// Faylni darhol /files ga yuklaydi va natijani qaytaradi
export function FileButton({ accept, kind, orderId, onUploaded, capture, children, ...props }: FileButtonProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onUploaded(await filesApi.upload(file, { kind, orderId }));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={ref} type="file" className="hidden" accept={accept} onChange={onChange} {...(capture ? { capture: 'environment' } : {})} />
      <Button type="button" isLoading={busy} onClick={() => ref.current?.click()} {...props}>
        {children ?? (
          <>
            {!busy && <Upload className="mr-2 h-4 w-4" />}
            Fayl yuklash
          </>
        )}
      </Button>
    </>
  );
}
