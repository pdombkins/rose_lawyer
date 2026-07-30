import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-primary-burgundy text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold">Kendry & Slate</h3>
            <p className="text-primary-foreground/80">
              Leading global law firm specialising in mergers and acquisitions. 
              Expert legal counsel for complex corporate transactions.
            </p>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-semibold">Services</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><Link to="/services/mergers-acquisitions" className="hover:text-primary-foreground transition-colors">Mergers & Acquisitions</Link></li>
              <li><Link to="/services/corporate-restructuring" className="hover:text-primary-foreground transition-colors">Corporate Restructuring</Link></li>
              <li><Link to="/services/private-equity" className="hover:text-primary-foreground transition-colors">Private Equity</Link></li>
              <li><Link to="/services/due-diligence" className="hover:text-primary-foreground transition-colors">Due Diligence</Link></li>
              <li><Link to="/services/capital-markets" className="hover:text-primary-foreground transition-colors">Capital Markets</Link></li>
              <li><Link to="/services/employment-law" className="hover:text-primary-foreground transition-colors">Employment Law</Link></li>
              <li><Link to="/services/property" className="hover:text-primary-foreground transition-colors">Property Law</Link></li>
              <li><Link to="/services/privacy-cyber" className="hover:text-primary-foreground transition-colors">Privacy & Cyber</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">About Us</Link></li>
              <li><Link to="/offices" className="hover:text-primary-foreground transition-colors">Our Offices</Link></li>
              <li><Link to="/client-intake" className="hover:text-primary-foreground transition-colors">Client Intake</Link></li>
              <li><Link to="/profile-selection" className="hover:text-primary-foreground transition-colors">Demo System</Link></li>
              <li><Link to="/diag" className="hover:text-primary-foreground transition-colors">Diagnostics</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <div className="space-y-2 text-primary-foreground/80">
              <p>Sydney Headquarters<br />Level 42, Aurora Place<br />88 Phillip Street<br />Sydney NSW 2000</p>
              <p>+61 2 9999 8888</p>
              <p>info@kendryslate.com.au</p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60">
          <p>&copy; 2024 Kendry & Slate. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  );
}