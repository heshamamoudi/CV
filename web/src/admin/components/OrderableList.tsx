import { useEffect, useRef, type ReactNode } from 'react';
import { useAdminLang } from '../useAdminLang';

export interface OrderableListProps<T> {
  items: T[];
  id: (item: T) => number;
  label: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** The complete new order, every id, exactly once - what the API expects. */
  onReorder: (ids: number[]) => void;
}

function moved(ids: number[], from: number, to: number): number[] {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Drag to reorder, and buttons that do the same thing - the buttons are what
 * works from a keyboard, on a phone, and in a test.
 */
export function OrderableList<T>({ items, id, label, renderItem, onReorder }: OrderableListProps<T>) {
  const { t } = useAdminLang();
  const dragging = useRef<number | null>(null);
  const justMoved = useRef<{ id: number; direction: 'up' | 'down' } | null>(null);
  const ids = items.map(id);

  // React moves the row's node, which drops focus to the body. Put it back on
  // the button that did the moving, so a keyboard can move an item twice.
  useEffect(() => {
    const moved = justMoved.current;
    if (!moved) return;
    justMoved.current = null;
    const row = items.find(item => id(item) === moved.id);
    if (!row) return;
    const name = `${moved.direction === 'up' ? t('action.up') : t('action.down')}: ${label(row)}`;
    const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${CSS.escape(name)}"]`);
    button?.focus();
  });

  const move = (from: number, to: number, byKeyboard = false) => {
    if (to < 0 || to >= items.length || from === to) return;
    if (byKeyboard) justMoved.current = { id: ids[from], direction: to < from ? 'up' : 'down' };
    onReorder(moved(ids, from, to));
  };

  return (
    <ol className="admin-orderable">
      {items.map((item, index) => (
        <li
          key={id(item)}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            if (dragging.current !== null) move(dragging.current, index);
            dragging.current = null;
          }}
        >
          <div
            className="admin-orderable-controls"
            draggable
            onDragStart={() => {
              dragging.current = index;
            }}
          >
            <button type="button" aria-label={`${t('action.up')}: ${label(item)}`} disabled={index === 0} onClick={() => move(index, index - 1, true)}>
              ↑
            </button>
            <button
              type="button"
              aria-label={`${t('action.down')}: ${label(item)}`}
              disabled={index === items.length - 1}
              onClick={() => move(index, index + 1, true)}
            >
              ↓
            </button>
          </div>
          <div className="admin-orderable-body">{renderItem(item, index)}</div>
        </li>
      ))}
    </ol>
  );
}
