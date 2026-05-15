import { Target, Briefcase, FileText, Scale, Wallet, GraduationCap, type LucideIcon } from "lucide-react";

export type AdvocacyApp = {
  name: string;
  url: string;
  description: string;
  Icon: LucideIcon;
  active?: boolean;
};

export const ADVOCACY_APPS: AdvocacyApp[] = [
  { name: "Advocase", url: "https://advocaseai-byadvocacyai.lovable.app", description: "CRM, SDR e captação jurídica.", Icon: Target },
  { name: "Advoga", url: "https://advogaai-byadvocacy.lovable.app", description: "Gestão de processos e escritório.", Icon: Briefcase },
  { name: "Peticiona", url: "https://peticionaai-byadvocacyai.lovable.app", description: "Petições, minutas e contratos.", Icon: FileText },
  { name: "Inventaria", url: "https://inventariaai-byadvocacyai.lovable.app", description: "Planejamento patrimonial e sucessório.", Icon: Scale },
  { name: "Fin", url: "https://finai-byadvocacyia.lovable.app", description: "Inteligência financeira e conciliação.", Icon: Wallet },
  { name: "Study", url: "https://studyai-byadvocacyai.lovable.app", description: "Plataforma de estudos jurídicos.", Icon: GraduationCap, active: true },
];