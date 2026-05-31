import React, { createElement, type ReactNode } from 'react';
import {
  MetralyButton as BaseMetralyButton,
  MetralyInput as BaseMetralyInput,
  MetralySelect as BaseMetralySelect,
  MetralyCheckbox as BaseMetralyCheckbox,
  MetralySwitch as BaseMetralySwitch,
} from '@metraly/ui';
import type { MetralySelectOption } from '@metraly/ui';

// ─── MetralyButton ────────────────────────────────────────────────────────────
// Adapter is required because React.MouseEventHandler<HTMLButtonElement> type
// identity differs between the app's React domain and the linked @metraly/ui
// package domain in file: link mode.

type MetralyButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'neutral' | 'danger' | 'dashed';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

export function MetralyButton(props: MetralyButtonProps) {
  return createElement(BaseMetralyButton as unknown as React.ElementType, props);
}

// ─── MetralyInput ─────────────────────────────────────────────────────────────

type MetralyInputProps = React.ComponentPropsWithoutRef<'input'> & {
  search?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  error?: ReactNode;
  fullWidth?: boolean;
};

export function MetralyInput(props: MetralyInputProps) {
  return createElement(BaseMetralyInput as unknown as React.ElementType, props);
}

// ─── MetralySelect ────────────────────────────────────────────────────────────
// onChange is (value: string) => void — no React event, but adapter keeps the
// pattern consistent and avoids subtle linked-package type widening.

type MetralySelectProps = {
  id?: string;
  name?: string;
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  options: MetralySelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  description?: ReactNode;
  hint?: ReactNode;
  className?: string;
  onChange?: (value: string) => void;
};

export function MetralySelect(props: MetralySelectProps) {
  return createElement(BaseMetralySelect as unknown as React.ElementType, props);
}

// ─── MetralyCheckbox ─────────────────────────────────────────────────────────
// onChange is React.ChangeEventHandler<HTMLInputElement> — needs adapter for
// the same cross-domain reason as MetralyButton.

type MetralyCheckboxProps = {
  id?: string;
  name?: string;
  value?: string;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function MetralyCheckbox(props: MetralyCheckboxProps) {
  return createElement(BaseMetralyCheckbox as unknown as React.ElementType, props);
}

// ─── MetralySwitch ───────────────────────────────────────────────────────────

type MetralySwitchProps = {
  id?: string;
  name?: string;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function MetralySwitch(props: MetralySwitchProps) {
  return createElement(BaseMetralySwitch as unknown as React.ElementType, props);
}
