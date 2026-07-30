import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Scale, Building, TrendingUp, Shield, Users, CheckCircle } from "lucide-react";
import restructuringBackground from "@/assets/restructuring-background.jpg";

export default function CorporateRestructuring() {
  const capabilities = [
    {
      title: "Spin-offs & Carve-outs",
      description: "Strategic separation of business units to unlock shareholder value",
      icon: TrendingUp
    },
    {
      title: "Joint Ventures",
      description: "Structuring collaborative partnerships and strategic alliances",
      icon: Users
    },
    {
      title: "Corporate Governance",
      description: "Board composition, director duties, and governance frameworks",
      icon: Shield
    },
    {
      title: "Regulatory Compliance",
      description: "Ensuring compliance across multiple jurisdictions and sectors",
      icon: CheckCircle
    }
  ];

  const experience = [
    "Advised on the A$2.3B demerger of RetailCorp's property portfolio",
    "Structured joint venture between TechGlobal and InnovateAsia worth A$800M",
    "Led governance restructure for ASX 200 financial services group",
    "Advised on cross-border restructuring involving 15 jurisdictions"
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="law-firm-hero py-20">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${restructuringBackground})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <Scale className="w-8 h-8 text-primary-burgundy" />
                <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
                  Corporate Restructuring
                </span>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Strategic Corporate
                <span className="block text-primary-burgundy">
                  Restructuring
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Comprehensive restructuring advice to optimise corporate structures, unlock value, 
                and position businesses for sustainable growth across all market conditions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Start Your Restructuring
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Our Restructuring Capabilities
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                End-to-end restructuring solutions tailored to your strategic objectives
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {capabilities.map((capability, index) => {
                const IconComponent = capability.icon;
                return (
                  <Card key={index} className="premium-card group hover:-translate-y-1 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary-burgundy/10 rounded-lg flex items-center justify-center group-hover:bg-primary-burgundy transition-colors">
                          <IconComponent className="w-6 h-6 text-primary-burgundy group-hover:text-primary-foreground" />
                        </div>
                        <CardTitle className="font-serif text-xl text-foreground">
                          {capability.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {capability.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                  Recent Experience
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Our team has successfully executed some of the market's most complex restructuring transactions.
                </p>
                
                <ul className="space-y-4">
                  {experience.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">A$25B+</div>
                  <div className="text-muted-foreground">Transaction Value</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">300+</div>
                  <div className="text-muted-foreground">Deals Completed</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">20+</div>
                  <div className="text-muted-foreground">Years Experience</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">15</div>
                  <div className="text-muted-foreground">Jurisdictions</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary-burgundy text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Ready to Restructure?
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Contact our restructuring specialists to discuss your strategic objectives 
                and explore optimal restructuring solutions.
              </p>
              <Link to="/client-intake">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                  Start Your Matter
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}