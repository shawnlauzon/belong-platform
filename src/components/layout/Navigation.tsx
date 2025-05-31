import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrustBadge } from '@/components/trust/TrustBadge';
import {
  Home,
  Map,
  Heart,
  Users,
  User,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { mockMembers } from '@/api/mockData';

// Mock current user - would come from auth context
const currentUser = mockMembers[0];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount] = useState(2); // Mock notification count

  const toggleMenu = () => setIsOpen(!isOpen);

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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>

            {/* User Profile */}
            <Link to="/profile/me" className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-warmgray-800">{currentUser.name}</span>
                <TrustBadge score={currentUser.trust_score} size="xs" />
              </div>
              <Avatar className="h-8 w-8 border border-primary-100">
                <AvatarImage src={currentUser.avatar_url} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>

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
            <NavLink to="/profile/me" icon={<User className="h-5 w-5" />}>My Profile</NavLink>
          </div>
        </div>
      )}
    </header>
  );
}