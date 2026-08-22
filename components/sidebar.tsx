'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  LogOut,
  Eye,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Sun,
  Moon,
  FlaskConical,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/admin-guard';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  category?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    category: 'main',
  },
  {
    label: 'Daily Log',
    href: '/daily-log',
    icon: <Eye className="w-5 h-5" />,
    category: 'main',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'main',
  },
  {
    label: 'Risk Prediction',
    href: '/risk-prediction',
    icon: <AlertCircle className="w-5 h-5" />,
    category: 'main',
  },
  {
    label: 'Trends',
    href: '/trends',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'main',
  },
  {
    label: 'Factor Analysis',
    href: '/factor-analysis',
    icon: <FlaskConical className="w-5 h-5" />,
    category: 'main',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
    category: 'config',
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setIsAdminUser(isAdmin(authUser));

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          const userData = {
            email: authUser.email,
            displayName: profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name}`
              : profile?.first_name 
              ? profile.first_name
              : authUser.email?.split('@')[0] || 'User'
          };
          setUser(userData);
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const mainItems = navItems.filter(item => item.category === 'main');
  const configItems = navItems.filter(item => item.category === 'config');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40 transition-transform duration-300 md:relative md:z-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      {/* Header */}
      <div className="px-6 py-8 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Eye className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg text-sidebar-foreground">EyeGuard</h1>
            <p className="text-xs text-sidebar-primary">Health Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
        <div>
          <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase">
            Main
          </p>
          <div className="space-y-1">
            {mainItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors border-l-2 ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-sidebar-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pt-4">
          <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase">
            Configuration
          </p>
          <div className="space-y-1">
            {configItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors border-l-2 ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-sidebar-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Admin Panel button — only visible to admin users */}
        {isAdminUser && (
          <div className="pt-4">
            <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase">
              Admin
            </p>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-sidebar-border p-4 space-y-4">
        {!loading && user && (
          <div>
            <p className="text-xs text-sidebar-foreground/60 uppercase font-semibold mb-1">User</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.displayName}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
          </div>
        )}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}
