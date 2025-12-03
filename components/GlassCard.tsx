import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title, actions }) => {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          {title && <h3 className="text-lg font-semibold text-white tracking-wide">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};