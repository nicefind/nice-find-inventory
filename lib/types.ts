export type Category =
  | "Diecast"
  | "80s/90s Toys"
  | "80s/90s Books"
  | "Pokémon Cards"
  | "Tazos/Pogs"
  | "Other Vintage";

export const CATEGORIES: Category[] = [
  "Diecast",
  "80s/90s Toys",
  "80s/90s Books",
  "Pokémon Cards",
  "Tazos/Pogs",
  "Other Vintage",
];

export type ItemStatus =
  | "To photograph"
  | "To list"
  | "Listed"
  | "Sold"
  | "Watching";

export const ITEM_STATUSES: ItemStatus[] = [
  "To photograph",
  "To list",
  "Listed",
  "Sold",
  "Watching",
];

export type PlatformName = "eBay" | "Marketplace" | "Depop";

export const PLATFORM_NAMES: PlatformName[] = [
  "eBay",
  "Marketplace",
  "Depop",
];

export type PlatformStatus = "Draft" | "Listed" | "Sold" | "Expired";

export const PLATFORM_STATUSES: PlatformStatus[] = [
  "Draft",
  "Listed",
  "Sold",
  "Expired",
];

export interface PlatformInfo {
  status: PlatformStatus;
  listedDate: string;
  url: string;
}

export type Platforms = Record<PlatformName, PlatformInfo>;

export function emptyPlatforms(): Platforms {
  return {
    eBay: { status: "Draft", listedDate: "", url: "" },
    Marketplace: { status: "Draft", listedDate: "", url: "" },
    Depop: { status: "Draft", listedDate: "", url: "" },
  };
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: Category;
  eraBrand: string;
  condition: string;
  completeness: string;
  cost: number;
  askingPrice: number;
  soldPrice: number;
  postage: number;
  fees: number;
  source: string;
  dateBought: string;
  pickupLocation: string;
  status: ItemStatus;
  createdAt: string;
  soldDate: string;
  priceNotes: string;
  platforms: Platforms;
  photos: string[];
  isSample: boolean;
}

export function newItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyItem(): Item {
  return {
    id: newItemId(),
    title: "",
    description: "",
    category: "Other Vintage",
    eraBrand: "",
    condition: "",
    completeness: "",
    cost: 0,
    askingPrice: 0,
    soldPrice: 0,
    postage: 0,
    fees: 0,
    source: "",
    dateBought: "",
    pickupLocation: "",
    status: "To photograph",
    createdAt: new Date().toISOString(),
    soldDate: "",
    priceNotes: "",
    platforms: emptyPlatforms(),
    photos: [],
    isSample: false,
  };
}

/** Money actually made on a sold item: sold price minus what it cost to buy, post and sell. */
export function realisedProfit(item: Item): number {
  return (item.soldPrice || 0) - (item.cost || 0) - (item.postage || 0) - (item.fees || 0);
}

/** Money you would make if it sold at the asking price. */
export function potentialProfit(item: Item): number {
  return (item.askingPrice || 0) - (item.cost || 0) - (item.postage || 0) - (item.fees || 0);
}

export function aud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

/** Earliest date any platform was listed, or null if never listed. */
export function earliestListedDate(item: Item): string | null {
  const dates = PLATFORM_NAMES.map((p) => item.platforms[p]?.listedDate).filter(
    (d): d is string => Boolean(d),
  );
  if (dates.length === 0) return null;
  return dates.sort()[0];
}

/** True if the item has been listed for 30+ days and is still listed. */
export function isStale(item: Item, now = new Date()): boolean {
  if (item.status !== "Listed") return false;
  const first = earliestListedDate(item);
  if (!first) return false;
  const listed = new Date(first);
  const days = (now.getTime() - listed.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 30;
}

export function daysListed(item: Item, now = new Date()): number | null {
  const first = earliestListedDate(item);
  if (!first) return null;
  return Math.floor((now.getTime() - new Date(first).getTime()) / (1000 * 60 * 60 * 24));
}
