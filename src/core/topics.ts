import type { Topic } from "./fold";
import { isQuickKey, type QuickKey } from "./tracking";

/** The topics that a switch list offers, split by quick key. */
export interface TopicChoices {
  /** Active topics that hold a key, in key order. A missing digit leaves no gap. */
  assigned: readonly Topic[];
  /** Active topics without a key, in creation order. */
  unassigned: readonly Topic[];
}

/** Split the active topics. Archived topics are in neither list. */
export function topicChoices(topics: readonly Topic[]): TopicChoices {
  const active = topics.filter((topic) => !topic.archived);
  return {
    assigned: active
      .filter((topic) => topic.quickKey !== null)
      .sort((a, b) => (a.quickKey ?? 0) - (b.quickKey ?? 0)),
    unassigned: active.filter((topic) => topic.quickKey === null),
  };
}

/** The topic that holds a key now, or null when the key is free. */
export function keyOwner(
  topics: readonly Topic[],
  key: QuickKey,
): Topic | null {
  return (
    topics.find((topic) => !topic.archived && topic.quickKey === key) ?? null
  );
}

/**
 * The topic that a pressed key selects. Only the literal characters `1` to `9` are
 * keys; a digit that no topic holds selects nothing.
 */
export function topicForKey(
  topics: readonly Topic[],
  pressed: string,
): Topic | null {
  if (!/^[1-9]$/.test(pressed)) return null;
  const key = Number(pressed);
  return isQuickKey(key) ? keyOwner(topics, key) : null;
}
