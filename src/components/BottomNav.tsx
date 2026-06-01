import { BarChart3, House, NotebookPen, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '홈', icon: House },
  { to: '/clients', label: '고객', icon: Users },
  { to: '/record', label: '기록', icon: NotebookPen },
  { to: '/stats', label: '통계', icon: BarChart3 },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-mobile -translate-x-1/2 border-t border-border bg-background/95 shadow-nav backdrop-blur">
      <ul className="grid grid-cols-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  isActive ? 'text-primary' : 'text-subtext'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
