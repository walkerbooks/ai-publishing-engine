export type ArtStyleCategory =
  | "classic"
  | "fun"
  | "soft"
  | "magical"
  | "cultural";

export type ArtStyle = {
  id: string;
  name: string;
  category: ArtStyleCategory;
  src: string;
  popular?: boolean;
};

export const ART_STYLE_CATEGORIES: { id: "all" | ArtStyleCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "classic", label: "Classic" },
  { id: "fun", label: "Fun" },
  { id: "soft", label: "Soft" },
  { id: "magical", label: "Magical" },
  { id: "cultural", label: "Cultural" },
];

/** Sample cover / illustration directions shown on the landing gallery. */
export const ART_STYLES: ArtStyle[] = [
  // Soft
  {
    id: "watercolor",
    name: "Soft Watercolor",
    category: "soft",
    src: "/art-styles/art-style-watercolor.png",
    popular: true,
  },
  {
    id: "papercut",
    name: "Paper Cut",
    category: "soft",
    src: "/art-styles/art-style-papercut.png",
  },
  {
    id: "pastel",
    name: "Pastel Dawn",
    category: "soft",
    src: "/art-styles/art-style-pastel.png",
  },
  {
    id: "soft-gouache",
    name: "Quiet Gouache",
    category: "soft",
    src: "/art-styles/art-style-soft-gouache.png",
  },
  {
    id: "soft-sketch",
    name: "Soft Sketch",
    category: "soft",
    src: "/art-styles/art-style-soft-sketch.png",
  },
  // Classic
  {
    id: "classic-oil",
    name: "Classic Oil",
    category: "classic",
    src: "/art-styles/art-style-classic-oil.png",
  },
  {
    id: "vintage",
    name: "Vintage Storybook",
    category: "classic",
    src: "/art-styles/art-style-vintage.png",
  },
  {
    id: "ink",
    name: "Ink Wash",
    category: "classic",
    src: "/art-styles/art-style-ink.png",
  },
  {
    id: "classic-etching",
    name: "Antique Etching",
    category: "classic",
    src: "/art-styles/art-style-classic-etching.png",
  },
  {
    id: "classic-library",
    name: "Library Oil",
    category: "classic",
    src: "/art-styles/art-style-classic-library.png",
  },
  // Fun
  {
    id: "bold-graphic",
    name: "Bold Graphic",
    category: "fun",
    src: "/art-styles/art-style-bold-graphic.png",
  },
  {
    id: "fun-cartoon",
    name: "Sunny Trek",
    category: "fun",
    src: "/art-styles/art-style-fun-cartoon.png",
    popular: true,
  },
  {
    id: "comic",
    name: "Comic Energy",
    category: "fun",
    src: "/art-styles/art-style-comic.png",
  },
  {
    id: "fun-stickers",
    name: "Sticker Trail",
    category: "fun",
    src: "/art-styles/art-style-fun-stickers.png",
  },
  {
    id: "fun-pixel",
    name: "Pixel Trek",
    category: "fun",
    src: "/art-styles/art-style-fun-pixel.png",
  },
  // Magical
  {
    id: "magical",
    name: "Enchanted Path",
    category: "magical",
    src: "/art-styles/art-style-magical.png",
    popular: true,
  },
  {
    id: "cinematic",
    name: "Cinematic Summit",
    category: "magical",
    src: "/art-styles/art-style-cinematic.png",
  },
  {
    id: "magical-aurora",
    name: "Aurora Trail",
    category: "magical",
    src: "/art-styles/art-style-magical-aurora.png",
  },
  {
    id: "magical-crystal",
    name: "Crystal Cave",
    category: "magical",
    src: "/art-styles/art-style-magical-crystal.png",
  },
  {
    id: "magical-moonlit",
    name: "Moonlit Forest",
    category: "magical",
    src: "/art-styles/art-style-magical-moonlit.png",
  },
  // Cultural
  {
    id: "folk",
    name: "Folk Trail",
    category: "cultural",
    src: "/art-styles/art-style-folk.png",
  },
  {
    id: "cultural-ukiyo",
    name: "Ukiyo Trail",
    category: "cultural",
    src: "/art-styles/art-style-cultural-ukiyo.png",
  },
  {
    id: "cultural-kente",
    name: "Heritage Path",
    category: "cultural",
    src: "/art-styles/art-style-cultural-kente.png",
  },
  {
    id: "cultural-miniature",
    name: "Miniature March",
    category: "cultural",
    src: "/art-styles/art-style-cultural-miniature.png",
  },
  {
    id: "cultural-mural",
    name: "Mural Journey",
    category: "cultural",
    src: "/art-styles/art-style-cultural-mural.png",
  },
  {
    id: "cultural-nordic",
    name: "Nordic Folk",
    category: "cultural",
    src: "/art-styles/art-style-cultural-nordic.png",
  },
];
