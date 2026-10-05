export function normalizeCatalogProducts(products, fallbackCatalog = null) {
  const productsList = Array.isArray(products) ? products : [];

  if (productsList.length > 0) {
    return productsList;
  }

  const fallbackProducts = Array.isArray(fallbackCatalog?.productTypes)
    ? fallbackCatalog.productTypes
    : Array.isArray(fallbackCatalog?.products)
      ? fallbackCatalog.products
      : [];

  return fallbackProducts.map((product) => ({
    ...product,
    description: product.description ?? null,
    example_url: product.example_url ?? null,
    fit_options:
      typeof product.fit_options === 'string'
        ? product.fit_options
        : JSON.stringify(product.fit_options ?? ['unisex']),
    active: product.active ?? 1,
    sort_order: product.sort_order ?? 999,
  }));
}

export function normalizeCatalogDesigns(designs, fallbackCatalog = null) {
  const designsList = Array.isArray(designs) ? designs : [];

  if (designsList.length > 0) {
    return designsList;
  }

  const fallbackDesigns = Array.isArray(fallbackCatalog?.designs)
    ? fallbackCatalog.designs
    : [];

  return fallbackDesigns.map((design) => ({
    ...design,
    description: design.description ?? null,
    image_url: design.image_url ?? null,
    designed_for: design.designed_for ?? null,
    active: design.active ?? 1,
    sort_order: design.sort_order ?? 999,
  }));
}
