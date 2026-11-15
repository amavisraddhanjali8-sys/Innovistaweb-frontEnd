import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
} from "../../../shared/productCatalogHelpers";
import { DEFAULT_HOME_SERVICES_CMS } from "../../../shared/homeServicesHelpers";
import { buildSearchSubmitRoute, searchHomeCatalog } from "./homeSearchHelpers";

describe("homeSearchHelpers", () => {
  it("matches products and categories by name or architectural solution keyword", () => {
    const res = searchHomeCatalog({
      query: "sliding door",
      designs: DEFAULT_DESIGNS_CATALOG,
      categories: DEFAULT_PRODUCT_CATEGORIES,
      services: DEFAULT_HOME_SERVICES_CMS.items,
    });

    assert.ok(res.products.length > 0);
    assert.ok(
      res.products.some((p) =>
        p.title.toLowerCase().includes("sliding door")
      )
    );
    assert.equal(res.products[0].to, `/products/${res.products[0].id.replace("prod-", "")}`);
  });

  it("filters products accurately when a category slug is selected", () => {
    const res = searchHomeCatalog({
      query: "casement",
      categorySlug: "windows",
      designs: DEFAULT_DESIGNS_CATALOG,
      categories: DEFAULT_PRODUCT_CATEGORIES,
    });

    assert.ok(res.products.length >= 1);
    assert.ok(
      res.products.every((p) =>
        p.meta.toLowerCase().includes("window")
      )
    );
  });

  it("surfaces matching architectural solutions from What We Build services", () => {
    const res = searchHomeCatalog({
      query: "roofing",
      designs: DEFAULT_DESIGNS_CATALOG,
      categories: DEFAULT_PRODUCT_CATEGORIES,
      services: DEFAULT_HOME_SERVICES_CMS.items,
    });

    assert.ok(res.categories.some((c) => c.title.toLowerCase().includes("roof")));
    assert.ok(res.solutions.some((s) => s.title.toLowerCase().includes("roofing")));
    const roofingSolution = res.solutions.find((s) =>
      s.title.toLowerCase().includes("roofing")
    );
    assert.ok(roofingSolution?.subtitle && roofingSolution.subtitle.length > 10);
  });

  it("includes architectural solutions on empty query and scopes solutions by selected category", () => {
    const emptyRes = searchHomeCatalog({
      query: "",
      categorySlug: "all",
      designs: DEFAULT_DESIGNS_CATALOG,
      categories: DEFAULT_PRODUCT_CATEGORIES,
      services: DEFAULT_HOME_SERVICES_CMS.items,
      maxCategories: 4,
      maxProducts: 4,
      maxSolutions: 2,
    });
    assert.equal(emptyRes.solutions.length, 2);

    const scopedRes = searchHomeCatalog({
      query: "",
      categorySlug: "roof-skylights",
      designs: DEFAULT_DESIGNS_CATALOG,
      categories: DEFAULT_PRODUCT_CATEGORIES,
      services: DEFAULT_HOME_SERVICES_CMS.items,
      maxSolutions: 4,
    });
    assert.ok(
      scopedRes.solutions.some((s) => s.title.toLowerCase().includes("roofing"))
    );
    assert.ok(
      !scopedRes.solutions.some((s) => s.title.toLowerCase().includes("doors"))
    );
  });

  it("builds clean search submit routes for global queries and scoped categories", () => {
    assert.equal(buildSearchSubmitRoute("louvers", "all"), "/products?q=louvers");
    assert.equal(
      buildSearchSubmitRoute("thermal", "windows"),
      "/products/category/windows?q=thermal"
    );
    assert.equal(
      buildSearchSubmitRoute("", "doors"),
      "/products/category/doors"
    );
    assert.equal(buildSearchSubmitRoute("   ", "all"), "/products");
  });
});
