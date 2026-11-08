import type { ReactNode } from 'react'

import { TabShell } from '@/lib/components/ui/app-shell'

/**
 * (top-level) holds only the screens reachable from the tab bar. Each tab has a folder in this
 * group and an entry in services/app/page/layout/app-tabs.ts; every other app screen belongs in
 * (detail) or (entry).
 *
 * <TabShell> is one AppGroupLayout (SsgoiPageBoundary) around the tab body and the tab bar:
 * tab → tab swaps only the page's AppScreen boundary and the bar stays; tab → detail hides this
 * whole group, bar included, and Back shows it again with its state (Cache Components keeps it in
 * <Activity>). Render nothing outside <TabShell> except an `@modal` slot, as a sibling:
 *   return <><TabShell>{children}</TabShell>{modal}</>
 */
export default function TopLevelLayout({ children }: { children: ReactNode }) {
  return <TabShell>{children}</TabShell>
}
