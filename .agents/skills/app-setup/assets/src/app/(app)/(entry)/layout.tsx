import type { ReactNode } from 'react'

import { AppGroupLayout } from '@/lib/components/ui/app-group-layout'

/**
 * (entry) holds standalone screens without app chrome: login, onboarding, invite, payment.
 * They share the session, <Ssgoi> and scroller of (app); this layout adds only the group boundary.
 * Each page still renders AppScreen; omit `bar` (boundary only, no app bar) when the screen owns its top edge.
 */
export default function EntryLayout({ children }: { children: ReactNode }) {
  return <AppGroupLayout>{children}</AppGroupLayout>
}
