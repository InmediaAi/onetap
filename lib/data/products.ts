export interface Product {
  id: string;
  brand: string;
  name: string;
  price: string;
  imageUrl: string;
}

/**
 * Mock luxury catalog. Editorial, monochromatic imagery chosen to read as
 * quiet-luxury runway product shots. Swap for Supabase `products` later.
 */
export const products: Product[] = [
  {
    id: "the-row-coat",
    brand: "The Row",
    name: "Oversized Wool Coat",
    price: "$4,290",
    imageUrl:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "celine-blazer",
    brand: "Celine",
    name: "Tailored Crepe Blazer",
    price: "$2,850",
    imageUrl:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "khaite-knit",
    brand: "Khaite",
    name: "Cashmere Ribbed Knit",
    price: "$1,180",
    imageUrl:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "bottega-trouser",
    brand: "Bottega Veneta",
    name: "Pleated Wide Trouser",
    price: "$1,650",
    imageUrl:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "toteme-shirt",
    brand: "Totême",
    name: "Silk Column Shirt",
    price: "$690",
    imageUrl:
      "https://images.unsplash.com/photo-1485231183945-fffde7cc051e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "saint-laurent-dress",
    brand: "Saint Laurent",
    name: "Draped Jersey Dress",
    price: "$3,490",
    imageUrl:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "the-row-trench",
    brand: "The Row",
    name: "Belted Cotton Trench",
    price: "$3,950",
    imageUrl:
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "celine-skirt",
    brand: "Celine",
    name: "Wool Midi Skirt",
    price: "$1,250",
    imageUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
  },
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}
