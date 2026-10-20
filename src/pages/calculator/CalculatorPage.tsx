/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Calculator, ArrowRight, Printer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

const itemSchema = z.object({
  productType: z.string().min(1, 'Tanlang'),
  material: z.string().min(1, 'Tanlang'),
  width: z.number().min(1, 'Xato'),
  height: z.number().min(1, 'Xato'),
  quantity: z.number().min(1, 'Xato'),
  finishing: z.array(z.string()).optional(),
});

const schema = z.object({
  items: z.array(itemSchema),
  designFee: z.number().default(0),
  installationFee: z.number().default(0),
  urgencyMultiplier: z.number().default(1),
});

type FormValues = z.infer<typeof schema>;

export default function CalculatorPage() {
  const { register, control, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ productType: 'Banner', material: 'Banner 440g', width: 100, height: 100, quantity: 1, finishing: [] }],
      designFee: 0,
      installationFee: 0,
      urgencyMultiplier: 1,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedDesignFee = watch('designFee');
  const watchedInstallationFee = watch('installationFee');
  const watchedUrgency = watch('urgencyMultiplier');

  const calculateSubtotal = () => {
    return watchedItems.reduce((acc, item) => {
      const area = (item.width * item.height) / 10000;
      const unitPrice = 25000; // Mock unit price
      return acc + (area * unitPrice * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const total = (subtotal + watchedDesignFee + watchedInstallationFee) * watchedUrgency;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Narx kalkulyatori</h1>
          <p className="text-gray-500">Buyurtma narxini hisoblash va taklif tayyorlash</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            PDF/Chop etish
          </Button>
          <Button>
            Buyurtmaga aylantirish
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Mahsulotlar" description="O'lcham va materiallarni kiriting">
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-100 rounded-xl space-y-4 bg-gray-50/30">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900">Mahsulot #{index + 1}</h4>
                    <button onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Input label="Turi" {...register(`items.${index}.productType`)} />
                    <Input label="Material" {...register(`items.${index}.material`)} />
                    <Input label="Soni" type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                    <Input label="Eni (cm)" type="number" {...register(`items.${index}.width`, { valueAsNumber: true })} />
                    <Input label="Bo'yi (cm)" type="number" {...register(`items.${index}.height`, { valueAsNumber: true })} />
                    <div className="flex flex-col justify-end pb-2">
                       <p className="text-xs text-gray-500">Maydon: {((watchedItems[index]?.width * watchedItems[index]?.height) / 10000).toFixed(2)} m²</p>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={() => append({ productType: '', material: '', width: 0, height: 0, quantity: 1 })}>
                <Plus className="h-4 w-4 mr-2" />
                Yana qo'shish
              </Button>
            </div>
          </Card>

          <Card title="Qo'shimcha xizmatlar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Dizayn xizmati (so'm)" type="number" {...register('designFee', { valueAsNumber: true })} />
              <Input label="O'rnatish xizmati (so'm)" type="number" {...register('installationFee', { valueAsNumber: true })} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Shoshilinchlik koeffitsienti</label>
                <select 
                  className="w-full h-10 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  {...register('urgencyMultiplier', { valueAsNumber: true })}
                >
                  <option value={1}>Oddiy (1.0x)</option>
                  <option value={1.2}>Tezkor (+20%)</option>
                  <option value={1.5}>Shoshilinch (+50%)</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 bg-blue-600 text-white border-0 shadow-xl overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-6">
                <Calculator className="h-5 w-5 opacity-80" />
                <h3 className="font-bold uppercase tracking-wider text-sm opacity-90">Hisob-kitob</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Mahsulotlar:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Xizmatlar:</span>
                  <span>{formatCurrency(watchedDesignFee + watchedInstallationFee)}</span>
                </div>
                {watchedUrgency > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Shoshilinch:</span>
                    <span>+{((watchedUrgency - 1) * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="border-t border-white/20 pt-4 mt-4">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-lg">JAMI:</span>
                    <span className="text-3xl font-black">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-12 -right-12 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
          </Card>

          <Card title="Materiallar sarfi" description="Taxminiy xarajat">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Material tannarxi:</span>
                <span className="font-medium">{formatCurrency(subtotal * 0.4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ishchi kuchi:</span>
                <span className="font-medium">{formatCurrency(subtotal * 0.1)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between text-sm font-bold">
                  <span>Sof foyda:</span>
                  <span className="text-emerald-600">{formatCurrency(total - (subtotal * 0.5))}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
