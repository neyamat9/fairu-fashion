// "Samsung Galaxy A55 5G" -> "samsung-galaxy-a55-5g". Names written only in
// non-latin letters (e.g. Bangla) have no usable characters, so those fall
// back to the given default.
export function slugify(text: string, fallback = 'item'): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
  return slug || fallback;
}
