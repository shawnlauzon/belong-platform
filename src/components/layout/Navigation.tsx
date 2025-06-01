import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/lib/auth';
import {
  Home,
  Map,
  Heart,
  Users,
  User,
  Bell,
  Menu,
  X,
  LogIn
} from 'lucide-react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [notificationCount] = useState(2);
  const { user, signOut } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);

  const getUserDisplayName = () => {
    if (!user) return '';
    const metadata = user.user_metadata;
    if (metadata?.first_name) return metadata.first_name;
    return user.email?.split('@')[0] || '';
  };

  const getAvatarText = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const NavLink = ({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <Link
      to={to}
      className={({ isActive }) => cn(
        "flex items-center gap-2 px-4 py-2 rounded-md transition-colors",
        isActive 
          ? "bg-primary-100 text-primary-900" 
          : "text-warmgray-700 hover:bg-primary-50 hover:text-primary-800"
      )}
      onClick={() => setIsOpen(false)}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </Link>
  );

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-primary-600 font-display font-bold text-xl">
                <Heart className="h-6 w-6 fill-primary-500 stroke-primary-50" />
                <span>Belong</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <NavLink to="/" icon={<Home className="h-5 w-5" />}>Home</NavLink>
              <NavLink to="/resources" icon={<Map className="h-5 w-5" />}>Resources</NavLink>
              <NavLink to="/thanks" icon={<Heart className="h-5 w-5" />}>Thanks</NavLink>
              <NavLink to="/community" icon={<Users className="h-5 w-5" />}>Community</NavLink>
            </nav>
            
            {/* User Menu & Mobile Button */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              {user && (
                <Button variant="ghost\" size="icon\" className="relative">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </Button>
              )}

              {/* User Profile or Sign In */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile/me" className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-medium text-warmgray-800">{getUserDisplayName()}</span>
                      <TrustBadge score={5.0} size="xs" />
                    </div>
                    <Avatar className="h-8 w-8 border border-primary-100">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>{getAvatarText()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => signOut()}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => setShowAuthDialog(true)}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 animate-fade-in">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/" icon={<Home className="h-5 w-5" />}>Home</NavLink>
              <NavLink to="/resources" icon={<Map className="h-5 w-5" />}>Resources</NavLink>
              <NavLink to="/thanks" icon={<Heart className="h-5 w-5" />}>Thanks</NavLink>
              <NavLink to="/community" icon={<Users className="h-5 w-5" />}>Community</NavLink>
              {user && (
                <NavLink to="/profile/me" icon={<User className="h-5 w-5" />}>My Profile</NavLink>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog} 
      />
    </>
  );
}