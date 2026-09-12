import { useCallback, useEffect, useState } from "react";
import {
  isWindowMaximized,
  onWindowResized,
  toggleWindowMaximized,
} from "./desktop";

/**
 * Whether the tracking window is maximised. The title bar shows restore in place of
 * maximise, and the frame drops its resize edges, because a maximised window does not
 * resize from its edges.
 */
export function useWindowMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const next = await isWindowMaximized();
      if (mounted) setMaximized(next);
    };
    void refresh();
    const subscription = onWindowResized(refresh);
    return () => {
      mounted = false;
      void subscription.then((unlisten) => unlisten());
    };
  }, []);

  const toggleMaximized = useCallback(async () => {
    setMaximized(await toggleWindowMaximized());
  }, []);

  return { maximized, toggleMaximized };
}
