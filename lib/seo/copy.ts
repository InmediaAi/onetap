/**
 * Hand-seeded editorial copy for the programmatic landing pages. Each entry gives
 * a GEO-style DIRECT ANSWER (first paragraph), a styling note, and question-style
 * FAQs — the unique, first-hand text that makes these pages rank and get cited by
 * AI answer engines (a product grid alone would be thin). Later enriched by the
 * Phase-3 content pipeline. Keyed by the exact vocab value.
 */

export interface SeoCopy {
  /** Direct answer to the page's implied query — rendered as the lead paragraph. */
  answer: string;
  /** A short styling / how-to-wear paragraph. */
  styling: string;
  faq: { q: string; a: string }[];
}

export const OCCASION_COPY: Record<string, SeoCopy> = {
  Everyday: {
    answer:
      "The best everyday looks are quietly luxurious: elevated basics in beautiful fabrics that work from morning to evening. On OneTap Atelier you can try everyday pieces from 100+ designer houses on yourself before you buy.",
    styling:
      "Build around a few considered staples — a clean knit, tailored trousers, a relaxed shirt — in a tight, neutral palette so everything mixes. Add one piece with texture or a subtle detail to keep it from reading plain.",
    faq: [
      { q: "What is everyday luxury style?", a: "Everyday luxury (or 'quiet luxury') is refined, low-logo dressing built on excellent fabrics and cut — knitwear, tailoring and easy separates you can wear on repeat." },
      { q: "How do I make everyday outfits look expensive?", a: "Stick to a neutral palette, prioritise fit and fabric over prints, and keep accessories minimal. A great knit and well-cut trouser read more luxurious than anything flashy." },
      { q: "Can I see everyday pieces on myself before buying?", a: "Yes — with OneTap Atelier's virtual try-on you can see any everyday piece on your own likeness before you decide." },
    ],
  },
  Work: {
    answer:
      "The best workwear is polished and comfortable: sharp tailoring, refined knitwear and clean separates you can move in. Try designer workwear from 100+ houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Anchor a work wardrobe with a blazer, straight trousers and a couple of fine-gauge knits. Keep colours disciplined — navy, charcoal, ivory, camel — and let tailoring do the talking.",
    faq: [
      { q: "What should I wear to a modern office?", a: "Elevated separates: a well-cut blazer, tailored trousers or a midi skirt, and a fine knit or crisp shirt. Comfortable, quiet and easy to mix across the week." },
      { q: "How many pieces make a capsule work wardrobe?", a: "Around 10–12 interchangeable pieces in a shared palette — two blazers, a few trousers/skirts, several knits and shirts — cover most professional weeks." },
      { q: "Is smart-casual the same as workwear?", a: "Smart-casual is a relaxed cousin — the same tailoring, softened with knitwear, denim or a loafer instead of a formal shoe." },
    ],
  },
  Weekend: {
    answer:
      "The best weekend outfits are relaxed but considered: easy denim, soft knits and unstructured tailoring. See weekend pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Lean into comfort with intention — a great pair of jeans, an oversized shirt or knit, and a relaxed coat. One elevated element (a fine leather or a luxe fabric) keeps it from looking off-duty in the wrong way.",
    faq: [
      { q: "What is off-duty style?", a: "Off-duty dressing is relaxed luxury — denim, knits and easy layers in beautiful materials, styled to look effortless rather than sloppy." },
      { q: "How do I dress up jeans for the weekend?", a: "Pair them with a refined knit or blazer and a clean shoe; let the denim be the casual note and keep everything else considered." },
    ],
  },
  "Date Night": {
    answer:
      "The best date-night looks feel like you, elevated: a slip dress, sharp tailoring, or a top-and-trouser pairing with one striking detail. Try date-night pieces from 100+ houses on yourself before you buy.",
    styling:
      "Pick one focal point — a neckline, a fabric with movement, or a bold colour — and keep the rest quiet. Comfort matters; choose something you can sit, walk and talk in with ease.",
    faq: [
      { q: "What should I wear on a date night?", a: "Something that flatters and feels like you — a slip or midi dress, or elevated separates — with a single standout element rather than everything competing for attention." },
      { q: "Is a dress or separates better for a date?", a: "Both work. A dress is the fast, foolproof option; separates give more range and are easy to dress up or down for the venue." },
      { q: "Can I preview a date-night outfit on myself?", a: "Yes — OneTap Atelier's try-on shows the piece on your own likeness so you can judge the fit and mood before buying." },
    ],
  },
  Cocktail: {
    answer:
      "Cocktail attire means a polished, knee-to-midi length look: a cocktail dress, an elevated jumpsuit, or refined separates. See cocktail pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Aim for a dress or jumpsuit that's dressy but not floor-length. Rich fabrics — satin, crepe, fine wool — and a considered heel do most of the work; keep jewellery deliberate.",
    faq: [
      { q: "What does cocktail attire mean?", a: "Cocktail is semi-formal: a knee-to-midi dress, a smart jumpsuit or elevated separates — dressier than everyday, less formal than black tie." },
      { q: "What length is a cocktail dress?", a: "Typically knee-length to midi. Floor-length reads more formal (gala/black tie); mini can work for evening but is less traditional." },
      { q: "What colours work for cocktail dressing?", a: "Black is the classic, but deep jewel tones, ivory and metallics all read elegant. Match the tone to the season and venue." },
    ],
  },
  "Party Wear": {
    answer:
      "The best party outfits balance impact and ease: a statement dress, a sequinned piece, or sharp separates with shine. Try party pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Choose one hero — texture, sparkle or a bold silhouette — and let it lead. Movement matters on a party outfit, so prioritise fabrics and cuts you can actually dance in.",
    faq: [
      { q: "What should I wear to a party?", a: "A piece with a bit of drama — sequins, satin, a bold colour or striking cut — that still lets you move. One statement element beats several." },
      { q: "How do I style a sequin dress?", a: "Keep everything else minimal — a clean shoe, restrained jewellery — so the sequins are the whole story." },
    ],
  },
  "Wedding Guest": {
    answer:
      "The best wedding-guest looks are polished but never attention-stealing: a midi or gown in a refined colour, elevated tailoring, or a considered co-ord — and never white. See wedding-guest pieces from 100+ houses on yourself before you buy.",
    styling:
      "Read the dress code and venue, then pick a length to match — midi for daytime, gown for black-tie evenings. Avoid white, ivory and anything that competes with the couple; a refined colour and great fit always land.",
    faq: [
      { q: "What do you wear as a wedding guest?", a: "A polished dress or elevated separates appropriate to the dress code — midi for daytime, longer for formal evenings — in a colour that isn't white or ivory." },
      { q: "Can wedding guests wear black?", a: "Yes, black is widely accepted for modern and evening weddings. For daytime or garden weddings, a colour often feels more in keeping." },
      { q: "What should you avoid as a wedding guest?", a: "Avoid white, ivory and cream (reserved for the couple), overly revealing cuts, and anything louder than the wedding party." },
    ],
  },
  "Gala Dinner": {
    answer:
      "Gala dinner attire is formal and elegant: typically a floor-length gown or a refined evening ensemble. Try gala pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Go long and considered — a column or A-line gown in a luxe fabric, with jewellery chosen to complement the neckline. Tailoring counts most at this level; the right fit reads far more expensive than embellishment.",
    faq: [
      { q: "What is gala dinner attire?", a: "Formal evening wear — usually a floor-length gown or an elevated evening ensemble, in rich fabrics with refined finishing." },
      { q: "Is a gala the same as black tie?", a: "They overlap. A gala is often black tie or 'creative black tie', so a floor-length gown or a very polished evening look is the safe choice." },
    ],
  },
  "Black Tie": {
    answer:
      "Black-tie attire calls for a floor-length gown or a formal evening ensemble in refined fabrics. See black-tie pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Choose a full-length gown or an impeccable tailored alternative (a tuxedo-style set reads modern and chic). Keep the palette deep and the jewellery intentional; let the cut and fabric carry the formality.",
    faq: [
      { q: "What does black tie mean for women?", a: "A floor-length gown or a very formal evening ensemble — for example a tuxedo-style set or a full-length skirt with an elegant top — in luxe fabrics." },
      { q: "Can you wear a midi to a black-tie event?", a: "Traditionally black tie is floor-length. A sophisticated midi can pass for 'black-tie optional', but a gown is the safest choice for a strict dress code." },
      { q: "What colours are appropriate for black tie?", a: "Classic black leads, with deep jewel tones, navy, ivory and metallics all appropriate. The formality comes from length, fabric and fit." },
    ],
  },
  Vacation: {
    answer:
      "The best vacation outfits are light, easy and photogenic: breezy dresses, linen separates and relaxed co-ords. Try vacation pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Pack a palette that mixes so a few pieces make many outfits. Natural fabrics — linen, cotton, silk — travel and photograph beautifully; add one dress-up piece for evenings.",
    faq: [
      { q: "What should I pack for a luxury vacation?", a: "A small, mix-and-match capsule: two or three dresses, linen separates, a swim cover-up and one evening piece — all in a shared palette." },
      { q: "What fabrics are best for holiday dressing?", a: "Linen, cotton and silk breathe in heat, pack well and photograph beautifully. They're the backbone of a good vacation wardrobe." },
    ],
  },
  Resort: {
    answer:
      "Resort wear is elevated holiday dressing: fluid dresses, tailored linen and refined swim-adjacent pieces. See resort pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Think poolside-to-dinner: pieces that layer over swimwear yet look intentional at a restaurant. Fluid silhouettes and a warm, sun-washed palette define the mood.",
    faq: [
      { q: "What is resort wear?", a: "Resort (or 'cruise') wear is polished vacation dressing designed for warm-weather escapes — fluid dresses, linen tailoring and elevated cover-ups." },
      { q: "How is resort wear different from beachwear?", a: "Beachwear is swim-focused; resort wear is the elevated layer around it — pieces that carry you from the pool to dinner." },
    ],
  },
  "Fashion Week": {
    answer:
      "Fashion-week dressing is directional and confident: statement tailoring, sculptural silhouettes and considered risk. Try runway-ready pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Pick one strong idea per look — a silhouette, a texture, a colour — and commit. Comfort still matters across long show days, so choose pieces that photograph boldly but wear easily.",
    faq: [
      { q: "What do you wear to fashion week?", a: "Directional, confident looks — statement tailoring or a sculptural silhouette — that photograph well and express a clear point of view." },
      { q: "How do I dress for a fashion show as a guest?", a: "Choose one bold, well-fitting piece and keep the rest quiet. Practical footwear matters given the long days and standing." },
    ],
  },
  "Special Occasion": {
    answer:
      "The best special-occasion looks are memorable and flattering: a standout dress or an elevated ensemble suited to the moment. See occasion pieces from 100+ designer houses on yourself before you buy.",
    styling:
      "Match the formality to the event, then choose one piece you feel unmistakably yourself in. Fit first, then fabric, then detail — in that order — for a look that lasts beyond the day.",
    faq: [
      { q: "What should I wear to a special occasion?", a: "Something appropriate to the event's formality that flatters and feels like you — a standout dress or an elevated ensemble, with one considered focal point." },
      { q: "How do I choose an outfit for an important event?", a: "Confirm the dress code, prioritise fit, and pick a piece you're comfortable in for the whole event. Previewing it on yourself first removes the guesswork." },
    ],
  },
};

