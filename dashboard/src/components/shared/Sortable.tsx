import type { ReactNode } from "react";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// Drag to reorder. Returns the new id order through onReorder.
export function SortableList<T extends { id: string }>({ items, onReorder, children }: { items: T[]; onReorder: (ids: string[]) => void; children: (item: T) => ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">{items.map((i) => <SortableRow key={i.id} id={i.id}>{children(i)}</SortableRow>)}</div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 rounded border border-border bg-card ${isDragging ? "z-10 shadow-lg" : ""}`}>
      <button type="button" aria-label="Drag to reorder" className="cursor-grab touch-none px-2 py-3 text-muted-foreground hover:text-foreground" {...attributes} {...listeners}><GripVertical className="size-4" /></button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
