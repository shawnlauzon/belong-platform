import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TrustBadge } from '../trust/TrustBadge';
import { AuthDialog } from '../users/AuthDialog';
import { getInitials } from '../utils';
import { eventBus } from '@belongnetwork/core';
import {
  Home,
  Map,
  Heart,
  Users,
  User,
  Bell,
  Menu,
  X,
  LogIn,
} from 'lucide-react';
import { useBelongStore } from '@belongnetwork/core';

type NavLinkProps = {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

export function Navigation() {
  const { user } = useBelongStore((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [notificationCount] = useState(2);

  const toggleMenu = () => setIsOpen(!isOpen);

  const getUserDisplayName = () => {
    if (!user) return '';

    // Return first name only if available
    if (user?.first_name) {
      return user.first_name;
    }

    // Final fallback to email username
    return user.email?.split('@')[0] || '';
  };

  const getAvatarUrl = () => {
    return user?.avatar_url;
  };

  const getAvatarText = () => {
    if (!user) return 'G'; // for Guest

    return getInitials(user.first_name, user.last_name);
  };

  const NavLink: React.FC<NavLinkProps> = ({ to, icon, children }) => (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-warmgray-700 hover:bg-primary-50 hover:text-primary-800"
      activeProps={{
        className: 'bg-primary-100 text-primary-900',
      }}
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
              <Link
                to="/"
                className="flex items-center gap-2 text-primary-600 font-display font-bold text-xl"
              >
                <Heart className="h-6 w-6 fill-primary-500 stroke-primary-50" />
                <span>Belong</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <NavLink to="/" icon={<Home className="h-5 w-5" />}>
                Home
              </NavLink>
              <NavLink to="/resources" icon={<Map className="h-5 w-5" />}>
                Resources
              </NavLink>
              <NavLink to="/thanks" icon={<Heart className="h-5 w-5" />}>
                Thanks
              </NavLink>
              <NavLink to="/community" icon={<Users className="h-5 w-5" />}>
                Community
              </NavLink>
            </nav>

            {/* User Menu & Mobile Button */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              {user && (
                <Button variant="ghost" size="icon" className="relative">
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
                      <span className="text-sm font-medium text-warmgray-800">
                        {getUserDisplayName()}
                      </span>
                      <TrustBadge score={5.0} size="xs" />
                    </div>
                    <Avatar className="h-8 w-8 border border-primary-100">
                      <AvatarImage src={getAvatarUrl() || undefined} />
                      <AvatarFallback>{getAvatarText()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eventBus.emit('sign_out', {})}
                  >
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
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={toggleMenu}
              >
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 animate-fade-in">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/" icon={<Home className="h-5 w-5" />}>
                Home
              </NavLink>
              <NavLink to="/resources" icon={<Map className="h-5 w-5" />}>
                Resources
              </NavLink>
              <NavLink to="/thanks" icon={<Heart className="h-5 w-5" />}>
                Thanks
              </NavLink>
              <NavLink to="/community" icon={<Users className="h-5 w-5" />}>
                Community
              </NavLink>
              {user && (
                <NavLink to="/profile/me" icon={<User className="h-5 w-5" />}>
                  My Profile
                </NavLink>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
}
