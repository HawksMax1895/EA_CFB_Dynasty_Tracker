import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

interface SortableTeamRowProps {
  team: { team_id: number };
  index: number;
  children: React.ReactNode;
}

export default function SortableTeamRow({ team, index, children }: SortableTeamRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.team_id });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {children}
      <button
        className="ml-4 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        type="button"
        {...attributes}
        {...listeners}
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>
    </div>
  );
}
