import { describe, expect, it } from "vitest";
import { trackingActions } from "./actions";
import type { EventDraft } from "./core/tracking";

function recorder() {
  const calls: EventDraft[][] = [];
  const actions = trackingActions(async (...drafts) => {
    calls.push(drafts);
    return true;
  });
  return { actions, calls };
}

describe("trackingActions", () => {
  it("creates a topic in Topics with one topic.created and no focus.started", async () => {
    const { actions, calls } = recorder();
    expect(await actions.create("Reading")).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(1);
    const [draft] = calls[0];
    expect(draft.kind).toBe("topic.created");
    expect(draft.payload).toMatchObject({ name: "Reading" });
  });

  it("gives each created topic a new id", async () => {
    const { actions, calls } = recorder();
    await actions.create("A");
    await actions.create("A");
    const ids = calls.map(
      ([draft]) => (draft.payload as { topicId: string }).topicId,
    );
    expect(new Set(ids).size).toBe(2);
  });

  it("still tracks a topic created in the tracking view", async () => {
    const { actions, calls } = recorder();
    await actions.createAndTrack("Reading");
    expect(calls[0].map((draft) => draft.kind)).toEqual([
      "topic.created",
      "focus.started",
    ]);
  });
});
