import React from 'react';

interface ContentLayoutProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ContentLayout({
  title,
  description,
  actions,
  children,
  className = ''
}: ContentLayoutProps) {
  return (
    <div className={`container mx-auto space-y-6 animate-fade-in ${className}`}>
      {/* Header Info */}
      {(title || description || actions) && (
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {title && (
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-zinc-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2.5">{actions}</div>}
        </section>
      )}

      {children}
    </div>
  );
}

export default ContentLayout;
