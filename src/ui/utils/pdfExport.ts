import jsPDF from "jspdf";
import { LLMResponse } from "../../shared/types.js";

/**
 * Generate PDF report from LLM response with OptiRise branding
 */
export async function generatePDFReport(response: LLMResponse, situation?: string, goal?: string, promptVersion?: string): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header with OptiRise branding
  doc.setFontSize(20);
  doc.setTextColor(0, 123, 255); // Blue color
  doc.text("OptiRise", margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Elevating Your Time. Your Potential.", margin, yPos);
  yPos += 12;

  // Date and Prompt Version
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPos);
  yPos += 5;
  if (promptVersion) {
    doc.text(`Prompt Version: ${promptVersion}`, margin, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Summary
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.text("Summary", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(50, 50, 50);
  const summaryLines = doc.splitTextToSize(response.summary || "", pageWidth - 2 * margin);
  summaryLines.forEach((line: string) => {
    checkNewPage(6);
    doc.text(line || "", margin, yPos);
    yPos += 6;
  });
  yPos += 8;

  // Situation & Goal (if provided)
  if (situation || goal) {
    checkNewPage(15);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Context", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    if (situation) {
      doc.setFont(undefined, "bold");
      doc.text("Situation:", margin, yPos);
      doc.setFont(undefined, "normal");
      const situationLines = doc.splitTextToSize(situation || "", pageWidth - 2 * margin);
      situationLines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(line || "", margin + 5, yPos);
        yPos += 6;
      });
      yPos += 4;
    }
    if (goal) {
      doc.setFont(undefined, "bold");
      doc.text("Goal:", margin, yPos);
      doc.setFont(undefined, "normal");
      const goalLines = doc.splitTextToSize(goal || "", pageWidth - 2 * margin);
      goalLines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(line || "", margin + 5, yPos);
        yPos += 6;
      });
      yPos += 4;
    }
    yPos += 8;
  }

  // Immediate Steps
  checkNewPage(20);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 123, 255);
  doc.text("Immediate Actions", margin, yPos);
  yPos += 10;

  response.immediate_steps.forEach((step, index) => {
    checkNewPage(30);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Step ${index + 1}:`, margin, yPos);
    yPos += 7;

    // Step description (clean up CTA templates for PDF)
    const stepText = (step.step || "").split("|")[0].trim();
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const stepLines = doc.splitTextToSize(stepText, pageWidth - 2 * margin);
    stepLines.forEach((line: string) => {
      checkNewPage(6);
      doc.text(line || "", margin + 5, yPos);
      yPos += 6;
    });
    yPos += 4;

    // Step metadata
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const metadata = [
      `Effort: ${step.effort}`,
      `Impact: ${step.delta_bucket}`,
      `Confidence: ${step.confidence}`,
      `Time: ${step.TTI}`,
    ].join(" | ");
    doc.text(metadata, margin + 5, yPos);
    yPos += 8;
  });
  yPos += 5;

  // Strategic Lens
  checkNewPage(20);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Strategic Lens", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(50, 50, 50);
  const lensLines = doc.splitTextToSize(response.strategic_lens || "", pageWidth - 2 * margin);
  lensLines.forEach((line: string) => {
    checkNewPage(6);
    doc.text(line || "", margin, yPos);
    yPos += 6;
  });
  yPos += 8;

  // Top Risks
  if (response.top_risks.length > 0) {
    checkNewPage(25);
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Top Risks & Mitigations", margin, yPos);
    yPos += 10;

    response.top_risks.forEach((risk) => {
      checkNewPage(25);
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(200, 0, 0);
      doc.text(`Risk: ${risk.risk}`, margin, yPos);
      yPos += 7;

      doc.setFont(undefined, "normal");
      doc.setTextColor(50, 50, 50);
      const mitigationLines = doc.splitTextToSize(risk.mitigation || "", pageWidth - 2 * margin);
      mitigationLines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(`Mitigation: ${line || ""}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 6;
    });
  }

  // KPI
  checkNewPage(15);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("Key Performance Indicator", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`${response.kpi?.name || "KPI"}: ${response.kpi?.target || ""} (${response.kpi?.cadence || ""})`, margin, yPos);
  yPos += 10;

  // Micro-nudge
  checkNewPage(15);
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Micro-Nudge", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "italic");
  doc.setTextColor(100, 100, 100);
  const nudgeLines = doc.splitTextToSize(response.micro_nudge || "", pageWidth - 2 * margin);
  nudgeLines.forEach((line: string) => {
    checkNewPage(6);
    doc.text(line || "", margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Module
  if (response.module && response.module.steps.length > 0) {
    checkNewPage(25);
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`Module: ${response.module.name || ""}`, margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    response.module.steps.forEach((step, index) => {
      checkNewPage(8);
      doc.text(`${index + 1}. ${step || ""}`, margin + 5, yPos);
      yPos += 7;
    });
  }

  // Footer on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `OptiRise. Elevating Your Time. Your Potential. | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Download PDF
  const fileName = `OptiRise_Analysis_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

