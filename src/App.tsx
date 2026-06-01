import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { getCurrentUser, supabase } from './lib/supabase'
import Auth from './pages/Auth'
import ClientDetail from './pages/ClientDetail'
import Clients from './pages/Clients'
import Home from './pages/Home'
import Record from './pages/Record'
import Stats from './pages/Stats'

function AppLayout() {
  const location = useLocation()
  const hideNav = /^\/clients\/[^/]+$/.test(location.pathname)

  return (
    <div className="relative min-h-svh bg-background">
      <main className="px-5 pb-24 pt-7">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/record" element={<Record />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-subtext">불러오는 중...</p>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
