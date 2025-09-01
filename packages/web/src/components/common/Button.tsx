import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
};

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: '',
};

export default function Button({
  variant = 'secondary',
  disabled,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;
  return (
    <button
      type={type}
      disabled={disabled}
      className={`px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? '' : 'hoverable'} ${variantClass} ${className}`}
      {...rest}
    />
  );
}
