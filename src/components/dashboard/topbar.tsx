'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { LogOut, Bell, Menu, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  FileText,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: FileText, adminOnly: true },
]

export default function TopBar({ profile }: { profile: Profile }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredItems = navItems.filter(item => !item.adminOnly || profile.role === 'admin')

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 h-16 border-b border-gray-200 bg-[#ffffff]/90 backdrop-blur-sm flex-shrink-0">
        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-gray-400 hover:text-gray-900"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page breadcrumb / title */}
        <div className="hidden md:block">
          <p className="text-sm text-gray-400">
            Welcome back, <span className="text-gray-900 font-medium">{profile.full_name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#ffffff] border-r border-gray-200 flex flex-col">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-900">
                <Flame className="w-5 h-5 text-gray-900" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Notofire</p>
                <p className="text-xs text-gray-500">PO Portal</p>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {filteredItems.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      active ? 'bg-red-600/20 text-red-600' : 'text-gray-400 hover:text-gray-900 hover:bg-red-50'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="px-4 py-4 border-t border-gray-200">
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
