export type ProductInfo = {
  name: string
  brand: string | null
  image: string | null
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    )
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const name =
      p.product_name_en ||
      p.product_name ||
      p.abbreviated_product_name ||
      null
    if (!name) return null
    return {
      name,
      brand: p.brands || null,
      image: p.image_front_small_url || p.image_url || null,
    }
  } catch {
    return null
  }
}
