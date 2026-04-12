export interface Technician {
  id: string;
  name: string;
  qualifications: string[];
  maxDailyHours?: number;
}

export interface PlanEntry {
  id: string;
  planId: string;
  leaseId: string;
  technicianId: string;
  scheduledDate: string;
  estimatedHours: number;
  status: string;
  conflictStatus: string | null;
  conflictDetails: string | null;
  aiReasoning: string | null;
  technician: { id: string; name: string; qualifications: string[] };
  lease: {
    serviceType: string;
    contract: {
      object: {
        id: string;
        name: string;
        address: string;
        city: string;
        postalCode: string;
      };
    };
  };
}

export interface AnnualPlan {
  id: string;
  year: number;
  status: "DRAFT" | "RELEASED" | "EXECUTING" | "COMPLETED";
  entries: PlanEntry[];
}

export type ConflictStatus = "OK" | "WARNUNG" | "KONFLIKT";

export const ANLAGENTYP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HEIZUNG: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  KLIMA: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  ELEKTRO: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  BRANDSCHUTZ: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  SANITAER: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  DEFAULT: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

export const PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  RELEASED: "Freigegeben",
  EXECUTING: "In Ausführung",
  COMPLETED: "Abgeschlossen",
};

export const MONTH_NAMES = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];
