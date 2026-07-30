import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    company: "NexaCare Health",
    industry: "Healthcare Services",
    quote: "Kendry & Slate delivered exceptional results on our $2.8B acquisition of Whitegum Medical Centres. Their expertise in healthcare M&A and attention to regulatory detail was unmatched.",
    author: "Dr. Alexandra Keller",
    position: "Chief Executive Officer",
    dealValue: "$2.8B",
    backgroundImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
  },
  {
    id: 2,
    company: "Meridian Capital Partners",
    industry: "Private Equity",
    quote: "The team's deep understanding of complex cross-border transactions and regulatory frameworks made our European expansion seamless. Truly world-class legal counsel.",
    author: "James Richardson",
    position: "Managing Partner",
    dealValue: "$4.2B",
    backgroundImage: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
  },
  {
    id: 3,
    company: "Australian Mining Consortium",
    industry: "Resources & Mining",
    quote: "Kendry & Slate's strategic advice and meticulous due diligence were instrumental in closing our largest acquisition. Their team anticipated every challenge and delivered solutions.",
    author: "Sarah Chen",
    position: "Chief Legal Officer",
    dealValue: "$6.1B",
    backgroundImage: "https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
  }
];

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{
          backgroundImage: `url('${currentTestimonial.backgroundImage}')`
        }}
      />
      <div className="absolute inset-0 bg-primary-burgundy/80" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Client Success Stories
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Trusted by Australia's leading corporations for complex M&A transactions
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <Card className="premium-card bg-background/95 backdrop-blur-sm border-none">
            <CardContent className="p-8 md:p-12">
              <div className="flex items-start space-x-4 mb-6">
                <Quote className="w-8 h-8 text-primary-burgundy flex-shrink-0 mt-1" />
                <blockquote className="text-lg md:text-xl text-foreground leading-relaxed">
                  "{currentTestimonial.quote}"
                </blockquote>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="font-semibold text-foreground text-lg">
                    {currentTestimonial.author}
                  </div>
                  <div className="text-muted-foreground">
                    {currentTestimonial.position}, {currentTestimonial.company}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {currentTestimonial.industry}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-burgundy">
                    {currentTestimonial.dealValue}
                  </div>
                  <div className="text-sm text-muted-foreground">Transaction Value</div>
                  <div className="flex space-x-1 mt-2 justify-end">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              className="bg-background/80 backdrop-blur-sm border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex 
                      ? 'bg-primary-foreground' 
                      : 'bg-primary-foreground/40 hover:bg-primary-foreground/60'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="bg-background/80 backdrop-blur-sm border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary-burgundy"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}