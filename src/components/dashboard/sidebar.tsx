'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Profile } from '@/types'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  FileText,
  ClipboardList,
  Flame,
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Purchase Orders', icon: ShoppingBag },
  { href: '/dashboard/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: FileText, adminOnly: true },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(item => !item.adminOnly || profile.role === 'admin')

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#ffffff] border-r border-gray-200 h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-900 shadow-lg shadow-red-900/40">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Notofire</p>
            <p className="text-xs text-gray-500">PO Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredItems.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                  active
                    ? 'bg-red-600/20 text-red-600 border border-red-600/30'
                    : 'text-gray-400 hover:text-gray-900 hover:bg-red-50'
                )}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-red-600' : 'text-gray-500 group-hover:text-gray-600')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
