import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Image } from "@tauri-apps/api/image";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Actions,
  nameOf,
  STOP_MARK,
  subjectLabel,
  subjectMark,
  TOPIC_MARK,
} from "./actions";
import trayIconUrl from "./assets/konzendi-tray-32.png";
import {
  chipPrivate,
  chipVisible,
  onChipPreferences,
  setChipPrivate,
  setChipVisible,
} from "./chip";
import type { TrackingState } from "./core/fold";
import { quit, showMain, windowSystem } from "./desktop";
import { supportsChip } from "./platform";
import { formatStamp } from "./time";
import type { Tracking } from "./useTracking";

/** How long the tray keeps showing a brief-selection correction. */
const TRAY_CORRECTION_MS = 3000;

function trayCorrectionText(
  topics: TrackingState["topics"],
  topicId: string,
): string {
  return `Konzendi — brief switch to ${nameOf(topics, topicId)} ignored`;
}

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
  onSwitch: (topicId: string) => void,
  now: number,
  storageAvailable: boolean,
  correction: string | null,
  chipSupported: boolean,
  refresh: () => void,
): Promise<Menu> {
  const chipShown = chipVisible();
  const chipHidden = chipPrivate();
  const chipItems = chipSupported
    ? [
        {
          id: "chip",
          text: chipShown ? "Hide tracking chip" : "Show tracking chip",
          action: () => void setChipVisible(!chipShown).then(refresh),
        },
        {
          id: "chip-private",
          text: chipHidden ? "Show topic on chip" : "Hide topic on chip",
          enabled: chipShown,
          action: () => {
            setChipPrivate(!chipHidden);
            refresh();
          },
        },
      ]
    : [];
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
      // Shown, disabled, whenever the menu opens during the short correction window;
      // the tray has no event for "menu is opening" to gate this more precisely.
      ...(correction !== null
        ? [
            { id: "correction", text: correction, enabled: false },
            { item: "Separator" as const },
          ]
        : []),
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
        enabled: storageAvailable,
        action: () => onSwitch(topic.id),
      })),
      { item: "Separator" },
      resumeTopicId !== null
        ? {
            id: "resume",
            text: `${TOPIC_MARK} Resume ${nameOf(state.topics, resumeTopicId)}`,
            enabled: storageAvailable,
            action: () => onSwitch(resumeTopicId),
          }
        : {
            id: "stop",
            text: `${STOP_MARK} Stop`,
            enabled: storageAvailable && current !== null && !stopped,
            action: () => void actions.stop(),
          },
      {
        id: "undo",
        text:
          current === null
            ? "Nothing to undo yet"
            : `Undo last entry (${subjectLabel(state.topics, current.subject)})`,
        enabled: storageAvailable && current !== null,
        action: () => {
          if (current !== null) void actions.undo(current.eventId);
        },
      },
      { item: "Separator" },
      { id: "open", text: "Open Konzendi", action: () => void showMain() },
      ...chipItems,
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

/**
 * The Konzendi logo, exported by `npm run logo:export`. If it cannot be loaded, the tray
 * keeps the generated application icon, so a broken asset never removes the tray.
 */
async function trayIcon(): Promise<Image | null> {
  try {
    const response = await fetch(trayIconUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await Image.fromBytes(await response.arrayBuffer());
  } catch (failure) {
    console.error(
      `Could not load the tray logo, using the application icon: ${String(failure)}`,
    );
    return defaultWindowIcon();
  }
}

/** The menu the tray is showing, so the one it replaces can be released. */
const shown: { menu: Menu | null } = { menu: null };

export function useTray(tracking: Tracking, actions: Actions): void {
  const [tray, setTray] = useState<TrayIcon | null>(null);
  const [correction, setCorrection] = useState<string | null>(null);
  const correctionTimer = useRef<number | null>(null);
  const { state } = tracking;
  // The tracking chip is offered only on X11. Its preferences can change in the chip
  // window too, so a change there rebuilds the menu here. A chip that was shown when the
  // application ended is shown again at startup.
  const [chipSupported, setChipSupported] = useState(false);
  const [chipVersion, setChipVersion] = useState(0);
  const refreshChip = useCallback(() => setChipVersion((n) => n + 1), []);
  useEffect(() => onChipPreferences(refreshChip), [refreshChip]);
  useEffect(() => {
    void windowSystem().then((system) => {
      const supported = supportsChip(system);
      setChipSupported(supported);
      if (supported && chipVisible()) void setChipVisible(true);
    });
  }, []);

  const onSwitch = useCallback(
    (topicId: string) => {
      void actions.switchTo(topicId, state).then((result) => {
        if (result.status !== "corrected") return;
        setCorrection(trayCorrectionText(state.topics, result.topicId));
        if (correctionTimer.current !== null) {
          window.clearTimeout(correctionTimer.current);
        }
        correctionTimer.current = window.setTimeout(() => {
          setCorrection(null);
        }, TRAY_CORRECTION_MS);
      });
    },
    [actions, state],
  );

  useEffect(
    () => () => {
      if (correctionTimer.current !== null) {
        window.clearTimeout(correctionTimer.current);
      }
    },
    [],
  );

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
      const icon = await trayIcon();
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

  const { error } = tracking;
  // biome-ignore lint/correctness/useExhaustiveDependencies: chipVersion asks for a rebuild.
  useEffect(() => {
    if (tray === null) return;
    let live = true;
    void (async () => {
      // The start time is read once per rebuild; a menu holds no ticking clock.
      const menu = await buildMenu(
        state,
        actions,
        onSwitch,
        Date.now(),
        error === null,
        correction,
        chipSupported,
        refreshChip,
      );
      if (!live) {
        await menu.close();
        return;
      }
      const replaced = shown.menu;
      shown.menu = menu;
      await tray.setMenu(menu);
      await tray.setTooltip(correction ?? "Konzendi");
      // The replaced menu is released only once the tray holds the new one.
      if (replaced !== null) await replaced.close().catch(() => undefined);
    })();
    return () => {
      live = false;
    };
    // chipVersion only asks for a rebuild; buildMenu reads the preferences itself.
  }, [
    tray,
    state,
    actions,
    onSwitch,
    error,
    correction,
    chipSupported,
    refreshChip,
    chipVersion,
  ]);
}
