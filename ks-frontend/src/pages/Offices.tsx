import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { InteractiveMap } from "@/components/home/InteractiveMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Clock,
  Car,
  Train,
  Plane,
  Building2,
  Globe,
  Calendar,
   ExternalLink
 } from "lucide-react";
import corporateBackground from "@/assets/corporate-background.jpg";
import sydneyImg from "@/assets/offices/sydney.jpg";
import melbourneImg from "@/assets/offices/melbourne.jpg";
import perthImg from "@/assets/offices/perth.jpg";
import brisbaneImg from "@/assets/offices/brisbane.jpg";
import londonImg from "@/assets/offices/london.jpg";
import singaporeImg from "@/assets/offices/singapore.jpg";

const offices = [
  {
    id: "sydney",
    name: "Sydney Headquarters",
    address: "Level 42, Aurora Place, 88 Phillip Street, Sydney NSW 2000",
    phone: "+61 2 9999 8888",
    email: "sydney@kendryslate.com.au",
    image: sydneyImg,
    isHeadquarters: true,
    established: "1987",
    teamSize: 45,
    practiceAreas: ["M&A", "Corporate", "Capital Markets", "Employment", "Litigation"],
    officeManager: "Jennifer Walsh",
    officeManagerEmail: "jennifer.walsh@kendryslate.com.au",
    description: "Our flagship Sydney office in the prestigious Aurora Place offers panoramic harbour views and houses our largest team of M&A specialists.",
    keyPartners: ["James Bentley", "Priya Iyer", "Michael Chen"],
    transport: {
      parking: "Secure basement parking available",
      public: "Circular Quay Station (2 min walk), Bus stops on Phillip Street",
      airport: "Sydney Airport - 30 minutes by taxi/rideshare"
    },
    facilities: [
      "24/7 secure access",
      "Client meeting rooms with harbour views", 
      "Video conferencing facilities",
      "Document review rooms",
      "On-site café and catering",
      "Concierge services"
    ]
  },
  {
    id: "melbourne", 
    name: "Melbourne Office",
    address: "Level 35, Collins Square, 727 Collins Street, Melbourne VIC 3008",
    phone: "+61 3 9999 7777",
    email: "melbourne@kendryslate.com.au",
    image: melbourneImg,
    isHeadquarters: false,
    established: "1995",
    teamSize: 32,
    practiceAreas: ["M&A", "Healthcare", "Private Equity", "Real Estate", "Employment"],
    officeManager: "David Kumar",
    officeManagerEmail: "david.kumar@kendryslate.com.au", 
    description: "Located in Melbourne's premier legal precinct, our Collins Street office serves Victoria's dynamic corporate market with particular strength in healthcare M&A.",
    keyPartners: ["Sarah Williams", "Lisa Chen"],
    transport: {
      parking: "Premium parking available in Collins Square",
      public: "Southern Cross Station (5 min walk), Tram stops on Collins Street",
      airport: "Melbourne Airport - 45 minutes by SkyBus or taxi"
    },
    facilities: [
      "Premium Collins Street location",
      "State-of-the-art meeting facilities",
      "Secure document storage",
      "High-speed internet and IT support",
      "Break-out spaces and quiet zones",
      "Shower facilities and bike storage"
    ]
  },
  {
    id: "perth",
    name: "Perth Office", 
    address: "Level 28, QV1 Building, 250 St Georges Terrace, Perth WA 6000",
    phone: "+61 8 9999 6666",
    email: "perth@kendryslate.com.au",
    image: perthImg,
    isHeadquarters: false,
    established: "2001",
    teamSize: 28,
    practiceAreas: ["Resources & Mining", "Energy", "Corporate", "Employment", "Native Title"],
    officeManager: "Rebecca Thompson",
    officeManagerEmail: "rebecca.thompson@kendryslate.com.au",
    description: "Strategically positioned in Perth's CBD, our team serves the resources sector with deep expertise in mining transactions and energy project development.",
    keyPartners: ["Mark Foster", "Amanda Wilson"],
    transport: {
      parking: "QV1 secure parking and nearby options",
      public: "Perth Underground Station (3 min walk), CAT bus services",
      airport: "Perth Airport - 25 minutes by taxi/rideshare"
    },
    facilities: [
      "Views of Perth skyline and Swan River",
      "Boardroom facilities with video links",
      "Mining industry resource centre", 
      "24/7 building access",
      "On-site café and restaurant",
      "Wellness facilities"
    ]
  },
  {
    id: "brisbane",
    name: "Brisbane Office",
    address: "Level 20, Waterfront Place, 1 Eagle Street, Brisbane QLD 4000", 
    phone: "+61 7 9999 5555",
    email: "brisbane@kendryslate.com.au",
    image: brisbaneImg,
    isHeadquarters: false,
    established: "2005",
    teamSize: 22,
    practiceAreas: ["Resources & Mining", "Agriculture", "M&A", "Commercial", "Infrastructure"],
    officeManager: "James Mitchell",
    officeManagerEmail: "james.mitchell@kendryslate.com.au",
    description: "Our Brisbane office overlooks the river and serves Queensland's diverse economy, from resources and agriculture to emerging technology sectors.",
    keyPartners: ["Catherine Lee", "Robert Taylor"],
    transport: {
      parking: "Eagle Street premium parking",
      public: "Eagle Street Pier ferry terminal, Queen Street bus station nearby",
      airport: "Brisbane Airport - 35 minutes by AirTrain or taxi"
    },
    facilities: [
      "River views from all meeting rooms",
      "Flexible workspace configurations",
      "Digital document management",
      "Client entertainment facilities", 
      "Riverside location with ferry access",
      "On-site dining options"
    ]
  },
  {
    id: "london",
    name: "London Office",
    address: "Level 15, The Leadenhall Building, 122 Leadenhall Street, London EC3V 4AB",
    phone: "+44 20 7999 4444", 
    email: "london@kendryslate.com",
    image: londonImg,
    isHeadquarters: false,
    established: "2008",
    teamSize: 18,
    practiceAreas: ["Cross-border M&A", "Capital Markets", "Private Equity", "Financial Services"],
    officeManager: "Sophie Richardson",
    officeManagerEmail: "sophie.richardson@kendryslate.com",
    description: "Located in the iconic Leadenhall Building, our London office provides European expertise for complex cross-border transactions and capital markets work.",
    keyPartners: ["Jonathan Hayes", "Emma Thompson"],
    transport: {
      parking: "Limited street parking, public transport recommended",
      public: "Bank/Monument stations (2 min walk), Liverpool Street (5 min)",
      airport: "Heathrow - 45 min Heathrow Express, City Airport - 20 min DLR"
    },
    facilities: [
      "City of London premium location",
      "Panoramic city views",
      "European-standard meeting facilities",
      "Multi-language support services",
      "Private client suites", 
      "24/7 business support"
    ]
  },
  {
    id: "singapore",
    name: "Singapore Office",
    address: "Level 30, Marina Bay Financial Centre, 10 Marina Boulevard, Singapore 018983",
    phone: "+65 6999 3333",
    email: "singapore@kendryslate.com",
    image: singaporeImg,
    isHeadquarters: false,
    established: "2015",
    teamSize: 15,
    practiceAreas: ["Cross-border M&A", "Technology", "Private Equity", "Fund Formation"],
    officeManager: "Wei Lin Tan",
    officeManagerEmail: "weilin.tan@kendryslate.com",
    description: "Our newest office in Marina Bay serves as our gateway to Asian markets, supporting complex regional transactions and fund formation work.",
    keyPartners: ["Alex Wong", "Priya Sharma"],
    transport: {
      parking: "Marina Bay Financial Centre parking",
      public: "Raffles Place MRT (5 min walk), Marina Bay MRT (8 min)",
      airport: "Changi Airport - 30 minutes by taxi/MRT"
    },
    facilities: [
      "Marina Bay waterfront views",
      "Asian business hours coverage",
      "Multi-jurisdiction legal library", 
      "Premium client facilities",
      "Integrated technology platforms",
      "Concierge and translation services"
    ]
  }
];

