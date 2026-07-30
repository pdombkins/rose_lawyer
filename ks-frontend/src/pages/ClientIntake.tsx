import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FileText, Shield, Clock, CheckCircle, Loader2 } from "lucide-react";

interface IntakeForm {
  // Client Information
  clientName: string;
  clientType: string;
  industry: string;
  headquarters: string;
  
  // Contact Information
  primaryContactName: string;
  primaryContactTitle: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  
  // Legal Matter Details
  matterType: string;
  matterDescription: string;
  urgency: string;
  estimatedValue: string;
  timeline: string;
  
  // Additional Information
  existingLegalCounsel: boolean;
  conflictEntities: string;
  confidentiality: boolean;
  marketingConsent: boolean;
}

const initialForm: IntakeForm = {
  clientName: "",
  clientType: "",
  industry: "",
  headquarters: "",
  primaryContactName: "",
  primaryContactTitle: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  matterType: "",
  matterDescription: "",
  urgency: "",
  estimatedValue: "",
  timeline: "",
  existingLegalCounsel: false,
  conflictEntities: "",
  confidentiality: false,
  marketingConsent: false
};

export default function ClientIntake() {
  const [form, setForm] = useState<IntakeForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create client first
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          name: form.clientName,
          email: form.primaryContactEmail,
          phone: form.primaryContactPhone,
          address: form.headquarters,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // Randomly assign to James Bentley or Priya Iyer
      const partners = [
        '550e8400-e29b-41d4-a716-446655440001', // James Bentley
        '550e8400-e29b-41d4-a716-446655440002'  // Priya Iyer
      ];
      const assignedLawyer = partners[Math.floor(Math.random() * partners.length)];

      // Create matter
      const { error: matterError } = await supabase
        .from('matters')
        .insert([{
          title: `${form.clientName} - ${form.matterType}`,
          description: form.matterDescription,
          matter_type: form.matterType,
          client_id: clientData.id,
          lead_partner_id: assignedLawyer,
          status: 'active'
        }]);

      if (matterError) throw matterError;

      toast({
        title: "Intake Form Submitted Successfully",
        description: "Thank you for your interest in MCR Legal. We will review your submission and contact you within 24 hours.",
      });

      setForm(initialForm);
    } catch (error: any) {
      console.error('Error submitting intake form:', error);
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your form. Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = (field: keyof IntakeForm, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="law-firm-hero py-20">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-6">
                <FileText className="w-8 h-8 text-primary-burgundy" />
                <span className="text-primary-burgundy font-medium uppercase tracking-wider text-sm">
                  Confidential Client Intake
                </span>
              </div>
              
              <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Start Your Legal
                <span className="block text-primary-burgundy">
                  Matter Today
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                Begin your journey with Kendry & Slate's expert legal team. Our confidential intake process 
                ensures we understand your needs and can provide tailored legal solutions.
              </p>
              
              {/* Process Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-burgundy rounded-full flex items-center justify-center text-primary-foreground font-bold">1</div>
                  <div>
                    <div className="font-semibold text-foreground">Submit Intake</div>
                    <div className="text-sm text-muted-foreground">Complete our secure form</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-burgundy rounded-full flex items-center justify-center text-primary-foreground font-bold">2</div>
                  <div>
                    <div className="font-semibold text-foreground">Conflict Check</div>
                    <div className="text-sm text-muted-foreground">We review for conflicts</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-burgundy rounded-full flex items-center justify-center text-primary-foreground font-bold">3</div>
                  <div>
                    <div className="font-semibold text-foreground">Initial Contact</div>
                    <div className="text-sm text-muted-foreground">We contact you within 24hrs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intake Form */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Client Information */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-foreground flex items-center">
                      <Shield className="w-6 h-6 text-primary-burgundy mr-3" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name / Organisation *</Label>
                        <Input
                          id="clientName"
                          value={form.clientName}
                          onChange={(e) => updateForm('clientName', e.target.value)}
                          required
                          placeholder="e.g., NexaCare Health Pty Ltd"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientType">Client Type *</Label>
                        <Select value={form.clientType} onValueChange={(value) => updateForm('clientType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public-company">Public Company</SelectItem>
                            <SelectItem value="private-company">Private Company</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="trust">Trust</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="government">Government Entity</SelectItem>
                            <SelectItem value="nfp">Not-for-Profit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry Sector *</Label>
                        <Select value={form.industry} onValueChange={(value) => updateForm('industry', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="healthcare">Healthcare & Life Sciences</SelectItem>
                            <SelectItem value="technology">Technology & Media</SelectItem>
                            <SelectItem value="financial-services">Financial Services</SelectItem>
                            <SelectItem value="resources">Resources & Mining</SelectItem>
                            <SelectItem value="energy">Energy & Utilities</SelectItem>
                            <SelectItem value="real-estate">Real Estate & Construction</SelectItem>
                            <SelectItem value="retail">Retail & Consumer</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing & Industrial</SelectItem>
                            <SelectItem value="agriculture">Agriculture & Food</SelectItem>
                            <SelectItem value="transport">Transport & Logistics</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="headquarters">Headquarters Location *</Label>
                        <Input
                          id="headquarters"
                          value={form.headquarters}
                          onChange={(e) => updateForm('headquarters', e.target.value)}
                          required
                          placeholder="e.g., Melbourne, Australia"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-foreground flex items-center">
                      <FileText className="w-6 h-6 text-primary-burgundy mr-3" />
                      Primary Contact Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primaryContactName">Contact Name *</Label>
                        <Input
                          id="primaryContactName"
                          value={form.primaryContactName}
                          onChange={(e) => updateForm('primaryContactName', e.target.value)}
                          required
                          placeholder="e.g., Dr. Alexandra Keller"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="primaryContactTitle">Title / Position *</Label>
                        <Input
                          id="primaryContactTitle"
                          value={form.primaryContactTitle}
                          onChange={(e) => updateForm('primaryContactTitle', e.target.value)}
                          required
                          placeholder="e.g., Chief Executive Officer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primaryContactEmail">Email Address *</Label>
                        <Input
                          id="primaryContactEmail"
                          type="email"
                          value={form.primaryContactEmail}
                          onChange={(e) => updateForm('primaryContactEmail', e.target.value)}
                          required
                          placeholder="e.g., alexandra.keller@nexacare.com.au"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="primaryContactPhone">Phone Number *</Label>
                        <Input
                          id="primaryContactPhone"
                          type="tel"
                          value={form.primaryContactPhone}
                          onChange={(e) => updateForm('primaryContactPhone', e.target.value)}
                          required
                          placeholder="e.g., +61 3 9999 1234"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Legal Matter Details */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-foreground flex items-center">
                      <Clock className="w-6 h-6 text-primary-burgundy mr-3" />
                      Legal Matter Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="matterType">Type of Legal Matter *</Label>
                        <Select value={form.matterType} onValueChange={(value) => updateForm('matterType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select matter type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="merger-acquisition">Merger & Acquisition</SelectItem>
                            <SelectItem value="corporate-restructuring">Corporate Restructuring</SelectItem>
                            <SelectItem value="private-equity">Private Equity Transaction</SelectItem>
                            <SelectItem value="due-diligence">Due Diligence</SelectItem>
                            <SelectItem value="capital-markets">Capital Markets</SelectItem>
                            <SelectItem value="employment-law">Employment Law</SelectItem>
                            <SelectItem value="commercial-contracts">Commercial Contracts</SelectItem>
                            <SelectItem value="regulatory-compliance">Regulatory & Compliance</SelectItem>
                            <SelectItem value="dispute-resolution">Dispute Resolution</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="urgency">Urgency Level *</Label>
                        <Select value={form.urgency} onValueChange={(value) => updateForm('urgency', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent (within 1 week)</SelectItem>
                            <SelectItem value="high">High (within 2-4 weeks)</SelectItem>
                            <SelectItem value="medium">Medium (within 1-2 months)</SelectItem>
                            <SelectItem value="low">Low (3+ months)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matterDescription">Matter Description *</Label>
                      <Textarea
                        id="matterDescription"
                        value={form.matterDescription}
                        onChange={(e) => updateForm('matterDescription', e.target.value)}
                        required
                        rows={4}
                        placeholder="Please provide a detailed description of your legal matter, including key objectives, parties involved, and any specific requirements..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="estimatedValue">Estimated Transaction/Matter Value</Label>
                        <Select value={form.estimatedValue} onValueChange={(value) => updateForm('estimatedValue', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select value range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-1m">Under $1M</SelectItem>
                            <SelectItem value="1m-10m">$1M - $10M</SelectItem>
                            <SelectItem value="10m-50m">$10M - $50M</SelectItem>
                            <SelectItem value="50m-100m">$50M - $100M</SelectItem>
                            <SelectItem value="100m-500m">$100M - $500M</SelectItem>
                            <SelectItem value="500m-1b">$500M - $1B</SelectItem>
                            <SelectItem value="over-1b">Over $1B</SelectItem>
                            <SelectItem value="na">Not Applicable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeline">Expected Timeline</Label>
                        <Select value={form.timeline} onValueChange={(value) => updateForm('timeline', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeline" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-3-months">1-3 months</SelectItem>
                            <SelectItem value="3-6-months">3-6 months</SelectItem>
                            <SelectItem value="6-12-months">6-12 months</SelectItem>
                            <SelectItem value="12-plus-months">12+ months</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="uncertain">Uncertain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-foreground flex items-center">
                      <CheckCircle className="w-6 h-6 text-primary-burgundy mr-3" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="existingLegalCounsel"
                        checked={form.existingLegalCounsel}
                        onCheckedChange={(checked) => updateForm('existingLegalCounsel', !!checked)}
                      />
                      <Label htmlFor="existingLegalCounsel">
                        We currently have existing legal counsel on this matter
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conflictEntities">Potential Conflict Entities</Label>
                      <Textarea
                        id="conflictEntities"
                        value={form.conflictEntities}
                        onChange={(e) => updateForm('conflictEntities', e.target.value)}
                        rows={3}
                        placeholder="Please list any entities, individuals, or organisations that may present a conflict of interest (counterparties, competitors, related entities, etc.)"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="confidentiality"
                          checked={form.confidentiality}
                          onCheckedChange={(checked) => updateForm('confidentiality', !!checked)}
                          required
                        />
                        <Label htmlFor="confidentiality" className="text-sm leading-relaxed">
                          I acknowledge that this information is confidential and that Kendry & Slate will 
                          treat it as privileged attorney-client communication, subject to conflict clearance. *
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="marketingConsent"
                          checked={form.marketingConsent}
                          onCheckedChange={(checked) => updateForm('marketingConsent', !!checked)}
                        />
                        <Label htmlFor="marketingConsent" className="text-sm leading-relaxed">
                          I consent to receiving legal updates and insights from Kendry & Slate 
                          (you can unsubscribe at any time).
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="text-center">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="elegant-button min-w-48"
                    disabled={isSubmitting || !form.confidentiality}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Confidential Intake
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    All information submitted is confidential and protected by attorney-client privilege
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}