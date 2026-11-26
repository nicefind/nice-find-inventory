import type { Item, PlatformName } from "./types";
import { aud } from "./types";

function baseLines(item: Item): string[] {
  const lines: string[] = [item.title];
  if (item.description) lines.push("", item.description);
  return lines;
}

function specs(item: Item): string[] {
  const out: string[] = [];
  if (item.eraBrand) out.push(`Era / brand: ${item.eraBrand}`);
  if (item.category) out.push(`Category: ${item.category}`);
  if (item.condition) out.push(`Condition: ${item.condition}`);
  if (item.completeness) out.push(`Completeness: ${item.completeness}`);
  return out;
}

function hashtags(item: Item): string {
  const tags = ["#vintage", "#retro", "#collectable", "#nicefind"];
  const lower = `${item.title} ${item.description} ${item.eraBrand} ${item.category}`.toLowerCase();
  if (lower.includes("motu") || lower.includes("masters of the universe")) tags.push("#motu", "#mastersoftheuniverse", "#80stoys");
  if (lower.includes("hot wheels") || lower.includes("matchbox") || lower.includes("diecast")) tags.push("#diecast", "#hotwheels", "#matchbox");
  if (lower.includes("pokemon") || lower.includes("pokémon")) tags.push("#pokemon", "#pokemoncards");
  if (lower.includes("tazo") || lower.includes("pog")) tags.push("#tazos", "#pogs");
  if (lower.includes("1980") || lower.includes("80s")) tags.push("#80s", "#80svintage");
  if (lower.includes("1990") || lower.includes("90s")) tags.push("#90s", "#90svintage");
  if (lower.includes("book")) tags.push("#vintagebooks");
  if (lower.includes("yo-yo") || lower.includes("yo yo")) tags.push("#yoyo", "#cocacola");
  return [...new Set(tags)].join(" ");
}

/** Depop: short, punchy, hashtags — Depop shoppers scroll fast. */
export function depopDescription(item: Item): string {
  const parts: string[] = [];
  parts.push(item.title);
  parts.push("");
  if (item.description) parts.push(item.description);
  if (item.condition) parts.push(`Condition: ${item.condition}`);
  if (item.completeness) parts.push(`Includes: ${item.completeness}`);
  if (item.eraBrand) parts.push(item.eraBrand);
  parts.push("");
  parts.push("From Nice Find — vintage collectables, Adelaide.");
  parts.push("Bundle deals welcome — message me!");
  parts.push("");
  parts.push(hashtags(item));
  return parts.join("\n");
}

/** eBay: detailed, specs and condition first — eBay buyers search on detail. */
export function ebayDescription(item: Item): string {
  const parts: string[] = [...baseLines(item), ""];
  const specLines = specs(item);
  if (specLines.length > 0) {
    parts.push("Details:");
    specLines.forEach((s) => parts.push(`- ${s}`));
    parts.push("");
  }
  if (item.priceNotes) {
    parts.push(`Notes: ${item.priceNotes}`);
    parts.push("");
  }
  parts.push("Postage: packed carefully. Combined postage available on multiple items — message before buying.");
  parts.push("From Nice Find, Adelaide, South Australia. Please check photos carefully — what you see is what you get.");
  return parts.join("\n");
}

/** Facebook Marketplace: local pickup in Adelaide front and centre. */
export function marketplaceDescription(item: Item): string {
  const parts: string[] = [];
  parts.push(`📍 Adelaide pickup${item.pickupLocation ? ` — ${item.pickupLocation}` : ""}`);
  parts.push("");
  parts.push(item.title);
  if (item.description) {
    parts.push("");
    parts.push(item.description);
  }
  const specLines = specs(item);
  if (specLines.length > 0) {
    parts.push("");
    specLines.forEach((s) => parts.push(s));
  }
  if (item.askingPrice) {
    parts.push("");
    parts.push(`Price: ${aud(item.askingPrice)}`);
  }
  parts.push("");
  parts.push("Pickup in Adelaide — message me to arrange a time. No holds without a deposit.");
  parts.push("From Nice Find — vintage collectables.");
  return parts.join("\n");
}

export function platformDescription(platform: PlatformName, item: Item): string {
  if (platform === "Depop") return depopDescription(item);
  if (platform === "eBay") return ebayDescription(item);
  return marketplaceDescription(item);
}

export function platformHint(platform: PlatformName): string {
  if (platform === "Depop") return "Short, with hashtags. Depop shoppers scroll fast.";
  if (platform === "eBay") return "Detailed, with specs and condition. eBay buyers search on detail.";
  return "Local pickup in Adelaide front and centre.";
}
