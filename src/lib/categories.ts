export type CategoryDef = {
  id: string;
  name: string;
  keywords?: string[];
};

const INVALID_CATEGORY_KEYS = new Set(["", "general", "uncategorized", "none", "null", "n/a"]);

export const CATEGORIES: CategoryDef[] = [
  { id: "electronics", name: "Electronics", keywords: ["electronics", "electronic", "gadget", "gadgets"] },
  { id: "phones", name: "Phones", keywords: ["phone", "phones", "smartphone", "iphone", "android"] },
  { id: "computers", name: "Computers", keywords: ["computer", "computers", "pc", "desktop"] },
  { id: "laptops", name: "Laptops", keywords: ["laptop", "laptops", "notebook", "macbook"] },
  { id: "kitchen", name: "Kitchen", keywords: ["kitchen", "cookware", "utensil", "utensils", "appliance", "appliances"] },
  { id: "home", name: "Home", keywords: ["home", "decor", "bedding", "household"] },
  { id: "fashion", name: "Fashion", keywords: ["fashion", "clothing", "apparel", "wear"] },
  { id: "shoes", name: "Shoes", keywords: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "heels", "sandals"] },
  { id: "bags", name: "Bags", keywords: ["bag", "bags", "backpack", "handbag", "purse"] },
  { id: "beauty", name: "Beauty", keywords: ["beauty", "cosmetic", "cosmetics", "makeup", "skincare"] },
  { id: "health", name: "Health", keywords: ["health", "wellness", "supplement", "supplements"] },
  { id: "sports", name: "Sports", keywords: ["sport", "sports", "fitness", "gym"] },
  { id: "toys", name: "Toys", keywords: ["toy", "toys", "kids", "children"] },
  { id: "books", name: "Books", keywords: ["book", "books", "stationery"] },
  { id: "gaming", name: "Gaming", keywords: ["game", "games", "gaming", "console", "playstation", "xbox"] },
  { id: "other", name: "Other" },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c] as const));
const CATEGORY_BY_NAME_KEY = new Map(CATEGORIES.map((c) => [c.name.toLowerCase(), c] as const));

export function slugifyCategory(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export function getCategoryById(id: string) {
  return CATEGORY_BY_ID.get(id);
}

export function getCategoryByName(name: string) {
  return CATEGORY_BY_NAME_KEY.get(name.toLowerCase().trim());
}

export function isRealCategoryName(name: string | null | undefined): boolean {
  if (!name) return false;
  return CATEGORY_BY_NAME_KEY.has(name.toLowerCase().trim());
}

export function normalizeCategoryName(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  const key = value.toLowerCase();
  if (INVALID_CATEGORY_KEYS.has(key)) return "Other";

  const byName = CATEGORY_BY_NAME_KEY.get(key);
  if (byName) return byName.name;

  const byId = CATEGORY_BY_ID.get(slugifyCategory(value));
  if (byId) return byId.name;

  for (const cat of CATEGORIES) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    if (cat.id === "other") continue;
    for (const kw of cat.keywords) {
      if (key.includes(kw)) return cat.name;
    }
  }

  return "Other";
}

export function getNavCategoriesWithCounts(
  products: Array<{ category?: string | null }>
): Array<{ id: string; name: string; count: number }> {
  const counts = new Map<string, number>();

  for (const p of products) {
    const name = normalizeCategoryName(p.category ?? "");
    const cat = getCategoryByName(name);
    if (!cat) continue;
    if (cat.id === "other") continue;
    counts.set(cat.id, (counts.get(cat.id) ?? 0) + 1);
  }

  const out: Array<{ id: string; name: string; count: number }> = [];
  for (const [id, count] of counts) {
    const def = getCategoryById(id);
    if (!def) continue;
    out.push({ id: def.id, name: def.name, count });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function getAllCategoryOptions(): string[] {
  return CATEGORIES.filter((c) => c.id !== "other")
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}
