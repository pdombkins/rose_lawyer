import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail } from "lucide-react";
import sydneyImg from "@/assets/offices/sydney.jpg";
import melbourneImg from "@/assets/offices/melbourne.jpg";
import perthImg from "@/assets/offices/perth.jpg";
import brisbaneImg from "@/assets/offices/brisbane.jpg";
import londonImg from "@/assets/offices/london.jpg";
import singaporeImg from "@/assets/offices/singapore.jpg";

const offices = [
  {
    id: "sydney",
    name: "Sydney (Headquarters)",
    address: "Level 42, Aurora Place, 88 Phillip Street, Sydney NSW 2000",
    phone: "+61 2 9999 8888",
    email: "sydney@kendryslate.com.au",
    coordinates: { lat: -33.8688, lng: 151.2093 },
    image: sydneyImg,
    isHeadquarters: true
  },
  {
    id: "melbourne",
    name: "Melbourne",
    address: "Level 35, Collins Square, 727 Collins Street, Melbourne VIC 3008",
    phone: "+61 3 9999 7777",
    email: "melbourne@kendryslate.com.au",
    coordinates: { lat: -37.8136, lng: 144.9631 },
    image: melbourneImg,
    isHeadquarters: false
  },
  {
    id: "perth",
    name: "Perth",
    address: "Level 28, QV1 Building, 250 St Georges Terrace, Perth WA 6000",
    phone: "+61 8 9999 6666",
    email: "perth@kendryslate.com.au",
    coordinates: { lat: -31.9505, lng: 115.8605 },
    image: perthImg,
    isHeadquarters: false
  },
  {
    id: "brisbane",
    name: "Brisbane",
    address: "Level 20, Waterfront Place, 1 Eagle Street, Brisbane QLD 4000",
    phone: "+61 7 9999 5555",
    email: "brisbane@kendryslate.com.au",
    coordinates: { lat: -27.4698, lng: 153.0251 },
    image: brisbaneImg,
    isHeadquarters: false
  },
  {
    id: "london",
    name: "London",
    address: "Level 15, The Leadenhall Building, 122 Leadenhall Street, London EC3V 4AB",
    phone: "+44 20 7999 4444",
    email: "london@kendryslate.com",
    coordinates: { lat: 51.5074, lng: -0.1278 },
    image: londonImg,
    isHeadquarters: false
  },
  {
    id: "singapore",
    name: "Singapore",
    address: "Level 30, Marina Bay Financial Centre, 10 Marina Boulevard, Singapore 018983",
    phone: "+65 6999 3333",
    email: "singapore@kendryslate.com",
    coordinates: { lat: 1.3521, lng: 103.8198 },
    image: singaporeImg,
    isHeadquarters: false
  }
];

export function OfficesMap() {
  const [selectedOffice, setSelectedOffice] = useState(offices[0]);

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
            Global Presence
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our strategically located offices ensure we deliver local expertise with global reach 
            across major financial centres.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Map and Office Selector */}
          <div className="space-y-6">
            {/* Interactive Map Placeholder */}
            <div className="aspect-video bg-accent/20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Interactive Map</p>
                <p className="text-sm">Click office locations below to explore</p>
              </div>
            </div>

            {/* Office Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {offices.map((office) => (
                <Button
                  key={office.id}
                  variant={selectedOffice.id === office.id ? "default" : "outline"}
                  className={`text-xs p-2 h-auto ${
                    selectedOffice.id === office.id 
                      ? "bg-primary-burgundy text-primary-foreground" 
                      : "border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground"
                  }`}
                  onClick={() => setSelectedOffice(office)}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {office.name}
                  {office.isHeadquarters && (
                    <span className="ml-1 text-xs">(HQ)</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Office Details */}
          <Card className="premium-card">
            <CardContent className="p-8">
              <div className="aspect-video mb-6 rounded-lg overflow-hidden">
                <img 
                  src={selectedOffice.image} 
                  alt={`${selectedOffice.name} office`}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                    {selectedOffice.name}
                    {selectedOffice.isHeadquarters && (
                      <span className="ml-2 text-sm font-normal text-primary-burgundy">(Headquarters)</span>
                    )}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-primary-burgundy mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Address</p>
                      <p className="text-muted-foreground">{selectedOffice.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-primary-burgundy flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <p className="text-muted-foreground">{selectedOffice.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-primary-burgundy flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p className="text-muted-foreground">{selectedOffice.email}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    className="w-full border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground"
                  >
                    Get Directions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}