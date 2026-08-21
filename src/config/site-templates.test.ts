import { describe, expect, it } from "vitest";
import { BUILT_IN_SITE_TEMPLATES } from "~/config/site-templates";
import { validateBlockLayout } from "~/lib/blocks";

describe("full-site templates", () => {
  it("ships distinct, valid site starters", () => {
    expect(BUILT_IN_SITE_TEMPLATES).toHaveLength(5);
    expect(new Set(BUILT_IN_SITE_TEMPLATES.map((item) => item.id)).size).toBe(
      5,
    );
    for (const template of BUILT_IN_SITE_TEMPLATES) {
      expect(template.snapshot.version).toBe(1);
      expect(template.snapshot.layouts.map((item) => item.page)).toEqual([
        "home",
        "about",
        "contact",
      ]);
      for (const layout of template.snapshot.layouts)
        expect(validateBlockLayout(layout.layout)).toEqual(layout.layout);
    }
  });
});
