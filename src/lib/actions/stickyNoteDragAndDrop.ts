import {
  draggable,
  dropTargetForElements,
  monitorForElements,
  type ElementEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preventUnhandled } from "@atlaskit/pragmatic-drag-and-drop/prevent-unhandled";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { StickyNote } from "$lib/api/stickyNotes";
import {
  stickyNoteGroup,
  type StickyNoteDropEdge,
  type StickyNoteGroup,
} from "$lib/stickyNoteOrder";

const stickyNoteDragType = "sticky-note";
const allowedEdges: Edge[] = ["top", "bottom"];

type StickyNoteDragData = {
  type: typeof stickyNoteDragType;
  stickyNoteId: number;
  group: StickyNoteGroup;
};

export type StickyNoteDropTarget = {
  stickyNoteId: number;
  edge: StickyNoteDropEdge;
};

export type StickyNoteDrop = {
  sourceStickyNoteId: number;
  targetStickyNoteId: number;
  edge: StickyNoteDropEdge;
};

type StickyNoteDragMonitorCallbacks = {
  onDragStart: (stickyNoteId: number) => void;
  onDropTargetChange: (target: StickyNoteDropTarget | null) => void;
  onDrop: (drop: StickyNoteDrop) => void;
  onDragEnd: () => void;
};

type StickyNoteActionParameters = {
  stickyNote: StickyNote;
};

function stickyNoteDragData(
  stickyNote: StickyNote,
): StickyNoteDragData & Record<string, unknown> {
  return {
    type: stickyNoteDragType,
    stickyNoteId: stickyNote.id,
    group: stickyNoteGroup(stickyNote),
  };
}

function isStickyNoteDragData(
  data: Record<string | symbol, unknown>,
): data is StickyNoteDragData {
  return (
    data.type === stickyNoteDragType &&
    typeof data.stickyNoteId === "number" &&
    (data.group === "pinned" || data.group === "unpinned")
  );
}

function isStickyNoteDropEdge(edge: Edge | null): edge is StickyNoteDropEdge {
  return edge === "top" || edge === "bottom";
}

function stickyNoteDropTargetFromPayload({
  source,
  location,
}: ElementEventBasePayload): StickyNoteDropTarget | null {
  const target = location.current.dropTargets[0];

  if (!isStickyNoteDragData(source.data) || !target) {
    return null;
  }

  const edge = extractClosestEdge(target.data);

  if (
    !isStickyNoteDragData(target.data) ||
    !isStickyNoteDropEdge(edge) ||
    source.data.group !== target.data.group
  ) {
    return null;
  }

  return {
    stickyNoteId: target.data.stickyNoteId,
    edge,
  };
}

export function monitorStickyNoteDragAndDrop(
  callbacks: StickyNoteDragMonitorCallbacks,
) {
  let lastTargetKey: string | null = null;

  function publishDropTarget(payload: ElementEventBasePayload) {
    const target = stickyNoteDropTargetFromPayload(payload);
    const targetKey = target ? `${target.stickyNoteId}:${target.edge}` : "none";

    if (targetKey === lastTargetKey) {
      return;
    }

    lastTargetKey = targetKey;
    callbacks.onDropTargetChange(target);
  }

  return monitorForElements({
    canMonitor: ({ source }) => isStickyNoteDragData(source.data),
    onDragStart: ({ source }) => {
      if (isStickyNoteDragData(source.data)) {
        preventUnhandled.start();
        callbacks.onDragStart(source.data.stickyNoteId);
      }
    },
    onDropTargetChange: (payload) => {
      publishDropTarget(payload);
    },
    onDrag: (payload) => {
      publishDropTarget(payload);
    },
    onDrop: (payload) => {
      const source = payload.source.data;
      const target = stickyNoteDropTargetFromPayload(payload);

      if (isStickyNoteDragData(source) && target) {
        callbacks.onDrop({
          sourceStickyNoteId: source.stickyNoteId,
          targetStickyNoteId: target.stickyNoteId,
          edge: target.edge,
        });
      }

      lastTargetKey = null;
      callbacks.onDragEnd();
    },
  });
}

export function stickyNoteDragHandle(
  handleElement: HTMLElement,
  initialParameters: StickyNoteActionParameters,
) {
  let parameters = initialParameters;
  const stickyNoteElement = handleElement.closest<HTMLElement>(".sticky-note");

  if (!stickyNoteElement) {
    return;
  }

  function handleDragStart(event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.dropEffect = "move";
    }
  }

  handleElement.addEventListener("dragstart", handleDragStart);

  const cleanup = draggable({
    element: handleElement,
    getInitialData: () => stickyNoteDragData(parameters.stickyNote),
    onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
      if (!nativeSetDragImage) {
        return;
      }

      const stickyNoteRect = stickyNoteElement.getBoundingClientRect();
      const input = location.current.input;

      nativeSetDragImage(
        stickyNoteElement,
        input.clientX - stickyNoteRect.left,
        input.clientY - stickyNoteRect.top,
      );
    },
  });

  return {
    update(nextParameters: StickyNoteActionParameters) {
      parameters = nextParameters;
    },
    destroy() {
      handleElement.removeEventListener("dragstart", handleDragStart);
      cleanup();
    },
  };
}

export function stickyNoteDropTarget(
  dropTargetElement: HTMLElement,
  initialParameters: StickyNoteActionParameters,
) {
  let parameters = initialParameters;

  const cleanup = dropTargetForElements({
    element: dropTargetElement,
    canDrop: ({ source }) =>
      isStickyNoteDragData(source.data) &&
      source.data.group === stickyNoteGroup(parameters.stickyNote),
    getData: ({ input, element }) =>
      attachClosestEdge(stickyNoteDragData(parameters.stickyNote), {
        element,
        input,
        allowedEdges,
      }),
    getDropEffect: () => "move",
  });

  return {
    update(nextParameters: StickyNoteActionParameters) {
      parameters = nextParameters;
    },
    destroy() {
      cleanup();
    },
  };
}
