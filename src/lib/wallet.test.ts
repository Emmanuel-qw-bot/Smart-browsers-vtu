import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo } from "./wallet";

describe("wallet amounts", () => {
  it("formats ₦100 welcome bonus from kobo", () => expect(formatNaira(10000)).toBe("₦100.00"));
  it("converts admin naira input to kobo", () => expect(nairaToKobo("100")).toBe(10000));
  it("rejects zero, negative and malformed amounts", () => {
    expect(nairaToKobo("0")).toBeNull();
    expect(nairaToKobo("-5")).toBeNull();
    expect(nairaToKobo("1.234")).toBeNull();
  });
});
