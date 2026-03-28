/**
 * Namespaced logging — same idea as Python `logging.getLogger(__name__)` in this repo
 * (e.g. api/services/youtube.py). Do not log secrets (tokens, passwords, cookies).
 */

const PREFIX = "[ai-publishing]";

const isDev = () => process.env.NODE_ENV === "development";

export function getLogger(scope: string) {
  const tag = `${PREFIX} ${scope}`;
  return {
    debug: (msg: string, extra?: Record<string, unknown>) => {
      if (!isDev()) return;
      if (extra !== undefined) console.debug(tag, msg, extra);
      else console.debug(tag, msg);
    },
    info: (msg: string, extra?: Record<string, unknown>) => {
      if (extra !== undefined) console.info(tag, msg, extra);
      else console.info(tag, msg);
    },
    /** Mirrors Python logging.warning */
    warning: (msg: string, err?: unknown) => {
      console.warn(tag, msg, err !== undefined ? err : "");
    },
    error: (msg: string, err?: unknown) => {
      console.error(tag, msg, err !== undefined ? err : "");
    },
  };
}
