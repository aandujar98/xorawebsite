"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { FriendRow } from "@/components/friends/FriendRow";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { FriendsList } from "@/types/account";

export function FriendsView() {
  const [list, setList] = useState<FriendsList | "loading" | "error">("loading");
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "info">("error");

  useEffect(() => {
    let cancelled = false;
    void apiRequest<FriendsList>("/api/friends")
      .then((next) => {
        if (!cancelled) {
          setList(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setList("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const next = await apiRequest<FriendsList>("/api/friends", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setList(next);
      setUsername("");
      setTone("info");
      setMessage("Friend request sent.");
    } catch (error) {
      setTone("error");
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
      );
    } finally {
      setPending(false);
    }
  }

  if (list === "loading") {
    return (
      <section className="glass auth-card" aria-busy="true">
        <p>Loading your friends list...</p>
      </section>
    );
  }

  if (list === "error") {
    return (
      <section className="glass auth-card">
        <h1>Friends</h1>
        <p className="banner">{FRIENDLY_ERROR_MESSAGES.SERVER_UNAVAILABLE}</p>
      </section>
    );
  }

  const data = list;

  return (
    <div className="stack">
      <section className="glass">
        <p className="eyebrow">XOrA Network</p>
        <h1>Friends</h1>
        <p className="muted">
          Find people by their XOrA Network username. Requests use Nakama, so they
          will also show up in XOrA.
        </p>
        <form className="auth-form" onSubmit={onAdd}>
          <Field id="friend-username" label="Add by username">
            <input
              id="friend-username"
              name="username"
              value={username}
              autoComplete="off"
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>
          <AuthMessage message={message} tone={tone} />
          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={pending || !username.trim()}>
              {pending ? "Sending..." : "Add Friend"}
            </button>
          </div>
        </form>
      </section>

      {data.incoming.length > 0 ? (
        <section className="glass">
          <h2>Requests</h2>
          <ul className="friend-list">
            {data.incoming.map((entry) => (
              <FriendRow
                key={entry.username}
                entry={entry}
                onChanged={setList}
                actions={["accept", "remove"]}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="glass">
        <h2>Friends list</h2>
        {data.friends.length === 0 ? (
          <p className="muted">No friends yet. Add someone by username to get started.</p>
        ) : (
          <ul className="friend-list">
            {data.friends.map((entry) => (
              <FriendRow
                key={entry.username}
                entry={entry}
                onChanged={setList}
                actions={["remove"]}
              />
            ))}
          </ul>
        )}
      </section>

      {data.outgoing.length > 0 ? (
        <section className="glass">
          <h2>Sent requests</h2>
          <ul className="friend-list">
            {data.outgoing.map((entry) => (
              <FriendRow
                key={entry.username}
                entry={entry}
                onChanged={setList}
                actions={["remove"]}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
