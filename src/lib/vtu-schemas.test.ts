import { describe, expect, it } from "vitest";
import { hasAccessToken, productSchema, unverifiedPurchaseOutcome } from "./vtu-schemas";

const mapping = {
  provider_id: "123e4567-e89b-42d3-a456-426614174000", service: "data",
  network_name: "Configured network", network_id: 7, plan_name: "Configured plan",
  data_plan_id: 42, plan_type: "SME", validity: "30 days", cost_kobo: null,
  selling_price_kobo: 10000, min_amount_kobo: null, max_amount_kobo: null,
  markup_percent: 0, active: false,
};
describe("VTU provider safety", () => {
  it("requires saved data plan IDs rather than defaults", () => {
    expect(productSchema.safeParse({ ...mapping, data_plan_id: null }).success).toBe(false);
    expect(productSchema.parse(mapping).data_plan_id).toBe(42);
  });
  it("rejects inverted airtime limits", () => {
    expect(productSchema.safeParse({ ...mapping, service: "airtime", data_plan_id: null, min_amount_kobo: 20000, max_amount_kobo: 10000 }).success).toBe(false);
  });
  it("never treats HTTP 200 alone as purchase success", () => {
    expect(unverifiedPurchaseOutcome({ httpStatus: 200 })).toBe("pending_review");
  });
  it("never settles a wallet from an unsigned callback", () => {
    expect(unverifiedPurchaseOutcome({ "request-id": "Data_example", status: "success" })).toBe("pending_review");
  });
  it("requires a real account access token", () => {
    expect(hasAccessToken({ AccessToken: "" })).toBe(false);
    expect(hasAccessToken({ status: 200 })).toBe(false);
    expect(hasAccessToken({ AccessToken: "test-only" })).toBe(true);
  });
});