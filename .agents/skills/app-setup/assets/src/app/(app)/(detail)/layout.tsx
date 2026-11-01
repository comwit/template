import type { ReactNode } from 'react'

import { AppGroupLayout } from '@/lib/components/ui/app-group-layout'

/**
 * (detail) is the back stack: fullscreen screens without the tab bar. The group boundary enters
 * when a tab opens a detail; detail → detail swaps only each page's DetailScreen boundary.
 * Keep it the top-most element; follow src/app/.ai.md for product routes and SEO variants.
 */
export default function DetailLayout({ children }: { children: ReactNode }) {
  return <AppGroupLayout>{children}</AppGroupLayout>
}
