"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { EMPTY_FORM_DATA, type FieldKey, type NdaFormData } from "@/lib/types";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ChatFieldsResponse = Partial<Record<FieldKey, string | null>>;
type ChatResponse = { reply: string; fields: ChatFieldsResponse };

function mergeFields(current: NdaFormData, incoming: ChatFieldsResponse): NdaFormData {
  const next = { ...current };
  for (const key of Object.keys(EMPTY_FORM_DATA) as FieldKey[]) {
    const value = incoming[key];
    if (typeof value === "string" && value.trim().length > 0) {
      next[key] = value;
    }
  }
  return next;
}

function MessageBlock({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className="space-y-1">
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
          isUser ? "text-ink-soft" : "text-stamp"
        }`}
      >
        {isUser ? "You" : "Assistant"}
      </p>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{message.content}</p>
    </div>
  );
}

export function ChatPanel({
  fields,
  onFieldsChange,
}: {
  fields: NdaFormData;
  onFieldsChange: (fields: NdaFormData) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fieldsRef = useRef(fields);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/chat/greeting"))
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load greeting");
        return response.json() as Promise<ChatResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setMessages([{ role: "assistant", content: data.reply }]);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the assistant. Try refreshing the page.");
      })
      .finally(() => {
        if (!cancelled) setIsSending(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch(apiUrl("/api/chat/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, fields: fieldsRef.current }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data: ChatResponse = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
      onFieldsChange(mergeFields(fieldsRef.current, data.fields));
    } catch {
      setError("Something went wrong reaching the assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-stamp">Chat</p>

      <div ref={scrollRef} className="mt-4 max-h-[24rem] space-y-4 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <MessageBlock key={index} message={message} />
        ))}
        {isSending && (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-pad-muted-2">
            {messages.length === 0 ? "Connecting…" : "Assistant is typing…"}
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-blank-text">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2 border-t border-pad-line pt-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tell me about the agreement…"
          disabled={isSending}
          className="min-w-0 flex-1 border-0 border-b border-pad-line bg-transparent px-0 py-1.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-stamp focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="whitespace-nowrap bg-stamp px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-stamp-soft disabled:cursor-wait disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
