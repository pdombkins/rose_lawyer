import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
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
    coordinates: { x: 75, y: 65 }, // Percentage positions on the map
    image: sydneyImg,
    isHeadquarters: true,
    teamSize: 45,
    practiceAreas: ["M&A", "Corporate", "Capital Markets", "Employment"]
  },
  {
    id: "melbourne",
    name: "Melbourne",
    address: "Level 35, Collins Square, 727 Collins Street, Melbourne VIC 3008",
    phone: "+61 3 9999 7777",
    email: "melbourne@kendryslate.com.au",
    coordinates: { x: 72, y: 78 },
    image: melbourneImg,
    isHeadquarters: false,
    teamSize: 32,
    practiceAreas: ["M&A", "Healthcare", "Private Equity", "Real Estate"]
  },
  {
    id: "perth",
    name: "Perth",
    address: "Level 28, QV1 Building, 250 St Georges Terrace, Perth WA 6000",
    phone: "+61 8 9999 6666",
    email: "perth@kendryslate.com.au",
    coordinates: { x: 25, y: 70 },
    image: perthImg,
    isHeadquarters: false,
    teamSize: 28,
    practiceAreas: ["Resources & Mining", "Energy", "Corporate", "Employment"]
  },
  {
    id: "brisbane",
    name: "Brisbane",
    address: "Level 20, Waterfront Place, 1 Eagle Street, Brisbane QLD 4000",
    phone: "+61 7 9999 5555",
    email: "brisbane@kendryslate.com.au",
    coordinates: { x: 78, y: 45 },
    image: brisbaneImg,
    isHeadquarters: false,
    teamSize: 22,
    practiceAreas: ["Resources & Mining", "Agriculture", "M&A", "Commercial"]
  },
  {
    id: "london",
    name: "London",
    address: "Level 15, The Leadenhall Building, 122 Leadenhall Street, London EC3V 4AB",
    phone: "+44 20 7999 4444",
    email: "london@kendryslate.com",
    coordinates: { x: 45, y: 15 },
    image: londonImg,
    isHeadquarters: false,
    teamSize: 18,
    practiceAreas: ["Cross-border M&A", "Capital Markets", "Private Equity"]
  },
  {
    id: "singapore",
    name: "Singapore",
    address: "Level 30, Marina Bay Financial Centre, 10 Marina Boulevard, Singapore 018983",
    phone: "+65 6999 3333",
    email: "singapore@kendryslate.com",
    coordinates: { x: 85, y: 35 },
    image: singaporeImg,
    isHeadquarters: false,
    teamSize: 15,
    practiceAreas: ["Cross-border M&A", "Technology", "Private Equity"]
  }
];

export function InteractiveMap() {
  const [selectedOffice, setSelectedOffice] = useState(offices[0]);
  const [hoveredOffice, setHoveredOffice] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      {/* Interactive Map */}
      <div className="space-y-6">
        <div className="relative">
          {/* Map Background */}
          <div 
            className="aspect-[4/3] bg-gradient-to-br from-accent/10 to-accent/30 rounded-lg border-2 border-border relative overflow-hidden"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='%23e5e7eb' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)' /%3E%3C/svg%3E")`,
              backgroundSize: '20px 20px'
            }}
          >
            {/* Stylized World Map Outline */}
            <svg 
              className="absolute inset-0 w-full h-full opacity-20" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Australia outline */}
              <path 
                d="M20 60 Q30 50 40 55 Q50 50 60 55 Q70 50 80 60 Q85 70 80 80 Q70 85 60 80 Q50 85 40 80 Q30 85 20 80 Q15 70 20 60 Z" 
                fill="hsl(var(--primary-burgundy) / 0.1)" 
                stroke="hsl(var(--primary-burgundy) / 0.3)" 
                strokeWidth="0.5"
              />
              {/* UK outline */}
              <path 
                d="M40 10 Q45 8 50 12 Q48 18 45 15 Q42 18 40 15 Q38 12 40 10 Z" 
                fill="hsl(var(--primary-burgundy) / 0.1)" 
                stroke="hsl(var(--primary-burgundy) / 0.3)" 
                strokeWidth="0.5"
              />
              {/* Singapore outline */}
              <circle 
                cx="85" 
                cy="35" 
                r="2" 
                fill="hsl(var(--primary-burgundy) / 0.1)" 
                stroke="hsl(var(--primary-burgundy) / 0.3)" 
                strokeWidth="0.5"
              />
            </svg>

            {/* Office Markers */}
            {offices.map((office) => (
              <button
                key={office.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  selectedOffice.id === office.id 
                    ? 'scale-125 z-20' 
                    : hoveredOffice === office.id 
                    ? 'scale-110 z-10' 
                    : 'scale-100 z-0'
                }`}
                style={{
                  left: `${office.coordinates.x}%`,
                  top: `${office.coordinates.y}%`
                }}
                onClick={() => setSelectedOffice(office)}
                onMouseEnter={() => setHoveredOffice(office.id)}
                onMouseLeave={() => setHoveredOffice(null)}
              >
                <div 
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                    selectedOffice.id === office.id
                      ? 'bg-primary-burgundy border-primary-foreground shadow-lg'
                      : 'bg-primary-foreground border-primary-burgundy hover:bg-primary-burgundy hover:border-primary-foreground'
                  }`}
                >
                  <MapPin className={`w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                    selectedOffice.id === office.id ? 'text-primary-foreground' : 'text-primary-burgundy'
                  }`} />
                </div>
                
                {/* Office label */}
                <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap transition-opacity duration-300 ${
                  selectedOffice.id === office.id || hoveredOffice === office.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="bg-background border border-border rounded-lg px-2 py-1 shadow-lg">
                    <div className="text-xs font-semibold text-foreground">{office.name}</div>
                    {office.isHeadquarters && (
                      <Badge className="bg-primary-burgundy text-primary-foreground text-xs mt-1">
                        HQ
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Office Selection Buttons */}
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
      <Card className="premium-card sticky top-8">
        <CardContent className="p-8">
          <div className="aspect-video mb-6 rounded-lg overflow-hidden">
            <img 
              src={selectedOffice.image} 
              alt={`${selectedOffice.name} office`}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                console.log('Failed to load office image:', selectedOffice.image);
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+T2ZmaWNlIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
              }}
            />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground mb-2 flex items-center">
                {selectedOffice.name}
                {selectedOffice.isHeadquarters && (
                  <Badge className="ml-3 bg-primary-burgundy text-primary-foreground">
                    Headquarters
                  </Badge>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Team Size</div>
                  <div className="font-semibold text-foreground">{selectedOffice.teamSize} lawyers</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Established</div>
                  <div className="font-semibold text-foreground">
                    {selectedOffice.isHeadquarters ? '1987' : '1995'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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

            {/* Practice Areas */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Key Practice Areas</h4>
              <div className="flex flex-wrap gap-2">
                {selectedOffice.practiceAreas.map((area, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <Button 
                variant="outline" 
                className="w-full border-primary-burgundy text-primary-burgundy hover:bg-primary-burgundy hover:text-primary-foreground"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
              <Button 
                className="w-full elegant-button"
              >
                <Phone className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}