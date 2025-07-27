import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function for combining class names with Tailwind CSS support
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
