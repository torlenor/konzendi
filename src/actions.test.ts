import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BRIEF_SELECTION_THRESHOLD_MS,
  briefCorrectionMessage,
  trackingActions,
} from "./actions";
import type { Entry, Interval, Topic, TrackingState } from "./core/fold";
import type { EventDraft } from "./core/tracking";

function recorder(succeeds = true) {
  const calls: EventDraft[][] = [];
  const actions = trackingActions(async (...drafts) => {
    calls.push(drafts);
    return succeeds;
  });
  return { actions, calls };
}

const topic = (id: string, name = id): Topic => ({
  id,
  name,
  archived: false,
  quickKey: null,
  color: null,
});

/** A direct-selection entry, the only kind eligible for the brief correction. */
function directEntry(
  id: string,
  topicId: string,
  effectiveAt: string,
  retimed = false,
): Entry {
  return {
    id,
    subject: { type: "topic", topicId },
    effectiveAt,
    recordedAt: effectiveAt,
    retimed,
    revoked: false,
    revokedBy: [],
    directSelection: true,
    correctedAsBriefSelection: false,
  };
}

/** A missed switch: the same shape, but never eligible for automatic correction. */
function missedEntry(id: string, topicId: string, effectiveAt: string): Entry {
  return { ...directEntry(id, topicId, effectiveAt), directSelection: false };
}

function interval(
  eventId: string,
  topicId: string,
  start: string,
  end: string | null = null,
): Interval {
  return { eventId, subject: { type: "topic", topicId }, start, end };
}

function stateOf(
  topics: Topic[],
  entries: Entry[],
  timeline: Interval[],
): TrackingState {
  return { topics, entries, timeline, current: timeline.at(-1) ?? null };
}

const T0 = "2026-09-18T10:00:00.000Z";
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();

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
});

describe("brief topic selection correction", () => {
  const topics = [
    topic("a", "Topic A"),
    topic("b", "Topic B"),
    topic("c", "Topic C"),
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(T0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("corrects a direct selection just under the threshold", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("b1", "b", at(0))],
      [interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(BRIEF_SELECTION_THRESHOLD_MS - 1)));
    const result = await actions.switchTo("c", state);
    expect(result).toEqual({ status: "corrected", topicId: "b" });
    expect(calls[0].map((draft) => draft.kind)).toEqual([
      "entry.revoked",
      "focus.started",
    ]);
    expect(calls[0][0].payload).toMatchObject({
      targetId: "b1",
      reason: "brief-topic-selection",
    });
    expect(calls[0][1].payload).toMatchObject({
      topicId: "c",
      origin: "direct-selection",
    });
  });

  it("lets a direct selection at the threshold stand", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("b1", "b", at(0))],
      [interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(BRIEF_SELECTION_THRESHOLD_MS)));
    const result = await actions.switchTo("c", state);
    expect(result).toEqual({ status: "switched" });
    expect(calls[0].map((draft) => draft.kind)).toEqual(["focus.started"]);
    expect(calls[0][0].payload).toMatchObject({ topicId: "c" });
  });

  it("returns to the preceding topic by revoking the brief selection alone", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("a1", "a", at(-10_000)), directEntry("b1", "b", at(0))],
      [interval("a1", "a", at(-10_000), at(0)), interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(1000)));
    const result = await actions.switchTo("a", state);
    expect(result).toEqual({ status: "corrected", topicId: "b" });
    expect(calls[0]).toHaveLength(1);
    expect(calls[0][0]).toMatchObject({
      kind: "entry.revoked",
      payload: { targetId: "b1", reason: "brief-topic-selection" },
    });
  });

  it("corrects the next brief selection the same way, continuing from the same preceding topic", async () => {
    // As if b1 was already corrected: a1 now runs straight through to c1.
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("a1", "a", at(-10_000)), directEntry("c1", "c", at(0))],
      [interval("a1", "a", at(-10_000), at(0)), interval("c1", "c", at(0))],
    );
    vi.setSystemTime(new Date(at(500)));
    const result = await actions.switchTo("b", state);
    expect(result).toEqual({ status: "corrected", topicId: "c" });
    expect(calls[0].map((draft) => draft.kind)).toEqual([
      "entry.revoked",
      "focus.started",
    ]);
    expect(calls[0][0].payload).toMatchObject({ targetId: "c1" });
    expect(calls[0][1].payload).toMatchObject({ topicId: "b" });
  });

  it("does not correct when the same running topic is reselected", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("b1", "b", at(0))],
      [interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(100)));
    const result = await actions.switchTo("b", state);
    expect(result).toEqual({ status: "switched" });
    expect(calls[0].map((draft) => draft.kind)).toEqual(["focus.started"]);
  });

  it("does not correct a stop, however briefly the topic before it ran", async () => {
    const { actions, calls } = recorder();
    await actions.stop();
    expect(calls[0]).toHaveLength(1);
    expect(calls[0][0].kind).toBe("focus.paused");
  });

  it("does not correct a missed switch, however recent", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [missedEntry("m1", "b", at(0))],
      [interval("m1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(100)));
    const result = await actions.switchTo("c", state);
    expect(result).toEqual({ status: "switched" });
    expect(calls[0].map((draft) => draft.kind)).toEqual(["focus.started"]);
  });

  it("does not correct a retimed entry, however recent its corrected start", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("b1", "b", at(0), true)],
      [interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(100)));
    const result = await actions.switchTo("c", state);
    expect(result).toEqual({ status: "switched" });
    expect(calls[0].map((draft) => draft.kind)).toEqual(["focus.started"]);
  });

  it("create-and-track corrects a brief predecessor between the creation and the switch", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(
      topics,
      [directEntry("b1", "b", at(0))],
      [interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(100)));
    const result = await actions.createAndTrack("New topic", state);
    expect(result).toMatchObject({ status: "corrected", topicId: "b" });
    expect(calls[0].map((draft) => draft.kind)).toEqual([
      "topic.created",
      "entry.revoked",
      "focus.started",
    ]);
  });

  it("create-and-track appends only the creation and the switch with no brief predecessor", async () => {
    const { actions, calls } = recorder();
    const state = stateOf(topics, [], []);
    const result = await actions.createAndTrack("New topic", state);
    expect(result).toEqual({ status: "switched" });
    expect(calls[0].map((draft) => draft.kind)).toEqual([
      "topic.created",
      "focus.started",
    ]);
  });

  it("reports a storage failure without claiming a correction", async () => {
    const { actions, calls } = recorder(false);
    const state = stateOf(
      topics,
      [directEntry("b1", "b", at(0))],
      [interval("b1", "b", at(0))],
    );
    vi.setSystemTime(new Date(at(100)));
    const switchResult = await actions.switchTo("c", state);
    expect(switchResult).toEqual({ status: "failed" });
    const createResult = await actions.createAndTrack("New topic", state);
    expect(createResult).toEqual({ status: "failed" });
    expect(calls).toHaveLength(2);
  });

  it("names the corrected topic in the shared feedback message", () => {
    expect(briefCorrectionMessage(topics, "b")).toBe(
      "Brief switch to Topic B ignored.",
    );
  });
});

describe("trackingActions: create-and-track (legacy signature check)", () => {
  it("still tracks a topic created in the tracking view", async () => {
    const { actions, calls } = recorder();
    const state = stateOf([], [], []);
    await actions.createAndTrack("Reading", state);
    expect(calls[0].map((draft) => draft.kind)).toEqual([
      "topic.created",
      "focus.started",
    ]);
  });
});
