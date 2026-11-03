import { describe, expect, it } from "vitest";
import { normalizeNigerianPhone, signupSchema } from "./auth-schemas";

const base = {
  fullName: "Ada Okafor", email: "ada@example.com", phone: "08031234567",
  password: "secret123", confirmPassword: "secret123", source: "whatsapp" as const,
};

describe("signup rules", () => {
  it("normalises Nigerian numbers to +234", () => {
    expect(normalizeNigerianPhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("+2348031234567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("12345")).toBeNull();
  });
  it("rejects mismatched passwords", () => {
    expect(signupSchema.safeParse({ ...base, confirmPassword: "other123" }).success).toBe(false);
  });
  it("accepts invite codes only in SB-XXXXXX format", () => {
    expect(signupSchema.safeParse({ ...base, inviteCode: "sb-8kx92p" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, inviteCode: "SB-12" }).success).toBe(false);
  });
});
