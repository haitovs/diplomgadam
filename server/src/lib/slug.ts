/**
 * Turkmen and Russian letters that Unicode normalisation will not reduce to
 * ASCII on its own. Without these a name like "Şasoltan" would slug to
 * "asoltan" and two different restaurants could collide on an empty slug.
 */
const TRANSLITERATION: Record<string, string> = {
  ä: "a", ç: "c", ž: "zh", ň: "n", ö: "o", ş: "s", ü: "u", ý: "y",
  Ä: "a", Ç: "c", Ž: "zh", Ň: "n", Ö: "o", Ş: "s", Ü: "u", Ý: "y",
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

export function slugify(input: string): string {
  const transliterated = [...input]
    .map((ch) => TRANSLITERATION[ch] ?? TRANSLITERATION[ch.toLowerCase()] ?? ch)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Builds a slug that does not collide, appending -2, -3 and so on. `exists`
 * reports whether a candidate is already taken.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "store";
  if (!(await exists(root))) return root;

  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Practically unreachable; keeps the function total rather than looping.
  return `${root}-${Date.now().toString(36)}`;
}
