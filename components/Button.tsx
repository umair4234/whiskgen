import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className = '',
  disabled,
  ...props 
}) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
    secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
    danger: "bg-red-500/80 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white"
  };

  return (
    <button 
      className={`
        relative px-4 py-2.5 rounded-lg font-medium transition-all duration-200 
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} 
        ${className}
      `}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && icon}
      {children}
    </button>
  );
};