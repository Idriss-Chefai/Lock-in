import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  Brush,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDataStore } from "../services/datastore/context";
import { newId } from "../services/id";
import type { Book, MediaItem } from "../services/validation/schemas";
import { Card, Button, Input, Select, Badge, EmptyState } from "../components/ui";
import { Plus, Trash2, Star, ExternalLink, X, Link2, Film, Youtube, Mic2 } from "lucide-react";

const BOOK_STATUS_TONE: Record<Book["status"], "neutral" | "accent" | "success"> = {
  queued: "neutral",
  reading: "accent",
  finished: "success",
  abandoned: "neutral",
};

const MEDIA_STATUS_TONE: Record<MediaItem["status"], "neutral" | "accent" | "success"> = {
  queued: "neutral",
  watching: "accent",
  finished: "success",
  abandoned: "neutral",
};

const MEDIA_KIND_ICON: Record<MediaItem["kind"], typeof Film> = {
  youtube: Youtube,
  movie: Film,
  show: Film,
  podcast: Mic2,
};

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function isBookRecord(value: Book | MediaItem): value is Book {
  return "author" in value;
}

function MediaCover({ item }: { item: MediaItem | Book }) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const coverUrl = "coverUrl" in item ? item.coverUrl : undefined;

  useEffect(() => {
    setHasError(false);
    if (!coverUrl) {
      setResolvedSrc(null);
    } else if (isHttpUrl(coverUrl)) {
      setResolvedSrc(coverUrl);
    } else {
      window.lifeos.readImageDataUrl(coverUrl).then(setResolvedSrc).catch(() => {
        window.lifeos.resolveAssetUrl(coverUrl).then(setResolvedSrc).catch(() => setResolvedSrc(null));
      });
    }
  }, [coverUrl]);

  if (resolvedSrc && !hasError) {
    return (
      <img
        src={resolvedSrc}
        alt={item.title}
        onError={() => setHasError(true)}
        className="w-full aspect-[2/3] object-cover rounded-md bg-surface-raised"
      />
    );
  }
  return (
    <div className="w-full aspect-[2/3] rounded-md bg-surface-raised border border-border flex items-center justify-center p-2">
      <span className="text-xs text-ink-faint text-center line-clamp-4">{item.title}</span>
    </div>
  );
}

