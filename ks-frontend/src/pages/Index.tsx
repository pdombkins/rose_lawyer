import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { ServicesSection } from "@/components/home/ServicesSection";
import { InteractiveMap } from "@/components/home/InteractiveMap";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <TestimonialsCarousel />
        <div className="hidden md:block">
          <ServicesSection />
        </div>
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
            <InteractiveMap />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
