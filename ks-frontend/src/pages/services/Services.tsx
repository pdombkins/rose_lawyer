import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, FileCheck, Gavel, HandCoins, Scale, Users, Building, Shield } from "lucide-react";
import corporateBackground from "@/assets/corporate-background.jpg";
import { DocumentGenerator, downloadDocument } from "@/utils/documentGenerator";
import { useToast } from "@/hooks/use-toast";

const services = [
  {
    id: "mergers-acquisitions",
    title: "Mergers & Acquisitions",
    description: "Strategic counsel for complex M&A transactions, from initial structuring through completion.",
    icon: Building2,
    features: ["Due Diligence", "Transaction Structuring", "Regulatory Approvals", "Cross-border Transactions"],
    stats: { deals: "500+", value: "$50B+", years: "25+" }
  },
  {
    id: "corporate-restructuring", 
    title: "Corporate Restructuring",
    description: "Comprehensive restructuring advice to optimise corporate structures and operations.",
    icon: Scale,
    features: ["Spin-offs & Carve-outs", "Joint Ventures", "Corporate Governance", "Regulatory Compliance"],
    stats: { deals: "300+", value: "$25B+", years: "20+" }
  },
  {
    id: "private-equity",
    title: "Private Equity",
    description: "Specialised legal services for private equity funds, portfolio companies, and investors.",
    icon: HandCoins,
    features: ["Fund Formation", "Portfolio Investments", "Exit Strategies", "Management Buyouts"],
    stats: { deals: "400+", value: "$30B+", years: "15+" }
  },
  {
    id: "due-diligence",
    title: "Due Diligence",
    description: "Thorough legal and commercial due diligence to identify risks and opportunities.",
    icon: FileCheck,
    features: ["Legal Due Diligence", "Regulatory Review", "Risk Assessment", "Compliance Audits"],
    stats: { deals: "800+", value: "$80B+", years: "25+" }
  },
  {
    id: "capital-markets",
    title: "Capital Markets",
    description: "Expert guidance on public and private capital raising transactions.",
    icon: Gavel,
    features: ["IPOs & Listings", "Debt Offerings", "Rights Issues", "Regulatory Filings"],
    stats: { deals: "200+", value: "$15B+", years: "18+" }
  },
  {
    id: "employment-law",
    title: "Employment Law",
    description: "Strategic employment law advice for complex transactions and restructures.",
    icon: Users,
    features: ["TUPE Transfers", "Executive Compensation", "Industrial Relations", "Workplace Safety"],
    stats: { deals: "1000+", value: "All Deals", years: "37+" }
  },
  {
    id: "property",
    title: "Property Law",
    description: "Comprehensive property law services covering commercial real estate and development.",
    icon: Building,
    features: ["Commercial Property", "Real Estate Finance", "Development & Planning", "Property Portfolios"],
    stats: { deals: "250+", value: "$5B+", years: "30+" }
  },
  {
    id: "privacy-cyber",
    title: "Privacy & Cyber",
    description: "Specialist expertise in data protection, privacy law, and cybersecurity compliance.",
    icon: Shield,
    features: ["Data Protection & GDPR", "Cybersecurity Law", "Privacy by Design", "Data Breach Response"],
    stats: { deals: "150+", value: "$2B+", years: "10+" }
  }
];

export default function Services() {
  const { toast } = useToast();

  const handleDownloadCapability = async () => {
    try {
      const content = DocumentGenerator.generateMainCapabilityStatement();
      downloadDocument(content, 'Kendry-Slate-Capability-Statement.pdf');
      toast({ title: 'Download Started', description: 'Capability statement is downloading...' });
    } catch (error) {
      console.error('Error generating capability statement:', error);
      toast({ title: 'Download Error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };


  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="law-firm-hero py-20 relative overflow-hidden">
          {/* Dynamic Animated Background */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 animate-[moveBackground_20s_ease-in-out_infinite]"
              style={{
                backgroundImage: `url(${corporateBackground})`
              }}
            />
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 animate-[moveBackground_25s_ease-in-out_infinite_reverse]"
              style={{
                backgroundImage: `url(${corporateBackground})`,
                transform: 'scale(1.1) rotate(0.5deg)'
              }}
            />
          </div>
          
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent z-10" />
          
          <div className="container mx-auto px-4 relative z-20">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <Scale className="w-8 h-8 text-primary-burgundy" />
                <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
                  Expert Legal Services
                </span>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Legal Excellence
                <span className="block text-primary-burgundy">
                  Across All Practices
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Kendry & Slate delivers sophisticated legal solutions across all aspects of corporate law, 
                with particular expertise in mergers, acquisitions, and complex commercial transactions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Start Your Matter
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleDownloadCapability}
                  className="border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground"
                >
                  Download Capabilities Statement
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Our Practice Areas
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive legal expertise across all aspects of corporate transactions and commercial law
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => {
                const IconComponent = service.icon;
                return (
                  <Card key={service.id} className="premium-card h-full group hover:-translate-y-1 transition-all duration-300">
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary-burgundy/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-burgundy group-hover:text-primary-foreground transition-colors">
                        <IconComponent className="w-6 h-6 text-primary-burgundy group-hover:text-primary-foreground" />
                      </div>
                      <CardTitle className="font-serif text-xl text-foreground">
                        {service.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-6 flex-1">
                        {service.description}
                      </p>
                      
                      <ul className="space-y-2 mb-6">
                        {service.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mr-3" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-6 p-4 bg-accent/20 rounded-lg">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary-burgundy">{service.stats.deals}</div>
                          <div className="text-xs text-muted-foreground">Deals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary-burgundy">{service.stats.value}</div>
                          <div className="text-xs text-muted-foreground">Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary-burgundy">{service.stats.years}</div>
                          <div className="text-xs text-muted-foreground">Years</div>
                        </div>
                      </div>

                      <Link to={`/services/${service.id}`}>
                        <Button 
                          variant="outline" 
                          className="w-full border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground group/btn"
                        >
                          Learn More
                          <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Why Choose Kendry & Slate
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Combining legal excellence with commercial insight to deliver superior outcomes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scale className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">37 Years</h3>
                <p className="text-muted-foreground">Established practice with deep market knowledge</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">$100B+</h3>
                <p className="text-muted-foreground">Total transaction value advised</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Top Tier</h3>
                <p className="text-muted-foreground">Recognised by leading legal directories</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gavel className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">98%</h3>
                <p className="text-muted-foreground">Client satisfaction and retention rate</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-burgundy text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Contact us today to discuss your legal requirements and discover how our expertise 
                can help achieve your business objectives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/client-intake">
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                    Start Client Intake
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}