import { z } from "zod";

export const kundeSchema = z.object({
  name: z.string().min(1, "Name ist ein Pflichtfeld"),
  adresse: z.string().optional().default(""),
  email: z
    .string()
    .email("Bitte geben Sie eine gültige E-Mail-Adresse ein")
    .optional()
    .or(z.literal("")),
  telefon: z.string().optional().default(""),
  notizen: z.string().optional().default(""),
});

export type KundeFormData = z.infer<typeof kundeSchema>;
