import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Scale } from "lucide-react";
import corporateBackground from "@/assets/corporate-background.jpg";
export function HeroSection() {

  return <section className="law-firm-hero min-h-[60vh] md:min-h-screen flex items-center relative overflow-hidden">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 animate-[moveBackground_20s_ease-in-out_infinite]" style={{
        backgroundImage: `url(${corporateBackground})`,
        willChange: 'transform'
      }} />
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 animate-[moveBackground_25s_ease-in-out_infinite_reverse]" style={{
        backgroundImage: `url(${corporateBackground})`,
        transform: 'translate3d(0, 0, 0) scale(1.1) rotate(0.5deg)',
        willChange: 'transform'
      }} />
      </div>
      
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent z-10" />

      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-4xl">
          <div className="flex items-center space-x-3 mb-6">
            <Scale className="w-8 h-8 text-primary-burgundy" />
            <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
              Established 1987
            </span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-foreground leading-tight mb-6">
            Expert M&A Legal
            <span className="block text-primary-burgundy">
              Counsel
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Kendry & Slate delivers sophisticated legal solutions for complex mergers, 
            acquisitions, and corporate transactions across Australia and beyond.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/client-intake">
              <Button size="lg" className="elegant-button group">
                Start Your Matter
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link to="/services">
              <Button variant="outline" size="lg" className="border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground">
                Our Expertise
              </Button>
            </Link>
            
          </div>
          
          {/* Key stats */}
          <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-border/50">
            <div>
              <div className="text-2xl font-bold text-primary-burgundy">$50B+</div>
              <div className="text-muted-foreground">Transaction Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-burgundy">500+</div>
              <div className="text-muted-foreground">Deals Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-burgundy">8</div>
              <div className="text-muted-foreground">Global Offices</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-burgundy">37</div>
              <div className="text-muted-foreground">Years Experience</div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}