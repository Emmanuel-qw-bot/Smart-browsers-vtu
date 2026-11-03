import { z } from "zod";

export const REGISTRATION_SOURCES = [
  { value: "friends", label: "Friends" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "google_search", label: "Google Search" },
  { value: "other", label: "Other" },
] as const;

export type RegistrationSource = (typeof REGISTRATION_SOURCES)[number]["value"];

/** Accepts 080..., 234..., +234... and returns +234XXXXXXXXXX, or null if invalid. */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local: string;
  if (digits.startsWith("234")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;
  return /^[789][01]\d{8}$/.test(local) ? `+234${local}` : null;
}

export const INVITE_CODE_RE = /^SB-[A-Z0-9]{6}$/;

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z.string().trim().refine((v) => normalizeNigerianPhone(v) !== null, "Enter a valid Nigerian number, e.g. 08012345678"),
    password,
    confirmPassword: z.string(),
    source: z.enum(["friends", "whatsapp", "facebook", "instagram", "tiktok", "google_search", "other"], {
      errorMap: () => ({ message: "Tell us how you heard about us" }),
    }),
    sourceOther: z.string().trim().max(100).optional(),
    inviteCode: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => v === "" || INVITE_CODE_RE.test(v), "Codes look like SB-8KX92P")
      .optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export type FormErrors = {
  [K in "fullName" | "email" | "phone" | "password" | "confirmPassword" | "source" | "sourceOther" | "inviteCode" | "current"]?: string | undefined;
};

export function fieldErrors(err: z.ZodError): FormErrors {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0]);
    if (!out[k]) out[k] = i.message;
  }
  return out as FormErrors;
}
