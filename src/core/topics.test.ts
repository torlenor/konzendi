import { describe, expect, it } from "vitest";
import type { Topic } from "./fold";
import { keyOwner, topicChoices, topicForKey } from "./topics";
import type { QuickKey } from "./tracking";

const topic = (
  id: string,
  quickKey: QuickKey | null = null,
  archived = false,
): Topic => ({ id, name: id, archived, quickKey, color: null });

const ids = (topics: readonly Topic[]) => topics.map((item) => item.id);

describe("topicChoices", () => {
  it("orders assigned topics by key and leaves no slot for a missing key", () => {
    const topics = [topic("c", 9), topic("x"), topic("a", 1), topic("b", 3)];
    const { assigned, unassigned } = topicChoices(topics);
    expect(ids(assigned)).toEqual(["a", "b", "c"]);
    expect(ids(unassigned)).toEqual(["x"]);
  });

  it("keeps unassigned topics in creation order and leaves out archived ones", () => {
    const topics = [
      topic("first"),
      topic("gone", null, true),
      topic("second"),
      topic("keyed", 2),
    ];
    expect(ids(topicChoices(topics).unassigned)).toEqual(["first", "second"]);
  });

  it("handles no topics and topics with no keys", () => {
    expect(topicChoices([])).toEqual({ assigned: [], unassigned: [] });
    const { assigned, unassigned } = topicChoices([topic("a"), topic("b")]);
    expect(assigned).toEqual([]);
    expect(ids(unassigned)).toEqual(["a", "b"]);
  });
});

describe("topicForKey and keyOwner", () => {
  const topics = [topic("a", 1), topic("b", 3), topic("c", 9)];

  it("selects the owner of a literal digit and nothing for an unused one", () => {
    expect(topicForKey(topics, "1")?.id).toBe("a");
    expect(topicForKey(topics, "3")?.id).toBe("b");
    expect(topicForKey(topics, "9")?.id).toBe("c");
    expect(topicForKey(topics, "2")).toBeNull();
  });

  it("selects nothing for keys that are not the digits 1 to 9", () => {
    for (const pressed of ["0", "10", "!", "a", " 1", "Enter", "", "1.0"]) {
      expect(topicForKey(topics, pressed)).toBeNull();
    }
  });

  it("reports the owner of a key", () => {
    expect(keyOwner(topics, 3)?.id).toBe("b");
    expect(keyOwner(topics, 4)).toBeNull();
  });
});
