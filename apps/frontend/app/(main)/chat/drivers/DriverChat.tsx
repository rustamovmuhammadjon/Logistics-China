"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessagesSquare, Phone, Search, Send } from "lucide-react";
import {
  formatDate,
  formatUpdateTime,
  type ChatMessageDto,
  type OperatorChatSummaryDto,
} from "@logistics/shared";
import { clientApi } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { CHAT_EVENT } from "@/components/AppShell";

// The socket pushes new messages; this only covers a dropped connection.
const FALLBACK_POLL_MS = 20_000;
const MAX_LENGTH = 2000;

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(iso);
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function DriverChat() {
  const params = useParams<{ driverId?: string }>();
  const selectedId = params.driverId ?? null;
  const router = useRouter();
  const [chats, setChats] = useState<OperatorChatSummaryDto[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadChats = useCallback(async () => {
    try {
      const data = await clientApi<{ chats: OperatorChatSummaryDto[] }>("/api/chats/drivers");
      setChats(data.chats);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Couldn't load conversations");
    }
  }, []);

  useEffect(() => {
    void loadChats();
    const timer = setInterval(() => void loadChats(), FALLBACK_POLL_MS);
    const onChat = () => void loadChats();
    window.addEventListener(CHAT_EVENT, onChat);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHAT_EVENT, onChat);
    };
  }, [loadChats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!chats || !q) return chats ?? [];
    return chats.filter((chat) =>
      [chat.driver.firstName, chat.driver.lastName, chat.driver.phone, chat.latestTrip.plateNumber, chat.latestTrip.reference]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [chats, query]);

  const selected = chats?.find((chat) => chat.driver.id === selectedId) ?? null;

  return (
    <div className="grid h-[calc(100vh-15rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={`min-h-0 min-w-0 flex-col border-slate-200/80 lg:flex lg:border-r ${selectedId ? "hidden" : "flex"}`}>
        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search driver, phone or plate"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listError && <p className="p-4 text-sm text-red-600">{listError}</p>}
          {chats === null && !listError ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">
              {chats && chats.length === 0
                ? "No drivers yet. Drivers you pair with a code show up here once they register in the app."
                : "No driver matches that search."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((chat) => (
                <li key={chat.driver.id}>
                  <ChatRow chat={chat} active={chat.driver.id === selectedId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className={`min-h-0 min-w-0 flex-col lg:flex ${selectedId ? "flex" : "hidden"}`}>
        {selectedId ? (
          <Thread
            key={selectedId}
            driverId={selectedId}
            summary={selected}
            onBack={() => router.push("/chat/drivers")}
            onActivity={loadChats}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <MessagesSquare className="h-7 w-7" />
            </span>
            <p className="font-medium text-slate-800">Select a driver</p>
            <p className="max-w-xs text-sm text-slate-500">
              Pick a conversation on the left. Each driver has their own thread.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ChatRow({ chat, active }: { chat: OperatorChatSummaryDto; active: boolean }) {
  const preview = chat.lastMessage
    ? `${chat.lastMessage.sender === "OPERATOR" ? "You: " : ""}${chat.lastMessage.text}`
    : "No messages yet";
  return (
    <Link
      href={`/chat/drivers/${chat.driver.id}`}
      prefetch={false}
      className={`flex gap-3 px-4 py-3 transition ${active ? "bg-brand-50" : "hover:bg-slate-50"}`}
    >
      <Avatar firstName={chat.driver.firstName} lastName={chat.driver.lastName} email={chat.driver.phone} size={42} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 truncate text-sm font-semibold text-slate-900">
            {chat.driver.firstName} {chat.driver.lastName}
          </span>
          {chat.lastMessage && (
            <span className="shrink-0 text-xs text-slate-400">{formatUpdateTime(chat.lastMessage.createdAt)}</span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${chat.latestTrip.active ? "bg-emerald-500" : "bg-slate-300"}`} />
          <span className="truncate">
            {[chat.latestTrip.plateNumber, chat.latestTrip.reference].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className={`flex-1 truncate text-[13px] ${chat.unread > 0 ? "font-medium text-slate-800" : "text-slate-400"}`}>
            {preview}
          </span>
          {chat.unread > 0 && (
            <span className="min-w-[20px] rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
              {chat.unread}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

function Thread({
  driverId,
  summary,
  onBack,
  onActivity,
}: {
  driverId: string;
  summary: OperatorChatSummaryDto | null;
  onBack: () => void;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessageDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await clientApi<{ messages: ChatMessageDto[] }>(`/api/chats/drivers/${driverId}/messages`);
      // Only re-render (and re-scroll) when something actually arrived, so
      // reading older messages isn't interrupted by a background poll.
      setMessages((current) =>
        current && current.length === data.messages.length && current.at(-1)?.id === data.messages.at(-1)?.id
          ? current
          : data.messages
      );
      setError(null);
      // Opening the thread marked it read — let the nav badge catch up.
      window.dispatchEvent(new Event("chat:read"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load messages");
    }
  }, [driverId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), FALLBACK_POLL_MS);
    const onChat = (event: Event) => {
      const detail = (event as CustomEvent<{ driverId?: string }>).detail;
      if (detail?.driverId === driverId) void load();
    };
    window.addEventListener(CHAT_EVENT, onChat);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHAT_EVENT, onChat);
    };
  }, [load, driverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const data = await clientApi<{ message: ChatMessageDto }>(`/api/chats/drivers/${driverId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: body }),
      });
      setMessages((current) => [...(current ?? []), data.message]);
      setText("");
      onActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send");
    } finally {
      setSending(false);
    }
  }

  const groups = useMemo(() => {
    const out: { day: string; items: ChatMessageDto[] }[] = [];
    for (const message of messages ?? []) {
      const day = dayLabel(message.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(message);
      else out.push({ day, items: [message] });
    }
    return out;
  }, [messages]);

  const driverName = summary ? `${summary.driver.firstName} ${summary.driver.lastName}` : "Driver";

  return (
    <>
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar
          firstName={summary?.driver.firstName}
          lastName={summary?.driver.lastName}
          email={summary?.driver.phone ?? "?"}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{driverName}</p>
          {summary && (
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span>{summary.driver.phone}</span>
              <span className="text-slate-300">·</span>
              <span>
                {[summary.latestTrip.plateNumber, summary.latestTrip.reference, summary.latestTrip.subOrderName]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {summary.latestTrip.active ? <span className="badge-green">On trip</span> : <span className="badge-slate">Trip ended</span>}
            </p>
          )}
        </div>
        {summary && (
          <a href={`tel:${summary.driver.phone}`} className="btn-secondary px-3" title={`Call ${driverName}`}>
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Call</span>
          </a>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {messages === null && !error ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : messages && messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No messages yet — say hello to {summary?.driver.firstName ?? "the driver"}.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.day} className="space-y-1.5">
                <p className="py-1 text-center">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-400 shadow-sm">
                    {group.day}
                  </span>
                </p>
                {group.items.map((message) => {
                  const mine = message.sender === "OPERATOR";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          mine
                            ? "rounded-br-md bg-brand-600 text-white"
                            : "rounded-bl-md border border-slate-200/80 bg-white text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        <p className={`mt-0.5 text-right text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                          {timeOf(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="field-input max-h-40 min-h-[44px] flex-1 resize-none"
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={`Message ${summary?.driver.firstName ?? "driver"}…  (Shift+Enter for a new line)`}
        />
        <button type="submit" className="btn-primary h-11 px-4" disabled={!text.trim() || sending}>
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span>
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex gap-3 px-4 py-3">
          <span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          <span className="flex-1 space-y-2 py-1">
            <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}
