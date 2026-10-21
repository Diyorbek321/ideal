import { cn } from '@/lib/utils';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

// Sarlavhasiz kartada ichki padding yo'q — uni className orqali beriladi
export function Card({ title, description, actions, footer, children, className, ...props }: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white', className)} {...props}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {hasHeader ? <div className="p-5 pt-0 sm:p-6 sm:pt-0">{children}</div> : children}
      {footer && <div className="border-t border-gray-100 p-5 pt-4 sm:p-6 sm:pt-4">{footer}</div>}
    </div>
  );
}
