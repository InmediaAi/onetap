import Image from "next/image";

const IMG_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

/** Only allow-listed hosts can be optimized by next/image; else a plain <img>. */
function optimizable(url?: string | null): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") || h.endsWith("unsplash.com");
  } catch {
    return false;
  }
}

/** Editorial tile image — next/image when the host allows, else a lazy <img>. */
export default function EditImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  if (optimizable(src)) {
    return <Image className={className} src={src} alt={alt} fill sizes={IMG_SIZES} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={alt} loading="lazy" />;
}
