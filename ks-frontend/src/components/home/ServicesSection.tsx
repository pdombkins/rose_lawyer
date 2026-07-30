import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, FileCheck, Gavel, HandCoins, Scale, Users, Building, Shield, Download } from "lucide-react";
import { DocumentGenerator, downloadDocument } from "@/utils/documentGenerator";
import { useToast } from "@/hooks/use-toast";

const services = [
  {
    id: "mergers-acquisitions",
    title: "Mergers & Acquisitions",
    description: "Strategic counsel for complex M&A transactions, from initial structuring through completion.",
    icon: Building2,
    features: ["Due Diligence", "Transaction Structuring", "Regulatory Approvals", "Cross-border Transactions"],
    capabilityDescription: "Kendry & Slate's M&A practice is recognised as Australia's leading advisory service for complex mergers and acquisitions. Our team has extensive experience in cross-border transactions, public takeovers, and strategic corporate combinations across all industry sectors."
  },
  {
    id: "corporate-restructuring", 
    title: "Corporate Restructuring",
    description: "Comprehensive restructuring advice to optimise corporate structures and operations.",
    icon: Scale,
    features: ["Spin-offs & Carve-outs", "Joint Ventures", "Corporate Governance", "Regulatory Compliance"],
    capabilityDescription: "Our corporate restructuring team provides sophisticated advice on all forms of corporate reorganisation, including spin-offs, carve-outs, joint ventures, and complex structural optimisation projects."
  },
  {
    id: "private-equity",
    title: "Private Equity",
    description: "Specialised legal services for private equity funds, portfolio companies, and investors.",
    icon: HandCoins,
    features: ["Fund Formation", "Portfolio Investments", "Exit Strategies", "Management Buyouts"],
    capabilityDescription: "Kendry & Slate's private equity practice advises leading PE funds, institutional investors, and portfolio companies on fund formation, investments, exits, and management buyout transactions."
  },
  {
    id: "due-diligence",
    title: "Due Diligence",
    description: "Thorough legal and commercial due diligence to identify risks and opportunities.",
    icon: FileCheck,
    features: ["Legal Due Diligence", "Regulatory Review", "Risk Assessment", "Compliance Audits"],
    capabilityDescription: "Our due diligence specialists conduct comprehensive legal, regulatory, and commercial reviews to identify risks and opportunities in complex transactions across all industry sectors."
  },
  {
    id: "capital-markets",
    title: "Capital Markets",
    description: "Expert guidance on public and private capital raising transactions.",
    icon: Gavel,
    features: ["IPOs & Listings", "Debt Offerings", "Rights Issues", "Regulatory Filings"],
    capabilityDescription: "Our capital markets team advises on public and private capital raising transactions, including IPOs, secondary offerings, debt issuances, and complex structured finance arrangements."
  },
  {
    id: "employment-law",
    title: "Employment Law",
    description: "Strategic employment law advice for complex transactions and restructures.",
    icon: Users,
    features: ["TUPE Transfers", "Executive Compensation", "Industrial Relations", "Workplace Safety"],
    capabilityDescription: "Our employment law specialists provide strategic advice on all employment matters arising from M&A transactions, including employee transfers, executive compensation, and industrial relations issues."
  },
  {
    id: "property",
    title: "Property Law",
    description: "Comprehensive property law services covering commercial real estate and development.",
    icon: Building,
    features: ["Commercial Property", "Real Estate Finance", "Development & Planning", "Property Portfolios"],
    capabilityDescription: "Our property law team provides comprehensive advice on commercial real estate transactions, development projects, real estate finance, and property portfolio management."
  },
  {
    id: "privacy-cyber",
    title: "Privacy & Cyber",
    description: "Specialist expertise in data protection, privacy law, and cybersecurity compliance.",
    icon: Shield,
    features: ["Data Protection & GDPR", "Cybersecurity Law", "Privacy by Design", "Data Breach Response"],
    capabilityDescription: "Our privacy and cybersecurity specialists provide expert advice on data protection compliance, privacy law, cybersecurity regulations, and data breach response across all industry sectors."
  }
];

export function ServicesSection() {
  const { toast } = useToast();

  const handleDownloadServiceCapability = (service: typeof services[0]) => {
    try {
      console.log('Starting service capability statement generation for:', service.title);
      const content = DocumentGenerator.generateServiceCapabilityStatement(
        service.title,
        service.capabilityDescription,
        service.features
      );
      console.log('Service content generated successfully, size:', content.length);
      const filename = `${service.title.replace(/[^a-zA-Z0-9]/g, '-')}-Capability-Statement.pdf`;
      downloadDocument(content, filename);
      console.log('Service download initiated successfully');
      toast({
        title: "Download Started",
        description: `${service.title} capability statement is downloading...`,
      });
    } catch (error) {
      console.error('Error in handleDownloadServiceCapability:', error);
      toast({
        title: "Download Error",
        description: `Unable to generate ${service.title} capability statement: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  return (
    <section className="py-20 bg-accent/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
            Our Legal Expertise
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Delivering sophisticated legal solutions across all aspects of mergers, acquisitions, 
            and corporate transactions with unparalleled expertise and commercial insight.
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

                  <div className="flex gap-2">
                    <Link to={`/services/${service.id}`} className="flex-1">
                      <Button 
                        variant="outline" 
                        className="w-full border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground group/btn"
                      >
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDownloadServiceCapability(service)}
                      className="px-3 group/download"
                      title="Download capability statement"
                    >
                      <Download className="w-4 h-4 group-hover/download:translate-y-0.5 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/services">
            <Button size="lg" className="elegant-button">
              View All Services
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}