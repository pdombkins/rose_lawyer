import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { calculateMatterProfitability, ProfitabilityData } from './profitabilityCalculator';

export const generateFinancialReport = async (matterId: string) => {
  try {
    // Get profitability data using the existing calculator
    const profitabilityData = await calculateMatterProfitability(matterId);

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "Financial Analysis Report",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Matter details
          new Paragraph({
            children: [
              new TextRun({
                text: `Matter: ${profitabilityData.matterTitle}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Report Generated: ${new Date().toLocaleDateString()}`,
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Financial Summary
          new Paragraph({
            children: [
              new TextRun({
                text: "FINANCIAL SUMMARY",
                bold: true,
                size: 28,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Charge Revenue: $${profitabilityData.totalChargeRevenue.toLocaleString()}`,
                size: 20,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Base Cost: $${profitabilityData.totalBaseCost.toLocaleString()}`,
                size: 20,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Hours: ${profitabilityData.totalHours.toFixed(2)}`,
                size: 20,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Matter Profitability: ${profitabilityData.profitability.toFixed(1)}%`,
                size: 24,
                bold: true,
                color: profitabilityData.profitability > 0 ? "228B22" : "DC143C",
              }),
            ],
            spacing: { after: 600 },
          }),

          // Detailed Analysis Table
          new Paragraph({
            children: [
              new TextRun({
                text: "DETAILED COST ANALYSIS",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })],
                    width: { size: 12, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Lawyer", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Task", bold: true })] })],
                    width: { size: 18, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Hours", bold: true })] })],
                    width: { size: 10, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Charge Rate", bold: true })] })],
                    width: { size: 12, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Cost Rate", bold: true })] })],
                    width: { size: 12, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Charge Cost", bold: true })] })],
                    width: { size: 12, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Base Cost", bold: true })] })],
                    width: { size: 12, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              
              // Data rows
              ...profitabilityData.timeEntries.map(entry => new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: entry.date })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: entry.lawyerName })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: entry.taskTitle })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: entry.hours.toFixed(2) })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `$${entry.chargeRate}/h` })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `$${entry.costRate}/h` })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `$${entry.chargeCost.toLocaleString()}` })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `$${entry.baseCost.toLocaleString()}` })] })],
                  }),
                ],
              })),
              
              // Total row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })],
                    columnSpan: 3,
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ 
                        text: profitabilityData.totalHours.toFixed(2),
                        bold: true 
                      })] 
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ 
                        text: `$${profitabilityData.totalChargeRevenue.toLocaleString()}`,
                        bold: true 
                      })] 
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ 
                        text: `$${profitabilityData.totalBaseCost.toLocaleString()}`,
                        bold: true 
                      })] 
                    })],
                  }),
                ],
              }),
              
              // Profitability row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ 
                        text: `PROFITABILITY: ${profitabilityData.profitability.toFixed(1)}%`, 
                        bold: true,
                        color: profitabilityData.profitability > 0 ? "228B22" : "DC143C"
                      })] 
                    })],
                    columnSpan: 8,
                  }),
                ],
              }),
            ],
          }),

          // Performance Analysis
          new Paragraph({
            children: [
              new TextRun({
                text: "PERFORMANCE ANALYSIS",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 600, after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Gross Margin: $${(profitabilityData.totalChargeRevenue - profitabilityData.totalBaseCost).toLocaleString()}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Average Charge Rate: $${profitabilityData.totalHours > 0 ? (profitabilityData.totalChargeRevenue / profitabilityData.totalHours).toFixed(0) : 0}/hour`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Average Cost Rate: $${profitabilityData.totalHours > 0 ? (profitabilityData.totalBaseCost / profitabilityData.totalHours).toFixed(0) : 0}/hour`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
        ],
      }],
    });

    // Generate and download the document
    const buffer = await Packer.toBuffer(doc);
    const fileName = `Financial_Report_${profitabilityData.matterTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
    
    saveAs(new Blob([new Uint8Array(buffer).buffer]), fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error generating financial report:', error);
    throw error;
  }
};