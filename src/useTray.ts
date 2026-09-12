import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { useEffect, useState } from "react";
import {
  type Actions,
  nameOf,
  STOP_MARK,
  subjectLabel,
  subjectMark,
  TOPIC_MARK,
} from "./actions";
import type { TrackingState } from "./core/fold";
import { quit, showMain } from "./desktop";
import { formatStamp } from "./time";
import type { Tracking } from "./useTracking";

/**
 * The tray: the second entry point, offering the same three actions as the quick
 * switcher because the surface boundary is the same. It carries the two things only it
 * can offer — reopening the window and quitting — since the window's close button now
 * leaves the application running for the shortcut.
 *
 * Clicks on a Linux tray icon are not reported to the application; the menu is the
 * whole interaction, which is what Phase 1 counted as two pointer actions.
 */

const TRAY_ID = "konzendi";

/** The menu is rebuilt from the folded state, so it never disagrees with the window. */
async function buildMenu(
  state: TrackingState,
  actions: Actions,
  now: number,
): Promise<Menu> {
  const current = state.current;
  const stopped = current !== null && current.subject.type === "pause";
  const activeTopicId =
    current !== null && current.subject.type === "topic"
      ? current.subject.topicId
      : null;
  const resumeTopicId = stopped ? lastTopicId(state) : null;
  const switchable = state.topics.filter(
    (topic) => !topic.archived && topic.id !== activeTopicId,
  );

  return Menu.new({
    items: [
      {
        id: "state",
        text:
          current === null
            ? "Nothing tracked yet"
            : `${subjectMark(current.subject)} ${subjectLabel(state.topics, current.subject)} · ${stopped ? "since" : "started"} ${formatStamp(current.start, now)}`,
        enabled: false,
      },
      { item: "Separator" },
      ...switchable.map((topic) => ({
        id: `switch:${topic.id}`,
        text: topic.name,
        action: () => void actions.switchTo(topic.id),
      })),
      { item: "Separator" },
      resumeTopicId !== null
        ? {
            id: "resume",
            text: `${TOPIC_MARK} Resume ${nameOf(state.topics, resumeTopicId)}`,
            action: () => void actions.switchTo(resumeTopicId),
          }
        : {
            id: "stop",
            text: `${STOP_MARK} Stop`,
            enabled: current !== null && !stopped,
            action: () => void actions.stop(),
          },
      {
        id: "undo",
        text:
          current === null
            ? "Nothing to undo yet"
            : `Undo last entry (${subjectLabel(state.topics, current.subject)})`,
        enabled: current !== null,
        action: () => {
          if (current !== null) void actions.undo(current.eventId);
        },
      },
      { item: "Separator" },
      { id: "open", text: "Open Konzendi", action: () => void showMain() },
      // Tauri's predefined Quit item is ignored on Linux, so this one is explicit.
      { id: "quit", text: "Quit Konzendi", action: () => void quit() },
    ],
  });
}

/** The topic to resume is the last one tracked before tracking was stopped. */
function lastTopicId(state: TrackingState): string | null {
  for (const interval of [...state.timeline].reverse()) {
    if (interval.subject.type === "topic") return interval.subject.topicId;
  }
  return null;
}

/** The menu the tray is showing, so the one it replaces can be released. */
const shown: { menu: Menu | null } = { menu: null };

export function useTray(tracking: Tracking, actions: Actions): void {
  const [tray, setTray] = useState<TrayIcon | null>(null);

  // One icon for the life of the application; a reload reuses the one already there.
  useEffect(() => {
    let live = true;
    void (async () => {
      const existing = await TrayIcon.getById(TRAY_ID);
      if (!live) return;
      if (existing !== null) {
        setTray(existing);
        return;
      }
      const icon = await defaultWindowIcon();
      // A Linux tray icon is not shown at all until it has a menu, even an empty one.
      const created = await TrayIcon.new({
        id: TRAY_ID,
        icon: icon ?? undefined,
        tooltip: "Konzendi",
        menu: await Menu.new({ items: [] }),
      });
      if (live) setTray(created);
    })();
    return () => {
      live = false;
    };
  }, []);

  const { state } = tracking;
  useEffect(() => {
    if (tray === null) return;
    let live = true;
    void (async () => {
      // The start time is read once per rebuild; a menu holds no ticking clock.
      const menu = await buildMenu(state, actions, Date.now());
      if (!live) {
        await menu.close();
        return;
      }
      const replaced = shown.menu;
      shown.menu = menu;
      await tray.setMenu(menu);
      // The replaced menu is released only once the tray holds the new one.
      if (replaced !== null) await replaced.close().catch(() => undefined);
    })();
    return () => {
      live = false;
    };
  }, [tray, state, actions]);
}
