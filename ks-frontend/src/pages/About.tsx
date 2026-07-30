import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Scale, 
  Users, 
  Globe, 
  Award,
  TrendingUp,
  Building2,
  Heart,
  Target,
  Eye,
  Star,
  Download
} from "lucide-react";
import { getProfileImage } from "@/utils/profileImages";
// Updated to use current staff members via getProfileImage utility
import corporateBackground from "@/assets/corporate-background.jpg";
import aboutOffice from "@/assets/about-office.jpg";
import corporateTeam from "@/assets/corporate-team.jpg";
import { DocumentGenerator, downloadDocument } from "@/utils/documentGenerator";
import { useToast } from "@/hooks/use-toast";

const partners = [
  {
    name: "James Bentley",
    title: "Managing Partner & Founder",
    image: getProfileImage("James Bentley"),
    specialties: ["Cross-border M&A", "Private Equity", "Public Takeovers"],
    experience: "25+ years",
    education: "LLB (Hons) University of Sydney, MBA Harvard Business School",
    bio: "James founded Kendry & Slate in 1987 with a vision to create Australia's premier M&A practice. His expertise in complex cross-border transactions has made him one of the most sought-after M&A lawyers in the Asia-Pacific region."
  },
  {
    name: "Priya Iyer",
    title: "Managing Partner, Corporate Law",
    image: getProfileImage("Priya Iyer"),
    specialties: ["Due Diligence", "Regulatory Compliance", "Corporate Restructuring"],
    experience: "18+ years",
    education: "LLB (First Class Hons) University of Melbourne, LLM Columbia Law School",
    bio: "Priya joined as a partner in 2010 and has been instrumental in expanding our healthcare and technology M&A capabilities. She is recognised as a leading corporate lawyer by Chambers Asia-Pacific."
  },
  {
    name: "David O'Connell",
    title: "Senior Associate, Capital Markets",
    image: getProfileImage("David O'Connell"),
    specialties: ["IPOs & Listings", "Capital Raising", "Securities Law"],
    experience: "12+ years",
    education: "LLB University of Sydney, LLM (Securities) New York University",
    bio: "David leads our capital markets practice and has advised on significant capital raising transactions. He is a frequent speaker at securities law conferences across Asia-Pacific."
  },
  {
    name: "Lily Chen",
    title: "Senior Associate, Employment & Corporate",
    image: getProfileImage("Lily Chen"),
    specialties: ["Employment Law", "Corporate Governance", "Executive Compensation"],
    experience: "8+ years",
    education: "LLB (Hons) Australian National University, LLM (Labour Law) Cambridge",
    bio: "Lily specialises in complex employment matters arising from M&A transactions. Her expertise in corporate governance is highly valued by our major clients."
  }
];

const values = [
  {
    icon: Scale,
    title: "Legal Excellence",
    description: "We deliver sophisticated legal solutions with uncompromising attention to detail and precision."
  },
  {
    icon: Heart,
    title: "Client Partnership",
    description: "We build lasting relationships based on trust, transparency, and deep understanding of our clients' businesses."
  },
  {
    icon: Target,
    title: "Commercial Focus",
    description: "Our advice is always practical, commercially-driven, and aligned with our clients' strategic objectives."
  },
  {
    icon: Users,
    title: "Collaborative Approach",
    description: "We work seamlessly with our clients' teams and other advisers to achieve optimal outcomes."
  },
  {
    icon: Globe,
    title: "Global Perspective",
    description: "Our international experience ensures we navigate complex cross-border transactions with confidence."
  },
  {
    icon: TrendingUp,
    title: "Innovation",
    description: "We embrace technology and innovative approaches to deliver efficient, cutting-edge legal services."
  }
];

const achievements = [
  {
    year: "2024",
    title: "Law Firm of the Year - M&A",
    organisation: "Australian Financial Review Legal Awards"
  },
  {
    year: "2023",
    title: "Deal of the Year - Healthcare M&A",
    organisation: "Chambers Asia-Pacific Awards"
  },
  {
    year: "2023",
    title: "Tier 1 Ranking - Corporate/M&A",
    organisation: "Chambers Asia-Pacific"
  },
  {
    year: "2022",
    title: "Law Firm of the Year - Private Equity",
    organisation: "Legal 500 Asia-Pacific Awards"
  },
  {
    year: "2022",
    title: "Best Legal Adviser - Mid-Market M&A",
    organisation: "Mergermarket Awards"
  }
];

const milestones = [
  {
    year: "1987",
    event: "Founded by James Bentley in Sydney",
    description: "Established with a focus on sophisticated corporate transactions"
  },
  {
    year: "1995",
    event: "Melbourne office opens",
    description: "Expanding to serve Victoria's growing corporate market"
  },
  {
    year: "2001",
    event: "Perth office launch",
    description: "Supporting the resources sector boom in Western Australia"
  },
  {
    year: "2008",
    event: "International expansion",
    description: "London office established to serve European clients"
  },
  {
    year: "2015",
    event: "Asian presence",
    description: "Singapore office opens to capture Asian growth opportunities"
  },
  {
    year: "2020",
    event: "$100B milestone",
    description: "Cumulative transaction value advised exceeds $100 billion"
  },
  {
    year: "2024",
    event: "Digital transformation",
    description: "Launch of integrated practice management platform"
  }
];

