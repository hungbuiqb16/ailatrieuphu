"use client";

import { useCallback, type HTMLAttributes } from "react";
import { useDrag, useDrop } from "react-dnd";

export const DRAG_ROW_TYPE = "question-row";

type DragItem = { index: number };

export function DraggableRow({
  index,
  moveRow,
  ...restProps
}: HTMLAttributes<HTMLTableRowElement> & { index: number; moveRow: (from: number, to: number) => void }) {
  const [{ isOver, direction }, drop] = useDrop<DragItem, void, { isOver: boolean; direction: "up" | "down" | null }>({
    accept: DRAG_ROW_TYPE,
    collect: (monitor) => {
      const item = monitor.getItem();
      if (!item || item.index === index) {
        return { isOver: false, direction: null };
      }
      return { isOver: monitor.isOver(), direction: item.index < index ? "down" : "up" };
    },
    drop: (item) => {
      if (item.index !== index) moveRow(item.index, index);
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_ROW_TYPE,
    item: (): DragItem => ({ index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const setRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      drag(drop(node));
    },
    [drag, drop]
  );

  return (
    <tr
      ref={setRef}
      {...restProps}
      style={{
        ...restProps.style,
        cursor: "move",
        opacity: isDragging ? 0.4 : 1,
        borderTop: isOver && direction === "up" ? "2px solid #E8394A" : undefined,
        borderBottom: isOver && direction === "down" ? "2px solid #E8394A" : undefined,
      }}
    />
  );
}
