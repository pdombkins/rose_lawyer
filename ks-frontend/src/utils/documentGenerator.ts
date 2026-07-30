import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Fallback function for simple text-based PDF
const createSimplePDF = (title: string, content: string): Uint8Array => {
  try {
    const doc = new jsPDF();
    
    // Simple header
    doc.setFontSize(18);
    doc.setTextColor(115, 31, 59);
    doc.text(title, 10, 20);
    
    // Content
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(content, 190);
    doc.text(lines, 10, 40);
    
    return new Uint8Array(doc.output('arraybuffer'));
  } catch (error) {
    console.error('Simple PDF creation failed:', error);
    throw error;
  }
};

export interface DocumentTemplate {
  title: string;
  filename: string;
  content: any;
}

export class DocumentGenerator {
  private static addHeader(doc: jsPDF, title: string) {
    // Header background
    doc.setFillColor(115, 31, 59); // Primary burgundy
    doc.rect(0, 0, 210, 30, 'F');
    
    // Logo area (placeholder)
    doc.setFillColor(255, 255, 255);
    doc.rect(10, 5, 30, 20, 'F');
    doc.setFontSize(12);
    doc.setTextColor(115, 31, 59);
    doc.text('K&S', 25, 17, { align: 'center' });
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 50, 20);
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
  }

  private static addFooter(doc: jsPDF, pageNumber: number) {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    
    // Footer line
    doc.line(10, pageHeight - 20, 200, pageHeight - 20);
    
    // Contact info
    doc.text('Kendry & Slate Legal | Sydney • Melbourne • Perth • London • Singapore • Brisbane', 10, pageHeight - 15);
    doc.text('www.kendryslate.com | info@kendryslate.com | +61 2 9999 0000', 10, pageHeight - 10);
    
    // Page number
    doc.text(`Page ${pageNumber}`, 200, pageHeight - 10, { align: 'right' });
  }

  static generateMainCapabilityStatement(): Uint8Array {
    try {
      console.log('Initializing jsPDF...');
      
      // Try advanced PDF generation first
      try {
        const doc = new jsPDF();
        let yPosition = 40;
        
        console.log('Adding header...');
        this.addHeader(doc, 'Kendry & Slate - Legal Excellence Since 1987');
        
        // Introduction
        console.log('Adding introduction section...');
        doc.setFontSize(16);
        doc.setTextColor(115, 31, 59);
        doc.text('Who We Are', 10, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const introText = `Kendry & Slate is Australia's leading M&A law firm, established in 1987. With over 37 years of experience, we have advised on more than $100 billion in transactions across six global offices. Our team of expert lawyers provides sophisticated legal solutions for complex mergers, acquisitions, and corporate transactions.`;
        const introLines = doc.splitTextToSize(introText, 190);
        doc.text(introLines, 10, yPosition);
        yPosition += (introLines.length * 5) + 10;
        
        // Key Statistics
        console.log('Adding statistics table...');
        doc.setFontSize(16);
        doc.setTextColor(115, 31, 59);
        doc.text('Our Track Record', 10, yPosition);
        yPosition += 15;
        
        const stats = [
          ['Transaction Value', '$100+ Billion'],
          ['Years of Experience', '37 Years'],
          ['Deals Completed', '500+'],
          ['Global Offices', '6 Locations'],
          ['Legal Professionals', '120+ Lawyers']
        ];
        
        doc.autoTable({
          startY: yPosition,
          head: [['Metric', 'Achievement']],
          body: stats,
          theme: 'grid',
          headStyles: { fillColor: [115, 31, 59] },
          margin: { left: 10, right: 10 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
        
        // Services Overview
        console.log('Adding services table...');
        doc.setFontSize(16);
        doc.setTextColor(115, 31, 59);
        doc.text('Core Practice Areas', 10, yPosition);
        yPosition += 15;
        
        const services = [
          ['Mergers & Acquisitions', 'Strategic counsel for complex M&A transactions'],
          ['Corporate Restructuring', 'Comprehensive restructuring and governance advice'],
          ['Private Equity', 'Specialized services for PE funds and portfolio companies'],
          ['Due Diligence', 'Thorough legal and commercial due diligence'],
          ['Capital Markets', 'Expert guidance on public and private capital raising'],
          ['Employment Law', 'Strategic employment law for transactions'],
          ['Property Law', 'Commercial real estate and development'],
          ['Privacy & Cyber', 'Data protection and cybersecurity compliance']
        ];
        
        doc.autoTable({
          startY: yPosition,
          head: [['Practice Area', 'Description']],
          body: services,
          theme: 'striped',
          headStyles: { fillColor: [115, 31, 59] },
          margin: { left: 10, right: 10 }
        });
        
        console.log('Adding footer...');
        this.addFooter(doc, 1);
        
        console.log('Generating output buffer...');
        const output = new Uint8Array(doc.output('arraybuffer'));
        console.log('Buffer generated, size:', output.length);
        return output;
        
      } catch (advancedError) {
        console.warn('Advanced PDF generation failed, trying simple approach:', advancedError);
        
        // Fallback to simple PDF
        const simpleContent = `
KENDRY & SLATE - CAPABILITY STATEMENT

Who We Are:
Kendry & Slate is Australia's leading M&A law firm, established in 1987. With over 37 years of experience, we have advised on more than $100 billion in transactions across six global offices.

Our Track Record:
• Transaction Value: $100+ Billion
• Years of Experience: 37 Years  
• Deals Completed: 500+
• Global Offices: 6 Locations
• Legal Professionals: 120+ Lawyers

Core Practice Areas:
• Mergers & Acquisitions - Strategic counsel for complex M&A transactions
• Corporate Restructuring - Comprehensive restructuring and governance advice
• Private Equity - Specialized services for PE funds and portfolio companies
• Due Diligence - Thorough legal and commercial due diligence
• Capital Markets - Expert guidance on public and private capital raising
• Employment Law - Strategic employment law for transactions
• Property Law - Commercial real estate and development
• Privacy & Cyber - Data protection and cybersecurity compliance

Contact:
Kendry & Slate Legal
Sydney • Melbourne • Perth • London • Singapore • Brisbane
www.kendryslate.com | info@kendryslate.com | +61 2 9999 0000
        `;
        
        return createSimplePDF('Kendry & Slate - Capability Statement', simpleContent);
      }
      
    } catch (error) {
      console.error('All PDF generation methods failed:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static generateServiceCapabilityStatement(service: string, description: string, capabilities: string[]): Uint8Array {
    const doc = new jsPDF();
    let yPosition = 40;
    
    this.addHeader(doc, `${service} Capability Statement`);
    
    // Service Introduction
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text(`Expert ${service} Services`, 10, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const introLines = doc.splitTextToSize(description, 190);
    doc.text(introLines, 10, yPosition);
    yPosition += (introLines.length * 5) + 15;
    
    // Key Capabilities
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('Key Capabilities', 10, yPosition);
    yPosition += 10;
    
    capabilities.forEach((capability, index) => {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`• ${capability}`, 15, yPosition);
      yPosition += 7;
    });
    
    yPosition += 10;
    
    // Recent Experience
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('Recent Experience', 10, yPosition);
    yPosition += 15;
    
    const sampleDeals = [
      ['2024', 'HealthTech Acquisition', '$2.5B'],
      ['2024', 'Mining Group Restructure', '$1.8B'],
      ['2023', 'Private Equity Buyout', '$900M'],
      ['2023', 'Cross-border Merger', '$1.2B']
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [['Year', 'Transaction', 'Value']],
      body: sampleDeals,
      theme: 'grid',
      headStyles: { fillColor: [115, 31, 59] },
      margin: { left: 10, right: 10 }
    });
    
    this.addFooter(doc, 1);
    
    return new Uint8Array(doc.output('arraybuffer'));
  }

  static generateCompanyBrochure(): Uint8Array {
    const doc = new jsPDF();
    let yPosition = 40;
    
    this.addHeader(doc, 'Kendry & Slate - Company Overview');
    
    // About Us
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('About Kendry & Slate', 10, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const aboutText = `Founded in 1987 by James Bentley, Kendry & Slate has grown to become Australia's premier M&A law firm. We deliver sophisticated legal solutions with uncompromising attention to detail and precision, building lasting relationships based on trust, transparency, and deep understanding of our clients' businesses.`;
    const aboutLines = doc.splitTextToSize(aboutText, 190);
    doc.text(aboutLines, 10, yPosition);
    yPosition += (aboutLines.length * 5) + 15;
    
    // Global Presence
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('Global Presence', 10, yPosition);
    yPosition += 15;
    
    const offices = [
      ['Sydney', 'Level 42, Gateway Tower, 1 Macquarie Place', 'Australia HQ'],
      ['Melbourne', 'Level 38, Collins Street Tower, 480 Collins St', 'Victoria Office'],
      ['Perth', 'Level 29, QV1 Building, 250 St Georges Terrace', 'WA Office'],
      ['London', 'Level 15, The Shard, 32 London Bridge Street', 'European Office'],
      ['Singapore', 'Level 35, Marina Bay Financial Centre', 'Asian Office'],
      ['Brisbane', 'Level 28, Riverside Centre, 123 Eagle Street', 'Queensland Office']
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [['Office', 'Address', 'Role']],
      body: offices,
      theme: 'striped',
      headStyles: { fillColor: [115, 31, 59] },
      margin: { left: 10, right: 10 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    // Awards & Recognition
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('Awards & Recognition', 10, yPosition);
    yPosition += 15;
    
    const awards = [
      ['2024', 'Law Firm of the Year - M&A', 'Australian Financial Review Legal Awards'],
      ['2023', 'Deal of the Year - Healthcare M&A', 'Chambers Asia-Pacific Awards'],
      ['2023', 'Tier 1 Ranking - Corporate/M&A', 'Chambers Asia-Pacific'],
      ['2022', 'Law Firm of the Year - Private Equity', 'Legal 500 Asia-Pacific Awards']
    ];
    
    doc.autoTable({
      startY: yPosition,
      head: [['Year', 'Award', 'Organisation']],
      body: awards,
      theme: 'grid',
      headStyles: { fillColor: [115, 31, 59] },
      margin: { left: 10, right: 10 }
    });
    
    this.addFooter(doc, 1);
    
    return new Uint8Array(doc.output('arraybuffer'));
  }

  static generateOfficeGuide(officeName: string, address: string, description: string): Uint8Array {
    const doc = new jsPDF();
    let yPosition = 40;
    
    this.addHeader(doc, `${officeName} Office Guide`);
    
    // Office Overview
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text(`${officeName} Office`, 10, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Address: ${address}`, 10, yPosition);
    yPosition += 10;
    
    const descLines = doc.splitTextToSize(description, 190);
    doc.text(descLines, 10, yPosition);
    yPosition += (descLines.length * 5) + 15;
    
    // Contact Information
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('Contact Information', 10, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Phone: +61 2 9999 0000', 10, yPosition);
    yPosition += 7;
    doc.text(`Email: ${officeName.toLowerCase()}@kendryslate.com`, 10, yPosition);
    yPosition += 7;
    doc.text('Website: www.kendryslate.com', 10, yPosition);
    yPosition += 15;
    
    // Getting Here
    doc.setFontSize(16);
    doc.setTextColor(115, 31, 59);
    doc.text('Getting Here', 10, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('• Conveniently located in the central business district', 10, yPosition);
    yPosition += 7;
    doc.text('• Easy access via public transport and major highways', 10, yPosition);
    yPosition += 7;
    doc.text('• Secure parking available in building', 10, yPosition);
    yPosition += 7;
    doc.text('• Walking distance to major business and financial centers', 10, yPosition);
    
    this.addFooter(doc, 1);
    
    return new Uint8Array(doc.output('arraybuffer'));
  }
}

export const downloadDocument = (content: Uint8Array, filename: string) => {
  try {
    console.log('Creating blob for download:', filename, 'Size:', content.length);
    const blob = new Blob([content as unknown as ArrayBuffer], { type: 'application/pdf' });
    console.log('Blob created:', blob.size, 'bytes');
    
    const url = URL.createObjectURL(blob);
    console.log('Object URL created:', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none'; // Hide the link
    
    document.body.appendChild(link);
    console.log('Link added to DOM');
    
    link.click();
    console.log('Download triggered');
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Cleanup completed');
    }, 100);
    
  } catch (error) {
    console.error('Error in downloadDocument:', error);
    throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};