export default function About() {
  const { toast } = useToast();

  const handleDownloadBrochure = () => {
    try {
      const content = DocumentGenerator.generateCompanyBrochure();
      downloadDocument(content, 'Kendry-Slate-Company-Brochure.pdf');
      toast({
        title: "Download Started",
        description: "Company brochure is downloading...",
      });
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Unable to generate brochure. Please try again.",
        variant: "destructive"
      });
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
                <Badge className="bg-primary-burgundy text-primary-foreground">
                  Since 1987
                </Badge>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                37 Years of Legal
                <span className="block text-primary-burgundy">
                  Excellence
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Founded in 1987, Kendry & Slate has grown to become Australia's leading M&A law firm, 
                advising on over $100 billion in transactions across six global offices.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/client-intake">
                  <Button size="lg" className="elegant-button group">
                    Work With Us
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground group"
                  onClick={handleDownloadBrochure}
                >
                  <Download className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                  Company Brochure
                </Button>
                
                <Link to="/offices">
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Our Offices
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Eye className="w-6 h-6 text-primary-burgundy" />
                  <Badge className="bg-primary-burgundy/10 text-primary-burgundy">
                    Our Vision
                  </Badge>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Leading the Future of Corporate Law
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  To be the Asia-Pacific region's most trusted adviser for complex corporate transactions, 
                  recognised for our legal excellence, commercial insight, and unwavering commitment to client success.
                </p>
                <div className="flex items-center space-x-3 mb-4">
                  <Target className="w-5 h-5 text-primary-burgundy" />
                  <span className="font-semibold text-foreground">Our Mission</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We deliver sophisticated legal solutions that enable our clients to achieve their strategic 
                  objectives with confidence. Through innovation, collaboration, and deep sector expertise, 
                  we transform complex challenges into successful outcomes.
                </p>
              </div>
              
              <div className="relative">
                <img 
                  src={corporateTeam}
                  alt="Professional team of lawyers and executives in suits at Kendry & Slate"
                  className="rounded-lg shadow-[var(--shadow-elegant)]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-burgundy/20 to-transparent rounded-lg"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Our Values
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The principles that guide everything we do, from client relationships to legal excellence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {values.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <Card key={index} className="premium-card text-center h-full">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-primary-burgundy/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <IconComponent className="w-8 h-8 text-primary-burgundy" />
                      </div>
                      <h3 className="font-serif text-xl font-bold text-foreground mb-4">
                        {value.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Leadership Team */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Leadership Team
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our partners bring decades of experience and deep expertise across all aspects of corporate law
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {partners.map((partner, index) => (
                <Card key={index} className="premium-card">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-primary-burgundy/20">
                          <img 
                            src={partner.image} 
                            alt={partner.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('Failed to load image:', partner.image);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjY0IiBjeT0iNDAiIHI9IjE2IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0zMiA5NkMzMiA4MC41MzYgNDQuNTM2IDY4IDYwIDY4SDY4Qzg0LjQ2NCA2OCA5NiA4MC41MzYgOTYgOTZWMTI4SDMyVjk2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-foreground">
                            {partner.name}
                          </h3>
                          <p className="text-primary-burgundy font-medium">{partner.title}</p>
                          <Badge className="bg-primary-burgundy/10 text-primary-burgundy mt-2">
                            {partner.experience}
                          </Badge>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Specialties</h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {partner.specialties.map((specialty, specialtyIndex) => (
                              <Badge key={specialtyIndex} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Education</h4>
                          <p className="text-sm text-muted-foreground mb-3">{partner.education}</p>
                        </div>
                        
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {partner.bio}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* History & Milestones */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Our Journey
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                From a Sydney startup to a global M&A powerhouse - key milestones in our growth
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-burgundy/20"></div>
                
                <div className="space-y-12">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="relative flex items-start space-x-6">
                      <div className="w-16 h-16 bg-primary-burgundy rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm z-10">
                        {milestone.year}
                      </div>
                      <div className="flex-1 pb-8">
                        <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                          {milestone.event}
                        </h3>
                        <p className="text-muted-foreground">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Awards & Recognition */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Awards & Recognition
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Our commitment to excellence has been recognised by leading legal directories and industry bodies
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => (
                <Card key={index} className="premium-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 text-gold" />
                    </div>
                    <div className="text-2xl font-bold text-primary-burgundy mb-2">
                      {achievement.year}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {achievement.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {achievement.organisation}
                    </p>
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
                Ready to Work with Australia's Leading M&A Firm?
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Join the hundreds of clients who trust Kendry & Slate with their most important transactions. 
                Let's discuss how we can help achieve your strategic objectives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/client-intake">
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                    Start Your Matter
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/offices">
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                    <Building2 className="w-5 h-5 mr-2" />
                    Visit Our Offices
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