export default function Offices() {
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
                <Globe className="w-8 h-8 text-primary-burgundy" />
                <Badge className="bg-primary-burgundy text-primary-foreground">
                  Global Presence
                </Badge>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Our Global
                <span className="block text-primary-burgundy">
                  Network
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Six strategically located offices across Australia, United Kingdom, and Singapore, 
                providing local expertise with global reach for complex cross-border transactions.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">6</div>
                  <div className="text-muted-foreground">Global Offices</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">160+</div>
                  <div className="text-muted-foreground">Legal Professionals</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">15</div>
                  <div className="text-muted-foreground">Time Zones Covered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-burgundy">24/7</div>
                  <div className="text-muted-foreground">Client Support</div>
                </div>
              </div>
              
              <Link to="/client-intake">
                <Button size="lg" className="elegant-button group">
                  Contact Any Office
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive Map */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Interactive Office Map
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Click on any office location to explore our facilities, team, and contact information
              </p>
            </div>

            <InteractiveMap />
          </div>
        </section>

        {/* Office Details */}
        <section className="py-20 bg-accent/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                Office Details
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive information about each of our office locations
              </p>
            </div>

            <div className="space-y-12">
              {offices.map((office) => (
                <Card key={office.id} className="premium-card">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Office Image */}
                      <div className="lg:col-span-1">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-4">
                          <img 
                            src={office.image} 
                            alt={`${office.name} exterior`}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-xl font-bold text-primary-burgundy">{office.teamSize}</div>
                            <div className="text-sm text-muted-foreground">Legal Team</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-primary-burgundy">{office.established}</div>
                            <div className="text-sm text-muted-foreground">Established</div>
                          </div>
                        </div>
                      </div>

                      {/* Office Information */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <div className="flex items-center space-x-3 mb-4">
                            <h3 className="font-serif text-2xl font-bold text-foreground">
                              {office.name}
                            </h3>
                            {office.isHeadquarters && (
                              <Badge className="bg-primary-burgundy text-primary-foreground">
                                Headquarters
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-6">
                            {office.description}
                          </p>
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-foreground flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-primary-burgundy" />
                              Contact Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start space-x-2">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{office.address}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">{office.phone}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">{office.email}</span>
                              </div>
                              <div className="pt-2">
                                <div className="text-xs text-muted-foreground">Office Manager</div>
                                <div className="font-medium text-foreground">{office.officeManager}</div>
                                <div className="text-xs text-muted-foreground">{office.officeManagerEmail}</div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-foreground flex items-center">
                              <Users className="w-4 h-4 mr-2 text-primary-burgundy" />
                              Key Partners
                            </h4>
                            <div className="space-y-1">
                              {office.keyPartners.map((partner, index) => (
                                <div key={index} className="text-sm text-muted-foreground">
                                  {partner}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Practice Areas */}
                        <div>
                          <h4 className="font-semibold text-foreground mb-3">Practice Areas</h4>
                          <div className="flex flex-wrap gap-2">
                            {office.practiceAreas.map((area, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Transport & Facilities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center">
                              <Car className="w-4 h-4 mr-2 text-primary-burgundy" />
                              Transport Links
                            </h4>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-start space-x-2">
                                <Car className="w-3 h-3 mt-1 flex-shrink-0" />
                                <span>{office.transport.parking}</span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <Train className="w-3 h-3 mt-1 flex-shrink-0" />
                                <span>{office.transport.public}</span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <Plane className="w-3 h-3 mt-1 flex-shrink-0" />
                                <span>{office.transport.airport}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center">
                              <Building2 className="w-4 h-4 mr-2 text-primary-burgundy" />
                              Office Facilities
                            </h4>
                            <div className="space-y-1">
                              {office.facilities.slice(0, 4).map((facility, index) => (
                                <div key={index} className="text-sm text-muted-foreground flex items-center">
                                  <div className="w-1.5 h-1.5 bg-primary-burgundy rounded-full mr-2 flex-shrink-0"></div>
                                  {facility}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                          <Button variant="outline" size="sm">
                            <Phone className="w-4 h-4 mr-2" />
                            Call Office
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Get Directions
                          </Button>
                          <Button variant="outline" size="sm">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Visit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Office Hours & Support */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl text-foreground flex items-center">
                    <Clock className="w-6 h-6 mr-3 text-primary-burgundy" />
                    Global Support Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Australia & Asia</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>Sydney: 8:00 AM - 8:00 PM AEDT</div>
                        <div>Melbourne: 8:00 AM - 7:00 PM AEDT</div>
                        <div>Perth: 8:00 AM - 6:00 PM AWST</div>
                        <div>Singapore: 8:30 AM - 7:30 PM SGT</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Europe</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>London: 8:30 AM - 7:30 PM GMT</div>
                        <div></div>
                        <div><strong>Emergency Support:</strong></div>
                        <div>24/7 partner availability</div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-semibold text-foreground mb-2">Multi-timezone Coverage</h4>
                    <p className="text-sm text-muted-foreground">
                      Our global network ensures seamless support across time zones for urgent matters and cross-border transactions.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl text-foreground flex items-center">
                    <Globe className="w-6 h-6 mr-3 text-primary-burgundy" />
                    Why Our Global Network Matters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-burgundy rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-foreground">Local Market Expertise</div>
                        <div className="text-sm text-muted-foreground">Deep understanding of regional regulations, customs, and business practices</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-burgundy rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-foreground">Seamless Coordination</div>
                        <div className="text-sm text-muted-foreground">Integrated teams working across borders with unified standards and processes</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-burgundy rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-foreground">Relationship Banking</div>
                        <div className="text-sm text-muted-foreground">Local relationships with regulators, advisers, and key stakeholders</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-burgundy rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-foreground">Cultural Intelligence</div>
                        <div className="text-sm text-muted-foreground">Understanding of local business culture and negotiation styles</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-burgundy text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Visit Our Offices
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                We welcome clients to visit any of our offices. Schedule a meeting with our team 
                to discuss your legal needs in person.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/client-intake">
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                    Schedule a Meeting
                    <Calendar className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy">
                  <Phone className="w-5 h-5 mr-2" />
                  Call Any Office
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