import slugifyLib from 'slugify';

const slugify = (text) => {
  if (!text) return '';

  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
  });
};

const uniqueSlug = async (text, model, existingId = null) => {
  let slug = slugify(text);
  let counter = 1;
  let uniqueSlug = slug;

  while (true) {
    const filter = { slug: uniqueSlug };
    if (existingId) {
      filter._id = { $ne: existingId };
    }

    const existing = await model.findOne(filter);
    if (!existing) break;

    const suffix = Math.random().toString(36).substring(2, 6);
    uniqueSlug = `${slug}-${suffix}`;
    counter++;
    if (counter > 10) break; // safety
  }

  return uniqueSlug;
};

export { slugify, uniqueSlug };