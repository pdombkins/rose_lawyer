// Alternative download methods as fallbacks

export const downloadAsText = (content: string, filename: string) => {
  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.pdf', '.txt');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Text download failed:', error);
    throw error;
  }
};

export const generateCapabilityText = (): string => {
  return `
KENDRY & SLATE - CAPABILITY STATEMENT
=====================================

WHO WE ARE
----------
Kendry & Slate is Australia's leading M&A law firm, established in 1987. With over 37 years of experience, we have advised on more than $100 billion in transactions across six global offices. Our team of expert lawyers provides sophisticated legal solutions for complex mergers, acquisitions, and corporate transactions.

OUR TRACK RECORD
----------------
• Transaction Value: $100+ Billion
• Years of Experience: 37 Years  
• Deals Completed: 500+
• Global Offices: 6 Locations
• Legal Professionals: 120+ Lawyers

CORE PRACTICE AREAS
-------------------
MERGERS & ACQUISITIONS
Strategic counsel for complex M&A transactions, from initial structuring through completion.

CORPORATE RESTRUCTURING  
Comprehensive restructuring advice to optimise corporate structures and operations.

PRIVATE EQUITY
Specialised legal services for private equity funds, portfolio companies, and investors.

DUE DILIGENCE
Thorough legal and commercial due diligence to identify risks and opportunities.

CAPITAL MARKETS
Expert guidance on public and private capital raising transactions.

EMPLOYMENT LAW
Strategic employment law for M&A transactions and corporate restructuring.

PROPERTY LAW
Commercial real estate and development legal services.

PRIVACY & CYBER
Data protection and cybersecurity compliance advice.

CONTACT INFORMATION
-------------------
Kendry & Slate Legal
Offices: Sydney • Melbourne • Perth • London • Singapore • Brisbane
Website: www.kendryslate.com
Email: info@kendryslate.com
Phone: +61 2 9999 0000

© 2024 Kendry & Slate Legal. All rights reserved.
  `;
};

export const openPrintDialog = (content: string) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window - popup blocked?');
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kendry & Slate - Capability Statement</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px; 
            color: #333;
          }
          h1 { 
            color: #731F3B; 
            border-bottom: 2px solid #731F3B; 
            padding-bottom: 10px;
          }
          h2 { 
            color: #731F3B; 
            margin-top: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .contact-info {
            background: #f5f5f5;
            padding: 20px;
            border-left: 4px solid #731F3B;
          }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KENDRY & SLATE</h1>
          <p><strong>Legal Excellence Since 1987</strong></p>
        </div>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${content}</pre>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
  } catch (error) {
    console.error('Print dialog failed:', error);
    throw error;
  }
};