import { adminUser } from '@/services/admin/api/user'
import { AdminLayoutClient } from './client'

/**
 * Await basic admin data below the parent App Router Suspense(fallback=null).
 * Read the installed admin authentication session through getMe.
 * Protected routes retain their server guards; load separate tables lazily.
 */
export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await adminUser.getMe()
  return <AdminLayoutClient initialUser={initialUser}>{children}</AdminLayoutClient>
}
