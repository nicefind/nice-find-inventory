"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  ITEM_STATUSES,
  PLATFORM_NAMES,
  PLATFORM_STATUSES,
  aud,
  daysListed,
  earliestListedDate,
  emptyItem,
  emptyPlatforms,
  isStale,
  newItemId,
  potentialProfit,
  realisedProfit,
  type Category,
  type Item,
  type ItemStatus,
  type PlatformInfo,
  type PlatformName,
  type PlatformStatus,
} from "../lib/types";
import { getSupabase, isSupabaseConfigured, uploadPhotoToSupabase } from "../lib/supabase";
import { platformDescription, platformHint } from "../lib/platformCopy";

const LOCAL_KEY = "nice-find-items-v1";
const GOAL = 50000;
const WEEKLY_PACE = 962;

function sampleItems(): Item[] {
  const now = new Date().toISOString();
  return [
    {
      ...emptyItem(),
      id: newItemId(),
      title: "Vintage ICE-BUSTERS Sno-Cone Maker (1985 Lanard Toys)",
      description:
        "Vintage ICE-BUSTERS sno-cone machine maker, 1985 Lanard Toys. Rare 80s Ghostbusters-craze knockoff.",
      category: "80s/90s Toys",
      eraBrand: "1985 Lanard Toys",
      condition: "Used (like new)",
      completeness: "Check for box, bowls, red shovel and instructions — the shovel matters for getting ice out.",
      cost: 20,
      askingPrice: 50,
      soldPrice: 0,
      postage: 0,
      fees: 0,
      source: "Facebook Marketplace",
      dateBought: "",
      pickupLocation: "Modbury Heights, Adelaide",
      status: "Watching",
      createdAt: now,
      soldDate: "",
      priceNotes: "Resale estimate $45–$60 (plausible range, not a confirmed sold price).",
      platforms: emptyPlatforms(),
      photos: [],
      isSample: true,
    },
    {
      ...emptyItem(),
      id: newItemId(),
      title: "Yo Yo Lot — 5 Vintage Coca-Cola Yo Yos",
      description: "5 x vintage Coca-Cola toy yo-yos.",
      category: "80s/90s Toys",
      eraBrand: "Coca-Cola — check for Russell / Championship branding",
      condition: "Used (good)",
      completeness: "Check photos for Russell / Championship branding and condition.",
      cost: 25,
      askingPrice: 60,
      soldPrice: 0,
      postage: 0,
      fees: 0,
      source: "Facebook Marketplace",
      dateBought: "",
      pickupLocation: "Adelaide, SA — no suburb listed, ask seller",
      status: "Watching",
      createdAt: now,
      soldDate: "",
      priceNotes:
        "If Russell Championship in good condition, $20–$30 each is plausible (Scammell Auctions previewed 4 for $80–$120 in Mar 2025). If common later promos, much lower.",
      platforms: emptyPlatforms(),
      photos: [],
      isSample: true,
    },
  ];
}

// Supabase rows use snake_case; the app uses camelCase.
function fromRow(row: Record<string, unknown>): Item {
  const platforms = (row.platforms as Record<string, PlatformInfo> | null) || {};
  const merged = emptyPlatforms();
  for (const name of PLATFORM_NAMES) {
    if (platforms[name]) merged[name] = { ...merged[name], ...platforms[name] };
  }
  return {
    id: String(row.id ?? newItemId()),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: (row.category as Category) || "Other Vintage",
    eraBrand: String(row.era_brand ?? ""),
    condition: String(row.condition ?? ""),
    completeness: String(row.completeness ?? ""),
    cost: Number(row.cost ?? 0),
    askingPrice: Number(row.asking_price ?? 0),
    soldPrice: Number(row.sold_price ?? 0),
    postage: Number(row.postage ?? 0),
    fees: Number(row.fees ?? 0),
    source: String(row.source ?? ""),
    dateBought: row.date_bought ? String(row.date_bought).slice(0, 10) : "",
    pickupLocation: String(row.pickup_location ?? ""),
    status: (row.status as ItemStatus) || "To photograph",
    createdAt: String(row.created_at ?? new Date().toISOString()),
    soldDate: row.sold_date ? String(row.sold_date).slice(0, 10) : "",
    priceNotes: String(row.price_notes ?? ""),
    platforms: merged,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    isSample: Boolean(row.is_sample ?? false),
  };
}

