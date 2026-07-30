// Baseline Schedule Reference for NexaCare Health Matter
// This file stores the baseline schedule data extracted from the uploaded image (v2)
// Used by the re-baseline function to calculate duration and relative distances between tasks
// Updated: 2025-01-09 with comprehensive 49-task schedule across all 5 workstreams

export interface BaselineTask {
  taskId: string;
  phase: string;
  taskTitle: string;
  description: string;
  resource: string;
  estimatedHours: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

// Complete baseline schedule data extracted from nexacare-baseline-schedule-v2.png
// This serves as the authoritative reference for all re-baseline operations
export const NEXACARE_BASELINE_SCHEDULE: BaselineTask[] = [
  // SCOPING WORKSTREAM (8 tasks)
  { taskId: "S1", phase: "Scoping", taskTitle: "Conduct conflict check", description: "Initial conflict check", resource: "Mia Rossi", estimatedHours: 6, startDate: "2025-09-08", endDate: "2025-09-08" },
  { taskId: "S2", phase: "Scoping", taskTitle: "Execute confidentiality agreement", description: "Execute confidentiality agreement", resource: "Lily Chen, Mia Rossi, Aisha Rahman", estimatedHours: 5, startDate: "2025-09-08", endDate: "2025-09-09" },
  { taskId: "S3", phase: "Scoping", taskTitle: "Request and analyse client needs", description: "Request and analyse client needs", resource: "James Bentley, Lily Chen, Aisha Rahman", estimatedHours: 10, startDate: "2025-09-08", endDate: "2025-09-09" },
  { taskId: "S4", phase: "Scoping", taskTitle: "Review instructions", description: "Review instructions", resource: "Lily Chen, Aisha Rahman", estimatedHours: 11, startDate: "2025-09-08", endDate: "2025-09-08" },
  { taskId: "S5", phase: "Scoping", taskTitle: "Analyse risk memorandum", description: "Analyse risk memorandum", resource: "James Bentley, Lily Chen", estimatedHours: 7, startDate: "2025-09-09", endDate: "2025-09-10" },
  { taskId: "S6", phase: "Scoping", taskTitle: "Conduct conflict check", description: "Secondary conflict check", resource: "Aisha Rahman", estimatedHours: 2, startDate: "2025-09-09", endDate: "2025-09-09" },
  { taskId: "S7", phase: "Scoping", taskTitle: "Review project planning report", description: "Review project planning report", resource: "Lily Chen, James Bentley", estimatedHours: 9, startDate: "2025-09-10", endDate: "2025-09-10" },
  { taskId: "S8", phase: "Scoping", taskTitle: "Conduct & document client meeting & obtain sign-off", description: "Client meeting and sign-off", resource: "James Bentley, Lily Chen, Mia Rossi", estimatedHours: 11, startDate: "2025-09-11", endDate: "2025-09-11" },

  // DUE DILIGENCE WORKSTREAM (12 tasks)
  { taskId: "DD1", phase: "Due Diligence", taskTitle: "Create checklist for documentation and information requests", description: "Create documentation checklist", resource: "Aisha Rahman, Lily Chen", estimatedHours: 11, startDate: "2025-09-15", endDate: "2025-09-16" },
  { taskId: "DD2", phase: "Due Diligence", taskTitle: "Input client instructions", description: "Input client instructions", resource: "Aisha Rahman, Mia Rossi, Lily Chen", estimatedHours: 13, startDate: "2025-09-15", endDate: "2025-09-15" },
  { taskId: "DD3", phase: "Due Diligence", taskTitle: "Arrange kickoff meeting and draft plan", description: "Kickoff meeting and plan", resource: "Mia Rossi, Aisha Rahman, James Bentley", estimatedHours: 65, startDate: "2025-09-16", endDate: "2025-09-17" },
  { taskId: "DD4", phase: "Due Diligence", taskTitle: "Review documents", description: "Document review", resource: "Mia Rossi, Lily Chen", estimatedHours: 45, startDate: "2025-09-18", endDate: "2025-09-24" },
  { taskId: "DD5", phase: "Due Diligence", taskTitle: "Create checklist for documentation and information requests", description: "Secondary checklist creation", resource: "Mia Rossi, Aisha Rahman", estimatedHours: 11, startDate: "2025-09-16", endDate: "2025-09-16" },
  { taskId: "DD6", phase: "Due Diligence", taskTitle: "Report and flag all documentation/information issues", description: "Flag documentation issues", resource: "Lily Chen, Aisha Rahman", estimatedHours: 25, startDate: "2025-09-24", endDate: "2025-09-26" },
  { taskId: "DD7", phase: "Due Diligence", taskTitle: "Develop draft DD report/presentation", description: "Draft DD report", resource: "Aisha Rahman, Mia Rossi", estimatedHours: 32, startDate: "2025-09-26", endDate: "2025-09-30" },
  { taskId: "DD8", phase: "Due Diligence", taskTitle: "Complete draft DD report", description: "Complete DD report", resource: "Lily Chen, James Bentley", estimatedHours: 24, startDate: "2025-09-30", endDate: "2025-10-02" },
  { taskId: "DD9", phase: "Due Diligence", taskTitle: "Finalise DD report with client & team review", description: "Finalise DD report", resource: "Aisha Rahman, James Bentley", estimatedHours: 8, startDate: "2025-10-02", endDate: "2025-10-03" },
  { taskId: "DD10", phase: "Due Diligence", taskTitle: "Receive response from sellers", description: "Receive seller response", resource: "Mia Rossi", estimatedHours: 3, startDate: "2025-10-03", endDate: "2025-10-06" },
  { taskId: "DD11", phase: "Due Diligence", taskTitle: "Deliver finalised DD report", description: "Deliver final DD report", resource: "Mia Rossi", estimatedHours: 2, startDate: "2025-10-06", endDate: "2025-10-06" },
  { taskId: "DD12", phase: "Due Diligence", taskTitle: "Get internal sign-off", description: "Internal sign-off", resource: "James Bentley", estimatedHours: 2, startDate: "2025-10-06", endDate: "2025-10-06" },

  // DOCUMENTATION & NEGOTIATION WORKSTREAM (10 tasks)
  { taskId: "DN1", phase: "Documentation & Negotiation", taskTitle: "Draft term sheet", description: "Draft term sheet", resource: "Lily Chen, James Bentley, Aisha Rahman", estimatedHours: 26, startDate: "2025-10-07", endDate: "2025-10-08" },
  { taskId: "DN2", phase: "Documentation & Negotiation", taskTitle: "Input client instructions", description: "Input client instructions", resource: "Aisha Rahman, Lily Chen, James Bentley", estimatedHours: 36, startDate: "2025-10-08", endDate: "2025-10-13" },
  { taskId: "DN3", phase: "Documentation & Negotiation", taskTitle: "Draft and review agreement (SPA)", description: "Draft SPA", resource: "Aisha Rahman, Lily Chen", estimatedHours: 12, startDate: "2025-10-14", endDate: "2025-10-15" },
  { taskId: "DN4", phase: "Documentation & Negotiation", taskTitle: "Prepare negotiators term sheet", description: "Prepare negotiators term sheet", resource: "Lily Chen, Aisha Rahman", estimatedHours: 22, startDate: "2025-10-14", endDate: "2025-10-14" },
  { taskId: "DN5", phase: "Documentation & Negotiation", taskTitle: "Review SPA", description: "Review SPA", resource: "Mia Rossi, James Bentley, Lily Chen", estimatedHours: 30, startDate: "2025-10-15", endDate: "2025-10-17" },
  { taskId: "DN6", phase: "Documentation & Negotiation", taskTitle: "Complete SPA versions/amendments", description: "Complete SPA amendments", resource: "Mia Rossi, Aisha Rahman", estimatedHours: 24, startDate: "2025-10-16", endDate: "2025-10-21" },
  { taskId: "DN7", phase: "Documentation & Negotiation", taskTitle: "Integrate issues in revised SPA", description: "Integrate SPA issues", resource: "Lily Chen", estimatedHours: 6, startDate: "2025-10-16", endDate: "2025-10-17" },
  { taskId: "DN8", phase: "Documentation & Negotiation", taskTitle: "Prepare CP cards", description: "Prepare CP cards", resource: "Aisha Rahman, James Bentley", estimatedHours: 14, startDate: "2025-10-20", endDate: "2025-10-21" },
  { taskId: "DN9", phase: "Documentation & Negotiation", taskTitle: "Integrate issues in revised SPA", description: "Integrate revised SPA issues", resource: "Lily Chen, Mia Rossi", estimatedHours: 10, startDate: "2025-10-22", endDate: "2025-10-22" },
  { taskId: "DN10", phase: "Documentation & Negotiation", taskTitle: "Finalise draft SPA to sign & execute", description: "Finalise SPA", resource: "Lily Chen, Mia Rossi", estimatedHours: 10, startDate: "2025-10-22", endDate: "2025-10-22" },

  // POST EXECUTION WORKSTREAM (11 tasks)
  { taskId: "PE1", phase: "Post Execution", taskTitle: "Execution register update on file", description: "Update execution register", resource: "Mia Rossi", estimatedHours: 3, startDate: "2025-10-23", endDate: "2025-10-23" },
  { taskId: "PE2", phase: "Post Execution", taskTitle: "Handle ancillary documents", description: "Handle ancillary documents", resource: "Aisha Rahman, Lily Chen, Mia Rossi", estimatedHours: 27, startDate: "2025-10-23", endDate: "2025-10-27" },
  { taskId: "PE3", phase: "Post Execution", taskTitle: "Prepare for SPA execution", description: "Prepare SPA execution", resource: "Aisha Rahman, Mia Rossi", estimatedHours: 11, startDate: "2025-10-23", endDate: "2025-10-24" },
  { taskId: "PE4", phase: "Post Execution", taskTitle: "Attend Form F completion", description: "Form F completion", resource: "Aisha Rahman", estimatedHours: 8, startDate: "2025-10-24", endDate: "2025-10-27" },
  { taskId: "PE5", phase: "Post Execution", taskTitle: "Handle ancillary documents", description: "Handle ancillary documents (2)", resource: "Lily Chen, James Bentley", estimatedHours: 8, startDate: "2025-10-24", endDate: "2025-10-27" },
  { taskId: "PE6", phase: "Post Execution", taskTitle: "Review completion checklist", description: "Review completion checklist", resource: "Aisha Rahman, Mia Rossi", estimatedHours: 8, startDate: "2025-10-24", endDate: "2025-10-27" },
  { taskId: "PE7", phase: "Post Execution", taskTitle: "Determine completion date", description: "Determine completion date", resource: "Mia Rossi, James Bentley", estimatedHours: 5, startDate: "2025-10-27", endDate: "2025-10-28" },
  { taskId: "PE8", phase: "Post Execution", taskTitle: "Put pre-completion actions in place", description: "Pre-completion actions", resource: "Lily Chen", estimatedHours: 6, startDate: "2025-10-28", endDate: "2025-10-28" },
  { taskId: "PE9", phase: "Post Execution", taskTitle: "Track & report on completion", description: "Track completion", resource: "Lily Chen, Mia Rossi, James Bentley", estimatedHours: 14, startDate: "2025-10-28", endDate: "2025-10-30" },
  { taskId: "PE10", phase: "Post Execution", taskTitle: "Arrange completion structure", description: "Arrange completion structure", resource: "Lily Chen", estimatedHours: 6, startDate: "2025-10-29", endDate: "2025-10-29" },
  { taskId: "PE11", phase: "Post Execution", taskTitle: "Manage completion process", description: "Manage completion process", resource: "Lily Chen", estimatedHours: 6, startDate: "2025-10-31", endDate: "2025-10-31" },

  // POST CLOSING WORKSTREAM (8 tasks)
  { taskId: "PC1", phase: "Post Closing", taskTitle: "Assist client", description: "Assist client", resource: "Aisha Rahman, Mia Rossi", estimatedHours: 12, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC2", phase: "Post Closing", taskTitle: "Complete assignments", description: "Complete assignments", resource: "Aisha Rahman, Mia Rossi", estimatedHours: 24, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC3", phase: "Post Closing", taskTitle: "Execute completion steps", description: "Execute completion steps", resource: "Mia Rossi", estimatedHours: 8, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC4", phase: "Post Closing", taskTitle: "Finalise client filing matrix", description: "Client filing matrix", resource: "Aisha Rahman", estimatedHours: 8, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC5", phase: "Post Closing", taskTitle: "Handle post completion matters", description: "Post completion matters", resource: "Mia Rossi, James Bentley", estimatedHours: 8, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC6", phase: "Post Closing", taskTitle: "Record all copies for operational needs", description: "Record operational copies", resource: "Mia Rossi, James Bentley", estimatedHours: 8, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC7", phase: "Post Closing", taskTitle: "Review final files and close file/deal", description: "Review and close deal", resource: "Mia Rossi", estimatedHours: 2, startDate: "2025-10-31", endDate: "2025-10-31" },
  { taskId: "PC8", phase: "Post Closing", taskTitle: "Update and run completion checklist", description: "Final completion checklist", resource: "Mia Rossi", estimatedHours: 2, startDate: "2025-10-31", endDate: "2025-10-31" },
];

// Helper function to get baseline task by title
export function getBaselineTaskByTitle(title: string): BaselineTask | undefined {
  return NEXACARE_BASELINE_SCHEDULE.find(task => 
    task.taskTitle.toLowerCase().includes(title.toLowerCase()) ||
    title.toLowerCase().includes(task.taskTitle.toLowerCase())
  );
}

// Helper function to calculate business days between two dates
export function calculateBusinessDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return businessDays;
}

// Helper function to get relative distance between tasks (in business days)
export function getRelativeDistance(fromTaskTitle: string, toTaskTitle: string): number {
  const fromTask = getBaselineTaskByTitle(fromTaskTitle);
  const toTask = getBaselineTaskByTitle(toTaskTitle);
  
  if (!fromTask || !toTask) {
    return 0;
  }
  
  return calculateBusinessDaysBetween(fromTask.endDate, toTask.startDate);
}