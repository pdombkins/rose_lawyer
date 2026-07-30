import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Building, Home, MapPin, Scale, Users, CheckCircle } from "lucide-react";
import propertyBackground from "@/assets/property-background.jpg";

export default function Property() {
  const capabilities = [
    {
      title: "Commercial Property",
      description: "Acquisitions, disposals, and leasing of commercial real estate",
      icon: Building
    },
    {
      title: "Real Estate Finance",
      description: "Property development finance and investment structuring", 
      icon: Scale
    },
    {
      title: "Development & Planning",
      description: "Planning applications, development agreements, and construction contracts",
      icon: MapPin
    },
    {
      title: "Property Portfolios",
      description: "Large-scale portfolio transactions and property investment funds",
      icon: Home
    }
  ];

  const experience = [
    "Advised on A$850M acquisition of prime Sydney office portfolio",
    "Structured A$1.2B real estate investment fund for institutional clients",
    "Led development of major mixed-use scheme worth A$600M",
    "Managed property aspects of A$2B corporate acquisition involving 200+ properties"
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
              backgroundImage: `url(${propertyBackground})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <Building className="w-8 h-8 text-primary-burgundy" />
                <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
                  Property Law
                </span>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Property &
                <span className="block text-primary-burgundy">
                  Real Estate Law
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Comprehensive property law services covering commercial real estate transactions, 
                development projects, and property investment across all sectors and asset classes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Discuss Property Matters
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
                Our Property Services
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Full-service property law expertise across all real estate sectors
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

        {/* Sectors */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Property Sectors
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Specialist expertise across all major property asset classes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Offices</h3>
                <p className="text-muted-foreground">Prime and secondary office buildings</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Retail</h3>
                <p className="text-muted-foreground">Shopping centres and high street retail</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Industrial</h3>
                <p className="text-muted-foreground">Warehouses and logistics facilities</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Mixed-Use</h3>
                <p className="text-muted-foreground">Complex development projects</p>
              </div>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                  Recent Transactions
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Our property team has successfully completed major real estate transactions 
                  across all sectors and asset classes.
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
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">A$5B+</div>
                  <div className="text-muted-foreground">Property Value</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">250+</div>
                  <div className="text-muted-foreground">Transactions</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">30+</div>
                  <div className="text-muted-foreground">Years Experience</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">15</div>
                  <div className="text-muted-foreground">Cities Covered</div>
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
                Realise Property Value
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Contact our property specialists to discuss your real estate objectives 
                and transaction requirements.
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