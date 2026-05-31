import React, { createElement, type ReactNode } from 'react';
import { MetralyButton as BaseMetralyButton, MetralyInput as BaseMetralyInput } from '@metraly/ui';

type MetralyButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  variant?: string;
  size?: string;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

export function MetralyButton(props: MetralyButtonProps) {
  return createElement(BaseMetralyButton as unknown as React.ElementType, props);
}

type MetralyInputProps = React.ComponentPropsWithoutRef<'input'> & {
  search?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function MetralyInput(props: MetralyInputProps) {
  return createElement(BaseMetralyInput as unknown as React.ElementType, props);
}
