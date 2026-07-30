import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Lock, AlertTriangle, Eye, Users, CheckCircle } from "lucide-react";
import privacyCyberBackground from "@/assets/privacy-cyber-background.jpg";

export default function PrivacyCyber() {
  const capabilities = [
    {
      title: "Data Protection & GDPR",
      description: "Comprehensive GDPR compliance and international data protection",
      icon: Shield
    },
    {
      title: "Cybersecurity Law",
      description: "Legal frameworks for cyber resilience and incident response",
      icon: Lock
    },
    {
      title: "Privacy by Design",
      description: "Integrating privacy considerations into business processes and technology",
      icon: Eye
    },
    {
      title: "Data Breach Response",
      description: "Rapid response to data security incidents and regulatory notifications",
      icon: AlertTriangle
    }
  ];

  const experience = [
    "Led GDPR compliance programme for ASX 200 financial services group",
    "Managed data breach response involving 2M+ customer records",
    "Advised on A$1.5B technology acquisition with complex data transfer issues",
    "Structured privacy-compliant international data sharing arrangements"
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
              backgroundImage: `url(${privacyCyberBackground})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="w-8 h-8 text-primary-burgundy" />
                <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
                  Privacy & Cyber Law
                </span>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Privacy & Cyber
                <span className="block text-primary-burgundy">
                  Security Law
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Specialist legal expertise in data protection, privacy law, and cybersecurity compliance 
                to help navigate the complex regulatory landscape and protect your business.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Secure Your Business
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
                Our Privacy & Cyber Services
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive legal support for data protection and cybersecurity challenges
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

        {/* Regulatory Framework */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Regulatory Expertise
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Deep knowledge of privacy and cybersecurity regulations across jurisdictions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="premium-card">
                <CardContent className="pt-6">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-4">European Union</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">GDPR compliance</p>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">NIS2 Directive</p>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">Data Governance Act</p>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="premium-card">
                <CardContent className="pt-6">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-4">United Kingdom</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">UK GDPR</p>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">Data Protection Act 2018</p>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">Network & Information Systems Regulations</p>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="premium-card">
                <CardContent className="pt-6">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-4">United States</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">CCPA / CPRA</p>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">State privacy laws</p>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm">Sectoral regulations</p>
                    </li>
                  </ul>
                </CardContent>
              </Card>
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
                  Our privacy and cyber team has successfully managed complex data protection 
                  challenges and cybersecurity incidents across multiple sectors.
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
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">A$2B+</div>
                  <div className="text-muted-foreground">Data Asset Value</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">150+</div>
                  <div className="text-muted-foreground">Privacy Projects</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">10+</div>
                  <div className="text-muted-foreground">Years Experience</div>
                </div>
                <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-primary-burgundy mb-2">25</div>
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
                Protect Your Data
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Contact our privacy and cyber specialists to discuss your data protection 
                and cybersecurity requirements.
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