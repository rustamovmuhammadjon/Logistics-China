import { describe, expect, it } from "vitest";
import { commentText, dangerousGoodsField } from "./input.js";

describe("commentText", () => {
  it("accepts up to 100 characters, trimmed", () => {
    expect(commentText("  On the way to Bukhara  ")).toBe("On the way to Bukhara");
    expect(commentText("x".repeat(100))).toHaveLength(100);
  });

  it("rejects longer or empty comments", () => {
    expect(() => commentText("x".repeat(101))).toThrow(/at most 100 characters/);
    expect(() => commentText("   ")).toThrow(/required/);
  });
});

describe("dangerousGoodsField", () => {
  it("reads the form value when it was sent", () => {
    expect(dangerousGoodsField({ dangerousGoods: "true" })).toBe(true);
    expect(dangerousGoodsField({ dangerousGoods: "false" })).toBe(false);
  });

  it("leaves the stored value alone when it wasn't sent", () => {
    expect(dangerousGoodsField({ name: "Order 7" })).toBeUndefined();
  });
});
