import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileCheck, Search, Shield, AlertTriangle, Users, CheckCircle } from "lucide-react";
import dueDiligenceBackground from "@/assets/due-diligence-background.jpg";

export default function DueDiligence() {
  const capabilities = [
    {
      title: "Legal Due Diligence",
      description: "Comprehensive legal review of corporate structure, contracts, and compliance",
      icon: FileCheck
    },
    {
      title: "Regulatory Review",
      description: "Assessment of regulatory compliance and potential regulatory risks",
      icon: Shield
    },
    {
      title: "Risk Assessment",
      description: "Identification and quantification of legal and commercial risks",
      icon: AlertTriangle
    },
    {
      title: "Compliance Audits",
      description: "Thorough review of compliance frameworks and procedures",
      icon: CheckCircle
    }
  ];

  const experience = [
    "Led due diligence on A$3.2B cross-border acquisition in financial services",
    "Conducted regulatory review for A$1.8B healthcare sector transaction",
    "Managed multi-jurisdictional DD across 12 countries for PE transaction",
    "Completed accelerated due diligence process in 3 weeks for competitive auction"
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
              backgroundImage: `url(${dueDiligenceBackground})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <FileCheck className="w-8 h-8 text-primary-burgundy" />
                <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
                  Due Diligence
                </span>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Comprehensive
                <span className="block text-primary-burgundy">
                  Due Diligence
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Thorough legal and commercial due diligence services to identify risks, opportunities, 
                and value drivers in complex transactions across all sectors and jurisdictions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Start Due Diligence
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
                Our Due Diligence Services
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive analysis and risk assessment across all aspects of your transaction
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

        {/* Process */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Our DD Process
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Systematic approach ensuring comprehensive coverage and actionable insights
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-foreground">1</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Planning</h3>
                <p className="text-muted-foreground">Scope definition and team mobilisation</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-foreground">2</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Execution</h3>
                <p className="text-muted-foreground">Comprehensive review and analysis</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-foreground">3</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Reporting</h3>
                <p className="text-muted-foreground">Clear findings and recommendations</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-foreground">4</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Support</h3>
                <p className="text-muted-foreground">Ongoing transaction assistance</p>
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
                  Recent Experience
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Our due diligence team has successfully completed hundreds of comprehensive 
                  reviews across diverse sectors and transaction types.
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
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">A$80B+</div>
                  <div className="text-muted-foreground">Transaction Value</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">800+</div>
                  <div className="text-muted-foreground">DD Projects</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">25+</div>
                  <div className="text-muted-foreground">Years Experience</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">30</div>
                  <div className="text-muted-foreground">Sectors</div>
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
                Ensure Transaction Success
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Contact our due diligence specialists to discuss your review requirements 
                and timeline objectives.
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