export const CATEGORY_COPY: Record<string, SeoCopy> = {
  Dresses: {
    answer:
      "Designer dresses span everyday midis to evening gowns — the fastest way to a complete look. Try dresses from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Let the occasion set the length: midi for day, gown for formal evenings. Choose a silhouette that flatters your frame first, then colour and detail.",
    faq: [
      { q: "How do I choose the right dress silhouette?", a: "Pick the shape that flatters your proportions — A-line, column, wrap or slip — then decide on length by occasion. Trying it on your own likeness first removes the guesswork." },
      { q: "What dress length is most versatile?", a: "The midi: dressy enough for events, easy enough for day, and flattering on most frames." },
    ],
  },
  "Tops & Blouses": {
    answer:
      "Designer tops and blouses are the workhorses of a wardrobe — the piece that changes an outfit fastest. Try tops and blouses from 100+ houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Build a few silhouettes — a clean shell, a fluid blouse, a statement sleeve — in a shared palette so they layer under tailoring and over denim alike.",
    faq: [
      { q: "What tops go with everything?", a: "Clean shells and fine knits in neutral tones layer under blazers and over trousers or denim, making them the most versatile tops to own." },
      { q: "How do I dress up a simple top?", a: "Tuck it into tailored trousers or a midi skirt and add a blazer; let the top be the quiet base and the tailoring do the elevating." },
    ],
  },
  Shirts: {
    answer:
      "The designer shirt is a year-round staple — crisp for work, relaxed for weekends. See shirts from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Own a couple of fits — a sharp poplin and an oversized relaxed shirt. Both bridge tailoring and denim, so a small number covers a lot of outfits.",
    faq: [
      { q: "How should a shirt fit?", a: "Shoulders should sit at your natural line; the body can be tailored or relaxed by preference. Try it on your likeness first to judge the drape." },
      { q: "Can a shirt be worn formally?", a: "Yes — a crisp poplin under a blazer with tailored trousers reads polished and professional." },
    ],
  },
  Knitwear: {
    answer:
      "Luxury knitwear is the heart of quiet-luxury dressing — fine-gauge sweaters, cardigans and knit dresses in beautiful yarns. Try knitwear from 100+ houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Invest in a few fine-gauge knits in neutral tones; they layer under tailoring and over shirts, and read expensive on their own. Fabric quality is everything here.",
    faq: [
      { q: "What makes knitwear look expensive?", a: "Yarn and gauge — fine merino, cashmere or wool blends in clean colours look far more luxurious than bulky, synthetic knits." },
      { q: "How do I care for luxury knitwear?", a: "Hand-wash or use a wool cycle, dry flat, and store folded (not hung) to keep the shape." },
    ],
  },
  Tailoring: {
    answer:
      "Designer tailoring — blazers, trousers and suiting — is the backbone of a considered wardrobe. See tailoring from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Start with a versatile blazer and straight trouser in a neutral, then build. Fit is the whole game: well-cut tailoring elevates everything it's worn with.",
    faq: [
      { q: "What tailoring should every wardrobe have?", a: "A versatile blazer, a straight or wide-leg trouser, and one matching suit — all in a neutral you'll reach for repeatedly." },
      { q: "How should a blazer fit?", a: "Shoulders flush to your frame, room to move through the back, and a length that hits around mid-hip. The shoulder is the hardest thing to alter, so prioritise it." },
    ],
  },
  Blazers: {
    answer:
      "A designer blazer is the single most versatile piece you can own — it sharpens denim, tailoring and dresses alike. Try blazers from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Choose a neutral, well-cut blazer first, then experiment with an oversized or double-breasted shape. Layer over almost anything to instantly elevate a look.",
    faq: [
      { q: "What colour blazer is most versatile?", a: "Navy, black and camel are the most wearable — they pair with nearly everything and carry from work to evening." },
      { q: "Can you wear a blazer casually?", a: "Absolutely — over a tee and denim it's the fastest way to make a relaxed outfit look intentional." },
    ],
  },
  Trousers: {
    answer:
      "Designer trousers — from tailored straight-legs to fluid wide-legs — anchor everyday and workwear alike. See trousers from 100+ houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Get the rise and length right for your frame, then build around two shapes: a tailored straight and an easy wide-leg. Both dress up with a heel or down with a flat.",
    faq: [
      { q: "What trouser shape is most flattering?", a: "A straight or wide-leg with a rise that suits your proportions elongates the line. Trying the fit on your likeness first helps you judge it." },
      { q: "How do I dress up trousers?", a: "Pair tailored trousers with a fine knit or blouse and a heel; a matching blazer turns them into a suit." },
    ],
  },
  Denim: {
    answer:
      "Luxury denim is the everyday luxury workhorse — the right jean underpins countless outfits. Try designer denim from 100+ houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Find a wash and cut you love, then dress it up with a blazer and refined knit or down with a relaxed shirt. Fit matters more than any trend here.",
    faq: [
      { q: "What jean fit is most versatile?", a: "A straight or slightly relaxed leg in a mid-to-dark wash works across the most outfits and dresses up easily." },
      { q: "How do I make denim look luxurious?", a: "Pair it with refined pieces — a blazer, fine knit or good shoe — and keep the wash clean and considered." },
    ],
  },
  Skirts: {
    answer:
      "Designer skirts — from tailored midis to fluid maxis — offer polish with ease. See skirts from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "A midi skirt pairs with knits for day and with a fine top for evening. Choose the length and shape that flatter, then let a tucked-in top define the waist.",
    faq: [
      { q: "How do I style a midi skirt?", a: "Tuck in a knit or blouse to define the waist, then choose a shoe by occasion — a boot for day, a heel for evening." },
      { q: "What top goes with a maxi skirt?", a: "A fitted knit or tucked top balances the volume; keep the proportions considered so the look stays polished." },
    ],
  },
  Shorts: {
    answer:
      "Designer shorts — tailored, linen or denim — carry warm-weather dressing from city to resort. Try shorts from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Tailored shorts with a blazer read smart; linen shorts with a relaxed shirt read holiday. Length and fit set the tone, so choose deliberately.",
    faq: [
      { q: "How do I wear shorts elegantly?", a: "Choose a tailored or longer-line short and pair it with a refined top or blazer; keep the fabrics luxe and the fit clean." },
      { q: "Are tailored shorts office-appropriate?", a: "In relaxed dress codes, tailored shorts with a blazer and a considered shoe can work for warm months." },
    ],
  },
  Jumpsuits: {
    answer:
      "A designer jumpsuit is a one-and-done outfit — polished, modern and effortless. See jumpsuits from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Pick a silhouette that defines the waist and a length that suits your frame. A tailored jumpsuit dresses up for evening; a relaxed one reads chic by day.",
    faq: [
      { q: "Are jumpsuits formal enough for events?", a: "Yes — a tailored jumpsuit in a luxe fabric is an elegant alternative to a cocktail dress or even black tie." },
      { q: "How should a jumpsuit fit?", a: "The rise and torso length are key — try it on your likeness first to check the proportion sits right before buying." },
    ],
  },
  Outerwear: {
    answer:
      "Designer outerwear — coats, trenches and jackets — is the piece seen most, so it's worth investing in. Try outerwear from 100+ luxury houses on yourself before you buy on OneTap Atelier.",
    styling:
      "A great coat elevates everything beneath it. Start with a neutral, versatile silhouette — a tailored wool coat or a trench — then add character pieces.",
    faq: [
      { q: "What coat should I invest in first?", a: "A tailored wool coat or a classic trench in a neutral — both are timeless, versatile and worn over nearly everything." },
      { q: "How should a coat fit?", a: "With room to layer a knit or blazer underneath, shoulders sitting cleanly, and a length that suits your height. Preview it on your likeness to judge the proportion." },
    ],
  },
  "Co-Ord Sets": {
    answer:
      "A designer co-ord set is a coordinated top-and-bottom that looks put-together instantly — and splits into separates you can restyle. Try co-ord sets from 100+ houses on yourself before you buy on OneTap Atelier.",
    styling:
      "Wear the set together for an effortless full look, then break it up — the knit with denim, the trouser with a shirt — to double its wardrobe value.",
    faq: [
      { q: "What is a co-ord set?", a: "A co-ord (or matching set) is a top and bottom cut from the same fabric to wear together as one look — or split into separates." },
      { q: "Are co-ord sets versatile?", a: "Very — worn together they're a complete outfit; worn apart, each piece restyles with the rest of your wardrobe." },
    ],
  },
};

/** Fallback so any value without seeded copy still renders non-thin, useful text. */
export function fallbackCopy(label: string, kind: "occasion" | "category"): SeoCopy {
  const lead =
    kind === "occasion"
      ? `The best ${label.toLowerCase()} looks balance polish and ease. Try ${label.toLowerCase()} pieces from 100+ designer houses on yourself before you buy on OneTap Atelier.`
      : `Designer ${label.toLowerCase()} from 100+ luxury houses — see each piece on yourself before you buy on OneTap Atelier.`;
  return {
    answer: lead,
    styling:
      "Choose pieces that flatter your frame first, then build a tight palette so everything mixes. Previewing each on your own likeness removes the guesswork before you commit.",
    faq: [
      {
        q: `Can I see ${label.toLowerCase()} pieces on myself before buying?`,
        a: "Yes — OneTap Atelier's virtual try-on shows any piece on your own likeness, so you can judge fit and mood before you buy.",
      },
    ],
  };
}

export const occasionCopy = (o: string): SeoCopy => OCCASION_COPY[o] ?? fallbackCopy(o, "occasion");
export const categoryCopy = (c: string): SeoCopy => CATEGORY_COPY[c] ?? fallbackCopy(c, "category");
