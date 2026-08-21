export type EditorHistory<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createEditorHistory<T>(present: T): EditorHistory<T> {
  return { past: [], present, future: [] };
}

export function commitEditorHistory<T>(
  history: EditorHistory<T>,
  present: T,
  limit = 60,
): EditorHistory<T> {
  if (Object.is(history.present, present)) return history;
  return {
    past: [...history.past, history.present].slice(-limit),
    present,
    future: [],
  };
}

export function undoEditorHistory<T>(
  history: EditorHistory<T>,
): EditorHistory<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEditorHistory<T>(
  history: EditorHistory<T>,
): EditorHistory<T> {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}
