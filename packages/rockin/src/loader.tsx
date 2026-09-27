'use client';

import { ProgressProvider } from '@bprogress/next/app';
import type { ComponentProps, ReactNode } from 'react';

type ProgressProviderProps = ComponentProps<typeof ProgressProvider>;

export type TopLoaderProps = Omit<
  ProgressProviderProps,
  'children' | 'color' | 'height' | 'options'
> & {
  children: ReactNode;
  /** Progress bar color. Accepts any valid CSS color, including a token. */
  color?: string;
  /** Progress bar height. Accepts any valid CSS length. */
  height?: string;
  /** Show the provider's spinner alongside the top progress bar. */
  showSpinner?: boolean;
  /** Additional BProgress options. These override the component defaults. */
  options?: ProgressProviderProps['options'];
};

export function TopLoader({
  children,
  color = 'var(--brand)',
  height = '2px',
  options,
  showSpinner = false,
  ...props
}: TopLoaderProps) {
  return (
    <ProgressProvider
      {...props}
      color={color}
      height={height}
      options={{ showSpinner, ...options }}
    >
      {children}
    </ProgressProvider>
  );
}