function toRow(item: Item): Record<string, unknown> {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    era_brand: item.eraBrand,
    condition: item.condition,
    completeness: item.completeness,
    cost: item.cost,
    asking_price: item.askingPrice,
    sold_price: item.soldPrice,
    postage: item.postage,
    fees: item.fees,
    source: item.source,
    date_bought: item.dateBought || null,
    pickup_location: item.pickupLocation,
    status: item.status,
    created_at: item.createdAt,
    sold_date: item.soldDate || null,
    price_notes: item.priceNotes,
    platforms: item.platforms,
    photos: item.photos,
    is_sample: item.isSample,
  };
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

// One plain-English stage per item, instead of three platform pills.
function stageLabel(item: Item): string {
  if (item.status === "Sold") return "Sold";
  if (item.status === "To photograph") return "Needs photo";
  if (item.status === "To list") return "Ready to list";
  if (item.status === "Listed") {
    const n = PLATFORM_NAMES.filter((p) => item.platforms[p].status === "Listed").length;
    return n > 0 ? `Listed on ${n} place${n === 1 ? "" : "s"}` : "Listed";
  }
  return "Watching";
}

function listedCount(item: Item): number {
  return PLATFORM_NAMES.filter((p) => item.platforms[p].status === "Listed").length;
}

type Chip = "all" | "needs-photo" | "to-list" | "listed" | "sold" | "stale";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs-photo", label: "Needs photo" },
  { id: "to-list", label: "To list" },
  { id: "listed", label: "Listed" },
  { id: "sold", label: "Sold" },
  { id: "stale", label: "Stale" },
];

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<Chip>("all");
  const [catFilter, setCatFilter] = useState("All");
  const [sort, setSort] = useState("newest");
  const [tab, setTab] = useState<"stock" | "overview">("stock");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformName>("eBay");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Item>(emptyItem());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const [uploading, setUploading] = useState(false);

  // Load items once.
  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error: err } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false });
        if (err) {
          setError(`Could not load from Supabase: ${err.message}. Check your env vars and that supabase/schema.sql has been run.`);
        } else {
          setItems((data || []).map((r) => fromRow(r as Record<string, unknown>)));
        }
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          if (raw) setItems(JSON.parse(raw) as Item[]);
        } catch {
          setItems([]);
        }
      }
      setLoaded(true);
    }
    load();
  }, []);

  // Local demo mode: persist to localStorage whenever items change.
  useEffect(() => {
    if (!loaded || isSupabaseConfigured) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    } catch {
      // localStorage full (large photos) — the app still works in memory.
    }
  }, [items, loaded]);

  const dashboard = useMemo(() => {
    const unsold = items.filter((i) => i.status !== "Sold");
    const sold = items.filter((i) => i.status === "Sold" || i.soldPrice > 0);
    const totalStockCost = unsold.reduce((s, i) => s + (i.cost || 0), 0);
    const totalListedValue = items
      .filter((i) => i.status === "Listed")
      .reduce((s, i) => s + (i.askingPrice || 0), 0);
    const totalSold = sold.reduce((s, i) => s + (i.soldPrice || 0), 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const soldThisWeek = sold
      .filter((i) => i.soldDate && new Date(i.soldDate) >= weekAgo)
      .reduce((s, i) => s + (i.soldPrice || 0), 0);
    const profit = sold.reduce((s, i) => s + realisedProfit(i), 0);
    const staleCount = items.filter((i) => isStale(i)).length;
    const needsPhoto = items.filter((i) => i.status === "To photograph").length;
    const toList = items.filter((i) => i.status === "To list").length;
    return { totalStockCost, totalListedValue, totalSold, soldThisWeek, profit, staleCount, soldCount: sold.length, needsPhoto, toList };
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((i) => {
      if (catFilter !== "All" && i.category !== catFilter) return false;
      if (chip === "needs-photo" && i.status !== "To photograph") return false;
      if (chip === "to-list" && i.status !== "To list") return false;
      if (chip === "listed" && i.status !== "Listed") return false;
      if (chip === "sold" && i.status !== "Sold") return false;
      if (chip === "stale" && !isStale(i)) return false;
      if (q) {
        const hay = `${i.title} ${i.description} ${i.eraBrand} ${i.source} ${i.category} ${i.pickupLocation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list];
    if (sort === "newest") list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "oldest-listed") {
      list.sort((a, b) => {
        const da = earliestListedDate(a);
        const db = earliestListedDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      });
    }
    if (sort === "highest-profit") list.sort((a, b) => potentialProfit(b) - potentialProfit(a));
    return list;
  }, [items, search, catFilter, chip, sort]);

  async function saveItem(item: Item) {
    const supabase = getSupabase();
    if (supabase) {
      const { error: err } = await supabase.from("items").upsert(toRow(item));
      if (err) {
        setError(`Could not save to Supabase: ${err.message}`);
        return false;
      }
    }
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      return exists ? prev.map((i) => (i.id === item.id ? item : i)) : [item, ...prev];
    });
    return true;
  }

  async function handleSaveForm() {
    if (!draft.title.trim()) {
      setError("Give the item a title first.");
      return;
    }
    setError("");
    const ok = await saveItem({ ...draft, title: draft.title.trim() });
    if (ok) {
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyItem());
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    const supabase = getSupabase();
    if (supabase) {
      const { error: err } = await supabase.from("items").delete().eq("id", id);
      if (err) {
        setError(`Could not delete from Supabase: ${err.message}`);
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }

  async function updatePlatform(item: Item, platform: PlatformName, patch: Partial<PlatformInfo>) {
    const next: Item = {
      ...item,
      platforms: { ...item.platforms, [platform]: { ...item.platforms[platform], ...patch } },
    };
    const supabase = getSupabase();
    if (supabase) {
      const { error: err } = await supabase
        .from("items")
        .update({ platforms: next.platforms })
        .eq("id", item.id);
      if (err) {
        setError(`Could not save platform status: ${err.message}`);
        return;
      }
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? next : i)));
  }

  async function markAsSold(item: Item) {
    const next: Item = { ...item, status: "Sold", soldPrice: item.soldPrice || item.askingPrice };
    const ok = await saveItem(next);
    if (ok) setSelectedId(item.id);
  }

  async function handlePhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (isSupabaseConfigured) {
        const url = await uploadPhotoToSupabase(draft.id, file);
        if (url) urls.push(url);
      } else {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });
        urls.push(dataUrl);
      }
    }
    if (urls.length > 0) setDraft((d) => ({ ...d, photos: [...d.photos, ...urls] }));
    setUploading(false);
  }

  async function loadSamples() {
    const samples = sampleItems();
    for (const s of samples) {
      await saveItem(s);
    }
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 2000);
  }

  function exportCsv() {
    const headers = ["Title", "Category", "Era/Brand", "Condition", "Completeness", "Cost (AUD)", "Asking price (AUD)", "Sold price (AUD)", "Postage (AUD)", "Fees (AUD)", "Profit (AUD)", "Source", "Date bought", "Pickup location", "Status", "Sold date", "Price notes", "eBay status", "eBay URL", "Marketplace status", "Marketplace URL", "Depop status", "Depop URL", "Photos"];
    const rows = items.map((i) =>
      [
        i.title, i.category, i.eraBrand, i.condition, i.completeness,
        i.cost, i.askingPrice, i.soldPrice, i.postage, i.fees,
        i.status === "Sold" ? realisedProfit(i) : potentialProfit(i),
        i.source, i.dateBought, i.pickupLocation, i.status, i.soldDate, i.priceNotes,
        i.platforms.eBay.status, i.platforms.eBay.url,
        i.platforms.Marketplace.status, i.platforms.Marketplace.url,
        i.platforms.Depop.status, i.platforms.Depop.url,
        i.photos.join(" "),
      ].map(csvCell).join(","),
    );
    const csv = [headers.map(csvCell).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nice-find-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openAdd() {
    setDraft(emptyItem());
    setEditingId(null);
    setShowMore(false);
    setShowSell(false);
    setShowForm(true);
    setSelectedId(null);
  }

  function openEdit(item: Item) {
    setDraft(item);
    setEditingId(item.id);
    // Folded sections open automatically when they already have data.
    setShowMore(Boolean(item.eraBrand || item.condition || item.completeness || item.source || item.dateBought || item.pickupLocation || item.priceNotes || item.category !== "Other Vintage"));
    setShowSell(Boolean(item.soldPrice || item.soldDate || item.postage || item.fees || item.status === "Sold"));
    setShowForm(true);
    setSelectedId(null);
  }

  function jumpToChip(c: Chip) {
    setChip(c);
    setTab("stock");
    setSelectedId(null);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const progressPct = Math.min(100, (dashboard.totalSold / GOAL) * 100);
  const selected = selectedId ? items.find((i) => i.id === selectedId) || null : null;

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>nice find</h1>
          <p className="sub">Vintage collectables · Adelaide · eBay · Facebook Marketplace · Depop</p>
        </div>
        <button className="btn primary" onClick={openAdd}>+ Add item</button>
      </header>

      <div className="goal-line">
        <strong>{aud(dashboard.totalSold)} sold</strong>
        <span>of $50,000 · {progressPct.toFixed(1)}% · {aud(GOAL - dashboard.totalSold)} to go</span>
        <span>· pace {aud(WEEKLY_PACE)} / week</span>
      </div>
      <div className="progress"><div style={{ width: `${progressPct}%` }} /></div>

      <div className="tabs" role="tablist" aria-label="Sections">
        <button className={tab === "stock" && !selected ? "active" : ""} onClick={() => { setTab("stock"); setSelectedId(null); }}>Stock</button>
        <button className={tab === "overview" ? "active" : ""} onClick={() => { setTab("overview"); setSelectedId(null); }}>Overview</button>
      </div>

      {isSupabaseConfigured ? (
        <div className="banner live">Connected to Supabase — items and photos sync across devices.</div>
      ) : (
        <div className="banner demo">
          <strong>Local demo mode — connect Supabase to sync.</strong> Items are saved in this browser only for now.
          Add your Supabase URL and anon key to <code>.env.local</code> (see README) and redeploy to sync everywhere.
        </div>
      )}
      {error && <div className="banner error">{error}</div>}
      {dashboard.staleCount > 0 && tab === "overview" && (
        <div className="banner error">{dashboard.staleCount} item{dashboard.staleCount === 1 ? " is" : "s are"} stale — listed 30+ days ago. Consider a price drop, new photos, or relisting.</div>
      )}

      {showForm && (
        <section className="form">
          <h2>{editingId ? "Edit item" : "Add item"}</h2>
          <label>Title *</label>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Vintage ICE-BUSTERS Sno-Cone Maker" />
          <label>Photos</label>
          <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoFiles(e.target.files)} />
          {uploading && <p>Uploading photos…</p>}
          {draft.photos.length > 0 && (
            <div className="photos" style={{ marginTop: 8 }}>
              {draft.photos.map((p, i) => (
                <span key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt={`Photo ${i + 1}`} />
                  <button className="btn small danger" style={{ position: "absolute", top: 2, right: 2 }} onClick={() => setDraft({ ...draft, photos: draft.photos.filter((_, j) => j !== i) })}>✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="cols">
            <div>
              <label>Paid (AUD)</label>
              <input type="number" min="0" step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} />
            </div>
            <div>
              <label>Asking price (AUD)</label>
              <input type="number" min="0" step="0.01" value={draft.askingPrice} onChange={(e) => setDraft({ ...draft, askingPrice: e.target.value === "" ? 0 : Number(e.target.value) })} />
            </div>
          </div>
          <label>Description</label>
          <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="The description everything else is generated from." />

          <details open={showMore} onToggle={(e) => setShowMore((e.target as HTMLDetailsElement).open)}>
            <summary>More details</summary>
            <label>Category</label>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Era / brand</label>
            <input value={draft.eraBrand} onChange={(e) => setDraft({ ...draft, eraBrand: e.target.value })} placeholder="e.g. 1985 Lanard Toys" />
            <label>Condition</label>
            <input value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} placeholder="e.g. Used (like new)" />
            <label>Completeness notes</label>
            <textarea value={draft.completeness} onChange={(e) => setDraft({ ...draft, completeness: e.target.value })} placeholder="Box, instructions, parts included / missing…" />
            <label>Source</label>
            <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="e.g. Facebook Marketplace" />
            <label>Date bought</label>
            <input type="date" value={draft.dateBought} onChange={(e) => setDraft({ ...draft, dateBought: e.target.value })} />
            <label>Pickup location</label>
            <input value={draft.pickupLocation} onChange={(e) => setDraft({ ...draft, pickupLocation: e.target.value })} placeholder="e.g. Modbury Heights, Adelaide" />
            <label>Price / comp notes</label>
            <textarea value={draft.priceNotes} onChange={(e) => setDraft({ ...draft, priceNotes: e.target.value })} placeholder="Sold comps, resale estimates, what to check…" />
            <h3>Platform listings</h3>
            {PLATFORM_NAMES.map((p) => (
              <div className="platform" key={p}>
                <h4>{p === "Marketplace" ? "Facebook Marketplace" : p}</h4>
                <div className="fields">
                  <div>
                    <label>Status</label>
                    <select value={draft.platforms[p].status} onChange={(e) => setDraft({ ...draft, platforms: { ...draft.platforms, [p]: { ...draft.platforms[p], status: e.target.value as PlatformStatus } } })}>
                      {PLATFORM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Listed date</label>
                    <input type="date" value={draft.platforms[p].listedDate} onChange={(e) => setDraft({ ...draft, platforms: { ...draft.platforms, [p]: { ...draft.platforms[p], listedDate: e.target.value } } })} />
                  </div>
                </div>
                <label>Listing URL</label>
                <input value={draft.platforms[p].url} onChange={(e) => setDraft({ ...draft, platforms: { ...draft.platforms, [p]: { ...draft.platforms[p], url: e.target.value } } })} placeholder="https://…" />
              </div>
            ))}
          </details>

          <details open={showSell} onToggle={(e) => setShowSell((e.target as HTMLDetailsElement).open)}>
            <summary>When it sells</summary>
            <label>Overall status</label>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ItemStatus })}>
              {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="cols">
              <div>
                <label>Sold price (AUD)</label>
                <input type="number" min="0" step="0.01" value={draft.soldPrice} onChange={(e) => setDraft({ ...draft, soldPrice: Number(e.target.value) })} />
              </div>
              <div>
                <label>Sold date</label>
                <input type="date" value={draft.soldDate} onChange={(e) => setDraft({ ...draft, soldDate: e.target.value })} />
              </div>
              <div>
                <label>Postage (AUD)</label>
                <input type="number" min="0" step="0.01" value={draft.postage} onChange={(e) => setDraft({ ...draft, postage: Number(e.target.value) })} />
              </div>
              <div>
                <label>Fees (AUD)</label>
                <input type="number" min="0" step="0.01" value={draft.fees} onChange={(e) => setDraft({ ...draft, fees: Number(e.target.value) })} />
              </div>
            </div>
          </details>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={handleSaveForm}>{editingId ? "Save changes" : "Add item"}</button>
            <button className="btn" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
          </div>
        </section>
      )}

      {selected ? (
        <section>
          <button className="btn small" onClick={() => setSelectedId(null)}>← Back to stock</button>
          {selected.photos.length > 0 && (
            <div className="photos" style={{ marginTop: 12 }}>
              {selected.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt={`${selected.title} photo ${i + 1}`} className={i === 0 ? "hero" : ""} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <span className={`pill${selected.status === "Sold" ? " sold" : ""}`}>{stageLabel(selected)}</span>
            <span className="pill">{selected.category}</span>
            {selected.isSample && <span className="pill sample">Sample</span>}
            {isStale(selected) && <span className="pill stale">Stale — listed {daysListed(selected)} days</span>}
          </div>
          <h2>{selected.title}</h2>
          <p className="price-line">Paid {aud(selected.cost)} · Asking {aud(selected.askingPrice)}{selected.status === "Sold" ? ` · Sold ${aud(selected.soldPrice)}` : ""}</p>
          {selected.description && <p className="desc">{selected.description}</p>}
          <p className="meta">
            {[selected.eraBrand, selected.condition, selected.source, selected.pickupLocation, selected.dateBought ? `Bought ${selected.dateBought}` : ""].filter(Boolean).join(" · ")}
          </p>
          {selected.completeness && <p className="meta">Completeness: {selected.completeness}</p>}
          {selected.priceNotes && <p className="meta">Notes: {selected.priceNotes}</p>}

          <h3>Sell it</h3>
          <div className="plat-tabs">
            {PLATFORM_NAMES.map((p) => (
              <button key={p} className={activePlatform === p ? "active" : ""} onClick={() => setActivePlatform(p)}>
                {p === "Marketplace" ? "Facebook Marketplace" : p}
                <span className="plat-badge">{selected.platforms[p].status}</span>
              </button>
            ))}
          </div>
          {(() => {
            const p = activePlatform;
            const info = selected.platforms[p];
            const text = platformDescription(p, selected);
            const key = `${selected.id}-${p}`;
            return (
              <div className="platform">
                <p className="hint">{platformHint(p)}</p>
                <div className="fields">
                  <div>
                    <label>Status</label>
                    <select value={info.status} onChange={(e) => updatePlatform(selected, p, { status: e.target.value as PlatformStatus })}>
                      {PLATFORM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Listed date</label>
                    <input type="date" value={info.listedDate} onChange={(e) => updatePlatform(selected, p, { listedDate: e.target.value })} />
                  </div>
                </div>
                <label>Listing URL</label>
                <input value={info.url} onChange={(e) => updatePlatform(selected, p, { url: e.target.value })} placeholder="https://…" />
                <pre>{text}</pre>
                <div className="row">
                  <button className="btn small" onClick={() => copyText(key, text)}>
                    {copiedKey === key ? "✓ Copied" : `Copy ${p} description`}
                  </button>
                  {info.url && <a href={info.url} target="_blank" rel="noreferrer">Open listing ↗</a>}
                </div>
              </div>
            );
          })()}

          <div className="sticky-bar">
            <button className="btn" onClick={() => openEdit(selected)}>Edit</button>
            {selected.status !== "Sold" && (
              <button className="btn sold-btn" onClick={() => markAsSold(selected)}>Mark as sold</button>
            )}
            <button className="btn danger" onClick={() => handleDelete(selected.id, selected.title)}>Delete</button>
          </div>
        </section>
      ) : tab === "overview" ? (
        <section>
          <section className="dash" aria-label="Dashboard">
            <div className="stat"><div className="k">Stock cost</div><div className="v">{aud(dashboard.totalStockCost)}</div><div className="s">cost of unsold stock</div></div>
            <div className="stat"><div className="k">Listed value</div><div className="v">{aud(dashboard.totalListedValue)}</div><div className="s">asking price of listed items</div></div>
            <div className="stat"><div className="k">Total sold</div><div className="v">{aud(dashboard.totalSold)}</div><div className="s">{dashboard.soldCount} item{dashboard.soldCount === 1 ? "" : "s"} sold</div></div>
            <div className="stat"><div className="k">Sold this week</div><div className="v">{aud(dashboard.soldThisWeek)}</div><div className="s">pace: {aud(WEEKLY_PACE)} / week</div></div>
            <div className="stat"><div className="k">Profit so far</div><div className="v">{aud(dashboard.profit)}</div><div className="s">sold price − cost − postage − fees</div></div>
            <div className="stat">
              <div className="k">Goal: $50,000</div>
              <div className="v">{progressPct.toFixed(1)}%</div>
              <div className="progress"><div style={{ width: `${progressPct}%` }} /></div>
              <div className="s">{aud(GOAL - dashboard.totalSold)} to go</div>
            </div>
          </section>
          <h2>Next up</h2>
          <button className="todo-row" onClick={() => jumpToChip("needs-photo")}>
            <span>Needs a photo</span><span className="count">{dashboard.needsPhoto}</span>
          </button>
          <button className="todo-row" onClick={() => jumpToChip("to-list")}>
            <span>Ready to list</span><span className="count">{dashboard.toList}</span>
          </button>
          <button className="todo-row" onClick={() => jumpToChip("stale")}>
            <span>Stale — listed 30+ days</span><span className="count">{dashboard.staleCount}</span>
          </button>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={exportCsv} disabled={items.length === 0}>Export CSV</button>
          </div>
        </section>
      ) : (
        <section>
          <div className="search">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your stock…" aria-label="Search stock" />
          </div>
          <div className="chips">
            {CHIPS.map((c) => (
              <button key={c.id} className={`chip${chip === c.id ? " active" : ""}`} onClick={() => setChip(c.id)}>
                {c.label}{c.id === "needs-photo" && dashboard.needsPhoto > 0 ? ` (${dashboard.needsPhoto})` : ""}{c.id === "to-list" && dashboard.toList > 0 ? ` (${dashboard.toList})` : ""}{c.id === "stale" && dashboard.staleCount > 0 ? ` (${dashboard.staleCount})` : ""}
              </button>
            ))}
          </div>
          <div className="toolbar-mini">
            <label htmlFor="cat" style={{ margin: 0 }}>Category</label>
            <select id="cat" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="All">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label htmlFor="sort" style={{ margin: 0 }}>Sort</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest-listed">Oldest listed first</option>
              <option value="highest-profit">Highest profit first</option>
            </select>
            <span>{visible.length} item{visible.length === 1 ? "" : "s"}</span>
          </div>

          {!loaded && <p>Loading…</p>}

          {loaded && items.length === 0 && !showForm && (
            <div className="empty">
              <h2>Your inventory is empty</h2>
              <p>Add your first item, or load the two sample finds so you can see the layout.</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <button className="btn primary" onClick={openAdd}>+ Add first item</button>
                <button className="btn" onClick={loadSamples}>Load 2 sample items</button>
              </div>
              <p style={{ fontSize: 13 }}>Samples: Ice-Busters sno-cone maker ($20) and 5 vintage Coca-Cola Yo Yos ($25). Clearly marked as samples, and deletable.</p>
            </div>
          )}

          {loaded && visible.length === 0 && items.length > 0 && (
            <div className="empty"><p>No items match those filters. Try clearing the search or filters.</p></div>
          )}

          <div className="grid">
            {visible.map((item) => {
              const stale = isStale(item);
              const listedDays = daysListed(item);
              return (
                <article className="card" key={item.id} onClick={() => { setSelectedId(item.id); setActivePlatform("eBay"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  {item.photos.length > 0 && (
                    <div className="photos">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.photos[0]} alt={item.title} className="hero" />
                    </div>
                  )}
                  <div>
                    <span className={`pill${item.status === "Sold" ? " sold" : ""}`}>{stageLabel(item)}</span>
                    {item.isSample && <span className="pill sample">Sample</span>}
                    {stale && <span className="pill stale">Stale — listed {listedDays} days</span>}
                  </div>
                  <h3>{item.title}</h3>
                  <p className="price-line">Paid {aud(item.cost)} · Asking {aud(item.askingPrice)}</p>
                  {item.description && <p className="desc">{item.description}</p>}
                  <p className="meta">
                    {[item.eraBrand, item.condition, item.category].filter(Boolean).join(" · ")}
                  </p>
                </article>
              );
            })}
          </div>
          {loaded && items.length > 0 && (
            <button className="btn primary add-sticky" onClick={openAdd}>+ Add item</button>
          )}
        </section>
      )}

      <footer>
        <p>
          Nice Find inventory · Goal: sell $50,000 of stock ({aud(WEEKLY_PACE)} a week).
          This app does <strong>not</strong> auto-post to eBay, Facebook Marketplace or Depop — copy the generated
          description into each platform and tick the status off here.
        </p>
      </footer>
    </main>
  );
}