export function KnowledgePage() {
  const store = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Book | MediaItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [view, setView] = useState<"books" | "media">(location.pathname.endsWith("/media") ? "media" : "books");
  const [range, setRange] = useState<"month" | "quarter" | "year">("month");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [creator, setCreator] = useState("");
  const [kind, setKind] = useState<MediaItem["kind"]>("youtube");
  const [url, setUrl] = useState("");
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);

  async function refresh() {
    const [bookList, mediaList] = await Promise.all([store.getBooks(), store.getMediaItems()]);
    setBooks(bookList);
    setMediaItems(mediaList);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  useEffect(() => {
    const nextView = location.pathname.endsWith("/media") ? "media" : "books";
    setView(nextView);
  }, [location.pathname]);

  async function addBook() {
    if (!title.trim()) return;
    await store.saveBook({
      id: newId(),
      title: title.trim(),
      author: author.trim() || undefined,
      status: "queued",
      topics: [],
      coverUrl: coverUrlInput.trim() || undefined,
    });
    setTitle("");
    setAuthor("");
    setCoverUrlInput("");
    setShowAddForm(false);
    refresh();
  }

  async function addMediaItem() {
    if (!title.trim()) return;
    await store.saveMediaItem({
      id: newId(),
      title: title.trim(),
      kind,
      creator: creator.trim() || undefined,
      status: "queued",
      topics: [],
      url: url.trim() || undefined,
      coverUrl: coverUrlInput.trim() || undefined,
    });
    setTitle("");
    setCreator("");
    setUrl("");
    setCoverUrlInput("");
    setShowAddForm(false);
    refresh();
  }

  async function updateBook(b: Book, patch: Partial<Book>) {
    await store.saveBook({ ...b, ...patch });
    refresh();
    if (selected?.id === b.id) setSelected({ ...b, ...patch });
  }

  async function updateMediaItem(item: MediaItem, patch: Partial<MediaItem>) {
    await store.saveMediaItem({ ...item, ...patch });
    refresh();
    if (selected?.id === item.id) setSelected({ ...item, ...patch });
  }

  async function removeBook(id: string) {
    await store.deleteBook(id);
    setSelected(null);
    refresh();
  }

  async function removeMediaItem(id: string) {
    await store.deleteMediaItem(id);
    setSelected(null);
    refresh();
  }

  async function pickCoverFromDisk(b: Book | MediaItem) {
    const relPath = `assets/covers/${b.id}.jpg`;
    const saved = await window.lifeos.pickImageAndCopyToAssets(relPath);
    if (saved) {
      if (isBookRecord(b)) updateBook(b, { coverUrl: saved });
      else updateMediaItem(b, { coverUrl: saved });
    }
  }

  async function openNotes(b: Book | MediaItem) {
    if (!b.notesLocation) return;
    setOpenError(null);
    try {
      await window.lifeos.openPath(b.notesLocation);
    } catch {
      setOpenError(`Couldn't open ${b.notesLocation} — the file may have moved.`);
    }
  }

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  const isDashboard = location.pathname === "/knowledge";
  const selectedIsBook = selected !== null && isBookRecord(selected);
  const finishedBooks = books.filter((book) => book.status === "finished" && book.finished);
  const finishedMedia = mediaItems.filter((item) => item.status === "finished" && item.finished);
  const booksActive = books.filter((book) => book.status === "reading").length;
  const mediaActive = mediaItems.filter((item) => item.status === "watching").length;
  const thisYear = new Date().getFullYear();
  const booksReadThisYear = finishedBooks.filter((book) => book.finished && book.finished.startsWith(String(thisYear))).length;
  const mediaThisYear = finishedMedia.filter((item) => item.finished && item.finished.startsWith(String(thisYear))).length;

  const periodData = (() => {
    const buckets = new Map<string, { key: string; books: number; media: number }>();

    const addEntry = (entry: { finished?: string }, type: "books" | "media") => {
      const finishDate = entry.finished;
      if (!finishDate) return;
      const d = new Date(finishDate + "T00:00:00");
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const quarterKey = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
      const yearKey = String(d.getFullYear());
      const key = range === "month" ? monthKey : range === "quarter" ? quarterKey : yearKey;
      const existing = buckets.get(key) ?? { key, books: 0, media: 0 };
      if (type === "books") existing.books += 1;
      else existing.media += 1;
      buckets.set(key, existing);
    };

    for (const book of finishedBooks) addEntry(book, "books");
    for (const item of finishedMedia) addEntry(item, "media");

    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  })();

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Knowledge</h1>
          <p className="text-xs text-ink-muted">
            {isDashboard ? "Section dashboard overview" : view === "books" ? "Books library" : "Media library"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-surface-raised border border-border p-1">
            <button
              onClick={() => navigate("/knowledge/books")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === "books" ? "bg-accent text-white" : "text-ink-muted"}`}
            >
              Books
            </button>
            <button
              onClick={() => navigate("/knowledge/media")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === "media" ? "bg-accent text-white" : "text-ink-muted"}`}
            >
              Media
            </button>
          </div>
          {!isDashboard && (
            <Button onClick={() => setShowAddForm((s) => !s)}>
              <Plus size={14} /> {view === "books" ? "Add book" : "Add media"}
            </Button>
          )}
        </div>
      </div>

      {isDashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card title="Books finished">
            <p className="text-2xl font-semibold text-ink">{finishedBooks.length}</p>
            <p className="text-xs text-ink-faint">books completed</p>
          </Card>
          <Card title="Media finished">
            <p className="text-2xl font-semibold text-ink">{finishedMedia.length}</p>
            <p className="text-xs text-ink-faint">items completed</p>
          </Card>
          <Card title="This year">
            <p className="text-2xl font-semibold text-ink">{booksReadThisYear + mediaThisYear}</p>
            <p className="text-xs text-ink-faint">combined total</p>
          </Card>
          <Card title="Active now">
            <p className="text-2xl font-semibold text-ink">{booksActive + mediaActive}</p>
            <p className="text-xs text-ink-faint">reading + watching</p>
          </Card>
        </div>
      )}

      {isDashboard && (
        <Card
          title="Knowledge momentum"
          action={
            <Select
              value={range}
              onChange={(value) => setRange(value as "month" | "quarter" | "year")}
              options={[
                { value: "month", label: "Month" },
                { value: "quarter", label: "Quarter" },
                { value: "year", label: "Year" },
              ]}
            />
          }
        >
          {periodData.length === 0 ? (
            <EmptyState message="Finish a few books or media items to see your learning momentum." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="books" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Books" />
                <Bar dataKey="media" fill="var(--success)" radius={[4, 4, 0, 0]} name="Media" />
                <Brush dataKey="key" height={18} stroke="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {openError && (
        <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {openError}
        </div>
      )}

      {!isDashboard && showAddForm && (
        <Card title={view === "books" ? "Add a book" : "Add media"}>
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={view === "books" ? "Title" : "Title / show name"} className="flex-1 min-w-[180px]" />
              {view === "books" ? (
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" className="w-48" />
              ) : (
                <>
                  <Select
                    value={kind}
                    onChange={(v) => setKind(v as MediaItem["kind"])}
                    options={[
                      { value: "youtube", label: "YouTube" },
                      { value: "movie", label: "Movie" },
                      { value: "show", label: "Show" },
                      { value: "podcast", label: "Podcast" },
                    ]}
                    className="w-36"
                  />
                  <Input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Creator" className="w-40" />
                </>
              )}
            </div>
            {view === "media" && (
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/... or podcast link (optional)" className="w-full" />
            )}
            <Input
              value={coverUrlInput}
              onChange={(e) => setCoverUrlInput(e.target.value)}
              placeholder="Cover image URL (optional) — or set from a local file after saving"
              className="w-full"
            />
            <Button onClick={view === "books" ? addBook : addMediaItem}>Save</Button>
          </div>
        </Card>
      )}

      {!isDashboard && (view === "books" ? (
        books.length === 0 ? (
          <EmptyState message="No books tracked yet." />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {books.map((b) => (
              <button key={b.id} onClick={() => setSelected(b)} className="text-left group">
                <div className="relative">
                  <MediaCover item={b} />
                  <div className="absolute top-1 right-1">
                    <Badge tone={BOOK_STATUS_TONE[b.status]}>{b.status}</Badge>
                  </div>
                  {b.notesLocation && (
                    <div className="absolute bottom-1 left-1 bg-black/50 rounded p-0.5">
                      <Link2 size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-ink mt-1.5 truncate group-hover:text-accent">{b.title}</p>
                {b.author && <p className="text-[10px] text-ink-faint truncate">{b.author}</p>}
              </button>
            ))}
          </div>
        )
      ) : mediaItems.length === 0 ? (
        <EmptyState message="No media tracked yet." />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {mediaItems.map((item) => {
            const Icon = MEDIA_KIND_ICON[item.kind];
            return (
              <button key={item.id} onClick={() => setSelected(item)} className="text-left group">
                <div className="relative">
                  <MediaCover item={item} />
                  <div className="absolute top-1 right-1 flex items-center gap-1">
                    <Badge tone={MEDIA_STATUS_TONE[item.status]}>{item.status}</Badge>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/50 rounded p-0.5">
                    <Icon size={10} className="text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-ink mt-1.5 truncate group-hover:text-accent">{item.title}</p>
                {item.creator && <p className="text-[10px] text-ink-faint truncate">{item.creator}</p>}
              </button>
            );
          })}
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSelected(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <div className="w-20 shrink-0">
                  <MediaCover item={selected} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-ink">{selected.title}</h2>
                  {selectedIsBook && selected.author && <p className="text-xs text-ink-faint">{selected.author}</p>}
                  {!selectedIsBook && selected.creator && <p className="text-xs text-ink-faint">{selected.creator}</p>}
                  <div className="mt-2">
                    <Select
                      value={selected.status}
                      onChange={(v) => {
                        if (selectedIsBook) updateBook(selected, { status: v as Book["status"] });
                        else updateMediaItem(selected, { status: v as MediaItem["status"] });
                      }}
                      options={
                        selectedIsBook
                          ? [
                              { value: "queued", label: "Queued" },
                              { value: "reading", label: "Reading" },
                              { value: "finished", label: "Finished" },
                              { value: "abandoned", label: "Abandoned" },
                            ]
                          : [
                              { value: "queued", label: "Queued" },
                              { value: "watching", label: "Watching" },
                              { value: "finished", label: "Finished" },
                              { value: "abandoned", label: "Abandoned" },
                            ]
                      }
                    />
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-ink-faint hover:text-ink">
                <X size={16} />
              </button>
            </div>

            {selected.status === "finished" && (
              <div className="flex items-center gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => {
                    if (selectedIsBook) updateBook(selected, { rating: n });
                    else updateMediaItem(selected, { rating: n });
                  }}>
                    <Star size={16} className={(selected.rating ?? 0) >= n ? "fill-warning text-warning" : "text-ink-faint"} />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-ink-faint">Cover image</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste an image URL…"
                  defaultValue={selected.coverUrl && isHttpUrl(selected.coverUrl) ? selected.coverUrl : ""}
                  onBlur={(e) => {
                    if (!e.target.value) return;
                    if (selectedIsBook) updateBook(selected, { coverUrl: e.target.value });
                    else updateMediaItem(selected, { coverUrl: e.target.value });
                  }}
                  className="flex-1"
                />
                <Button variant="secondary" onClick={() => pickCoverFromDisk(selected)}>
                  From disk
                </Button>
              </div>

              {!selectedIsBook && selected.url && (
                <div className="flex gap-2 pt-2">
                  <a href={selected.url} target="_blank" rel="noreferrer" className="flex-1 text-xs text-accent underline break-all">Open link</a>
                </div>
              )}

              {selected.notesLocation ? (
                <div className="flex gap-2 mt-2">
                  <Button className="flex-1 justify-center" onClick={() => openNotes(selected)}>
                    <ExternalLink size={14} /> Open file
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" className="w-full justify-center mt-2" onClick={async () => {
                  const picked = await window.lifeos.pickFile(["excalidraw"]);
                  if (picked) {
                    if (selectedIsBook) updateBook(selected, { notesLocation: picked });
                    else updateMediaItem(selected, { notesLocation: picked });
                  }
                }}>
                  <Link2 size={14} /> Link notes file
                </Button>
              )}

              <Button variant="danger" className="w-full justify-center mt-2" onClick={() => {
                if (selectedIsBook) removeBook(selected.id);
                else removeMediaItem(selected.id);
              }}>
                <Trash2 size={13} /> Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
