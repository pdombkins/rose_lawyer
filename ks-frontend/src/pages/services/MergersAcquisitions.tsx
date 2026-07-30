import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Users, Globe, CheckCircle, MapPin, Phone, Mail } from "lucide-react";
import jamesBentley from "@/assets/james-bentley.jpg";
import priyaIyer from "@/assets/priya-iyer.jpg";
import { getProfileImage } from "@/utils/profileImages";
import maBackground from "@/assets/ma-background.jpg";

const partners = [
  {
    name: "James Bentley",
    title: "Managing Partner, M&A",
    image: jamesBentley,
    specialties: ["Cross-border M&A", "Private Equity", "Public Takeovers"],
    experience: "25+ years"
  },
  {
    name: "Priya Iyer",
    title: "Partner, Corporate Law",
    image: priyaIyer,
    specialties: ["Due Diligence", "Regulatory Compliance", "Corporate Restructuring"],
    experience: "18+ years"
  },
  {
    name: "David O'Connell",
    title: "Senior Associate, Capital Markets",
    image: getProfileImage("David O'Connell"),
    specialties: ["Healthcare M&A", "Technology Transactions", "Joint Ventures"],
    experience: "12+ years"
  }
];

const clients = [
  { name: "NexaCare Health", sector: "Healthcare", dealValue: "$2.8B" },
  { name: "Meridian Capital Partners", sector: "Private Equity", dealValue: "$4.2B" },
  { name: "Australian Mining Consortium", sector: "Resources", dealValue: "$6.1B" },
  { name: "TechFlow Solutions", sector: "Technology", dealValue: "$1.9B" },
  { name: "Pacific Energy Group", sector: "Energy", dealValue: "$3.4B" },
  { name: "Metro Healthcare Network", sector: "Healthcare", dealValue: "$1.2B" }
];

const services = [
  {
    title: "Strategic M&A Advisory",
    description: "End-to-end strategic advice on complex mergers and acquisitions",
    features: ["Transaction structuring", "Valuation analysis", "Strategic planning", "Board advisory"]
  },
  {
    title: "Due Diligence",
    description: "Comprehensive legal and commercial due diligence services",
    features: ["Legal due diligence", "Commercial review", "Risk assessment", "Regulatory analysis"]
  },
  {
    title: "Transaction Documentation",
    description: "Expert drafting and negotiation of all transaction documents",
    features: ["Share purchase agreements", "Asset purchase agreements", "Merger documentation", "Ancillary agreements"]
  },
  {
    title: "Regulatory & Compliance",
    description: "Navigation of complex regulatory requirements and approvals",
    features: ["ACCC approvals", "ASIC compliance", "Foreign investment approvals", "Industry-specific regulations"]
  }
];

const offices = [
  {
    city: "Sydney",
    address: "Level 42, Aurora Place, 88 Phillip Street, Sydney NSW 2000",
    phone: "+61 2 9999 8888",
    email: "sydney@kendryslate.com.au",
    isHeadquarters: true
  },
  {
    city: "Melbourne", 
    address: "Level 35, Collins Square, 727 Collins Street, Melbourne VIC 3008",
    phone: "+61 3 9999 7777",
    email: "melbourne@kendryslate.com.au",
    isHeadquarters: false
  },
  {
    city: "Perth",
    address: "Level 28, QV1 Building, 250 St Georges Terrace, Perth WA 6000", 
    phone: "+61 8 9999 6666",
    email: "perth@kendryslate.com.au",
    isHeadquarters: false
  }
];

export default function MergersAcquisitions() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="law-firm-hero py-20">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${maBackground})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <Building2 className="w-8 h-8 text-primary-burgundy" />
                <Badge className="bg-primary-burgundy text-primary-foreground">
                  Leading Practice Area
                </Badge>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Mergers &
                <span className="block text-primary-burgundy">
                  Acquisitions
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Australia's premier M&A practice, delivering sophisticated legal solutions for complex corporate transactions. 
                From strategic advisory through to completion, we guide clients through every aspect of transformational deals.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Start Your M&A Matter
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground"
                >
                  Download M&A Guide
                </Button>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">$50B+</div>
                  <div className="text-muted-foreground">Transaction Value</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">500+</div>
                  <div className="text-muted-foreground">Deals Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">25</div>
                  <div className="text-muted-foreground">Years Leading</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">98%</div>
                  <div className="text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Our M&A Services
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive legal services covering every aspect of mergers and acquisitions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <Card key={index} className="premium-card h-full">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl text-foreground">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      {service.description}
                    </p>
                    <ul className="space-y-2">
                      {service.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <CheckCircle className="w-5 h-5 text-primary-burgundy mr-3 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Leading M&A Partners
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our experienced M&A team combines deep sector knowledge with commercial insight
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {partners.map((partner, index) => (
                <Card key={index} className="premium-card text-center">
                  <CardHeader>
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-primary-burgundy/20">
                      <img 
                        src={partner.image} 
                        alt={partner.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('Failed to load partner image:', partner.image);
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjY0IiBjeT0iNDAiIHI9IjE2IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zMiA5NkMzMiA4MC41MzYgNDQuNTM2IDY4IDYwIDY4SDY4Qzg0LjQ2NCA2OCA5NiA4MC41MzYgOTYgOTZWMTI4SDMyVjk2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                        }}
                      />
                    </div>
                    <CardTitle className="font-serif text-xl text-foreground">
                      {partner.name}
                    </CardTitle>
                    <p className="text-muted-foreground">{partner.title}</p>
                    <Badge className="bg-primary-burgundy/10 text-primary-burgundy">
                      {partner.experience}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Specialties:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {partner.specialties.map((specialty, specialtyIndex) => (
                          <Badge key={specialtyIndex} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Clients Section */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Recent M&A Clients
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Trusted by Australia's leading corporations for their most significant transactions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client, index) => (
                <Card key={index} className="premium-card">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">{client.sector}</p>
                      </div>
                      <Badge className="bg-primary-burgundy text-primary-foreground">
                        {client.dealValue}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Offices Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                M&A Office Locations
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our M&A practice operates from key financial centres across Australia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {offices.map((office, index) => (
                <Card key={index} className="premium-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl text-foreground flex items-center">
                      <MapPin className="w-5 h-5 text-primary-burgundy mr-2" />
                      {office.city}
                      {office.isHeadquarters && (
                        <Badge className="ml-2 bg-primary-burgundy text-primary-foreground text-xs">
                          HQ
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{office.address}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        {office.phone}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2" />
                        {office.email}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-burgundy text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Ready to Start Your M&A Transaction?
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Contact our M&A team today to discuss your transaction requirements and 
                how we can help achieve your strategic objectives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/client-intake">
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                    Start Client Intake
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                  <Phone className="w-5 h-5 mr-2" />
                  Call +61 2 9999 8888
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}