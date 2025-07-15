import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCO2(grams: number) {
  if (grams < 1000) {
    return `${formatNumber(grams)} gCO₂e`;
  }
  return `${formatNumber(grams / 1000, 3)} kgCO₂e`;
}

export function formatEnergy(kwh: number) {
  if (kwh < 1) {
    return `${formatNumber(kwh * 1000, 0)} Wh`;
  }
  return `${formatNumber(kwh, 3)} kWh`;
}

export function formatTokenCount(tokens: number) {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  }
  return `${formatNumber(tokens / 1000, 1)}k tokens`;
}

export function formatDate(date: Date | string | number) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number) {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
