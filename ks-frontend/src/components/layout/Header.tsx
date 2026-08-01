import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, Menu, X } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { useProfile } from "@/contexts/ProfileContext";
import { isFramed } from "@/lib/isFramed";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Inside Rose's shell the sidebar is the navigation. Rendering the K&S
  // marketing header as well would stack two navs and waste 64px of vertical
  // space on every matter screen, so it is suppressed when framed.
  if (isFramed()) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="font-serif text-2xl font-bold text-primary-burgundy">
              Kendry & Slate
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary-burgundy transition-colors">
              Home
            </Link>
            <Link to="/services" className="text-foreground hover:text-primary-burgundy transition-colors">
              Services
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary-burgundy transition-colors">
              About
            </Link>
            <Link to="/offices" className="text-foreground hover:text-primary-burgundy transition-colors">
              Offices
            </Link>
            <Link 
              to="/client-intake" 
              className="text-foreground hover:text-primary-burgundy transition-colors"
            >
              Client Intake
            </Link>
          </nav>

          {/* Demo System Button */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Build timestamp badge for verification */}
            <div className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {(() => {
                const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
                const dt = new Date(iso);
                return dt.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
              })()} AEST
            </div>
            <Link to="/profile-selection">
              <Button variant="outline" className="border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground">
                <LogIn className="w-4 h-4 mr-2" />
                Demo System
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-background border-t border-border py-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary-burgundy transition-colors px-4 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/services" 
                className="text-foreground hover:text-primary-burgundy transition-colors px-4 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                to="/about" 
                className="text-foreground hover:text-primary-burgundy transition-colors px-4 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/offices" 
                className="text-foreground hover:text-primary-burgundy transition-colors px-4 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Offices
              </Link>
              <Link 
                to="/client-intake" 
                className="text-foreground hover:text-primary-burgundy transition-colors px-4 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Client Intake
              </Link>
              <Link 
                to="/profile-selection" 
                className="mx-4"
                onClick={() => setIsMenuOpen(false)}
              >
                <Button variant="outline" className="w-full border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground">
                  <LogIn className="w-4 h-4 mr-2" />
                  Demo System
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}