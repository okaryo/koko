<script lang="ts">
  import { onMount, tick } from "svelte";
  import Archive from "@lucide/svelte/icons/archive";
  import GripVertical from "@lucide/svelte/icons/grip-vertical";
  import PinIcon from "@lucide/svelte/icons/pin";
  import PinOff from "@lucide/svelte/icons/pin-off";
  import Plus from "@lucide/svelte/icons/plus";
  import {
    archiveStickyNote as archivePersistedStickyNote,
    createStickyNote as createPersistedStickyNote,
    listStickyNotes,
    pinStickyNote as pinPersistedStickyNote,
    reorderStickyNote as reorderPersistedStickyNote,
    type StickyNote,
    unpinStickyNote as unpinPersistedStickyNote,
    updateStickyNoteBody,
  } from "$lib/api/stickyNotes";
  import { overlayScrollbars } from "$lib/actions/overlayScrollbars";
  import { insertMarkdownListContinuation } from "$lib/editor/textareaMarkdown";
  import { stickyNoteCommandFromKeydown } from "$lib/keyboard";
  import {
    compareStickyNotes,
    stickyNoteGroup,
    stickyNotesInGroup,
    targetPositionForDrop,
    targetPositionForKeyboardMove,
    type StickyNoteMoveDirection,
  } from "$lib/stickyNoteOrder";
  import { scrollAdjustmentToRevealStickyNote } from "$lib/stickyNoteScroll";
  import { disableAutocorrect } from "$lib/textAssist";

  let stickyNotes = $state<StickyNote[]>([]);
  let newStickyNoteBody = $state("");
  let newStickyNoteTextareaElement = $state<HTMLTextAreaElement>();
  let stickyNotesViewportElement = $state<HTMLDivElement>();
  let composerOpen = $state(false);
  let editingStickyNoteId = $state<number | null>(null);
  let editingStickyNoteBody = $state("");
  let draggedStickyNoteId = $state<number | null>(null);
  let dropTarget = $state<{
    stickyNoteId: number;
    targetPosition: number;
    dropAfter: boolean;
  } | null>(null);
  let reorderAnnouncement = $state("");
  let reorderQueue = Promise.resolve();
  let pinnedStickyNotes = $derived(stickyNotesInGroup(stickyNotes, "pinned"));
  let unpinnedStickyNotes = $derived(
    stickyNotesInGroup(stickyNotes, "unpinned"),
  );
  let stickyNoteGroups = $derived(
    [
      { key: "pinned", label: "Pinned", stickyNotes: pinnedStickyNotes },
      {
        key: "unpinned",
        label: "Unpinned",
        stickyNotes: unpinnedStickyNotes,
      },
    ].filter((group) => group.stickyNotes.length > 0),
  );

  onMount(() => {
    void loadStickyNotes().then((loadedStickyNotes) => {
      stickyNotes = loadedStickyNotes;
    });
  });

  async function createStickyNote() {
    const body = newStickyNoteBody.trim();

    if (!body) {
      closeComposer();
      return;
    }

    try {
      await reorderQueue;
      stickyNotes = await createPersistedStickyNote(body, Date.now());

      closeComposer();
    } catch (error) {
      console.warn("StickyNote create failed", error);
    }
  }

  async function openComposer() {
    composerOpen = true;

    await tick();
    newStickyNoteTextareaElement?.focus();
  }

  function closeComposer() {
    composerOpen = false;
    newStickyNoteBody = "";
  }

  function discardComposer() {
    closeComposer();
  }

  async function archiveStickyNote(id: number) {
    try {
      await reorderQueue;
      stickyNotes = await archivePersistedStickyNote(id, Date.now());
    } catch (error) {
      console.warn("StickyNote archive failed", error);
    }
  }

  async function toggleStickyNotePin(stickyNote: StickyNote) {
    try {
      await reorderQueue;
      stickyNotes =
        stickyNote.pinnedAtMs === null
          ? await pinPersistedStickyNote(stickyNote.id, Date.now())
          : await unpinPersistedStickyNote(stickyNote.id, Date.now());
    } catch (error) {
      console.warn("StickyNote pin toggle failed", error);
    }
  }

  type CaretPointDocument = Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  function startEditingStickyNote(
    stickyNote: StickyNote,
    selectionStart = stickyNote.body.length,
  ) {
    const initialScrollTop = stickyNotesViewportElement?.scrollTop;

    editingStickyNoteId = stickyNote.id;
    editingStickyNoteBody = stickyNote.body;

    void tick().then(() => {
      const editTextarea = document.querySelector<HTMLTextAreaElement>(
        `[data-sticky-note-edit-id="${stickyNote.id}"]`,
      );
      const caretOffset = Math.max(
        0,
        Math.min(selectionStart, editTextarea?.value.length ?? 0),
      );

      restoreStickyNotesScrollTop(initialScrollTop);
      editTextarea?.focus({ preventScroll: true });
      editTextarea?.setSelectionRange(caretOffset, caretOffset);
      restoreStickyNotesScrollTop(initialScrollTop);

      requestAnimationFrame(() => {
        restoreStickyNotesScrollTop(initialScrollTop);
      });
    });
  }

  function restoreStickyNotesScrollTop(scrollTop: number | undefined) {
    if (scrollTop === undefined || !stickyNotesViewportElement) {
      return;
    }

    stickyNotesViewportElement.scrollTop = scrollTop;
  }

  function startEditingStickyNoteFromClick(
    event: MouseEvent,
    stickyNote: StickyNote,
  ) {
    const selectionStart = getTextOffsetFromPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );

    startEditingStickyNote(
      stickyNote,
      selectionStart ?? stickyNote.body.length,
    );
  }

  function getTextOffsetFromPoint(
    target: EventTarget | null,
    clientX: number,
    clientY: number,
  ) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const documentWithCaret = document as CaretPointDocument;
    const caretPosition = documentWithCaret.caretPositionFromPoint?.(
      clientX,
      clientY,
    );

    if (caretPosition) {
      return getTextOffset(
        target,
        caretPosition.offsetNode,
        caretPosition.offset,
      );
    }

    const caretRange = documentWithCaret.caretRangeFromPoint?.(
      clientX,
      clientY,
    );

    if (!caretRange) {
      return null;
    }

    return getTextOffset(
      target,
      caretRange.startContainer,
      caretRange.startOffset,
    );
  }

  function getTextOffset(root: HTMLElement, node: Node, offset: number) {
    if (!root.contains(node)) {
      return null;
    }

    const range = document.createRange();
    range.selectNodeContents(root);

    if (node.nodeType === Node.TEXT_NODE) {
      range.setEnd(node, Math.min(offset, node.textContent?.length ?? 0));
    } else {
      range.setEnd(node, Math.min(offset, node.childNodes.length));
    }

    return range.toString().length;
  }

  function stopEditingStickyNote() {
    editingStickyNoteId = null;
    editingStickyNoteBody = "";
  }

  function discardEditingStickyNote() {
    stopEditingStickyNote();
  }

  async function saveEditingStickyNote() {
    if (editingStickyNoteId === null) {
      return;
    }

    try {
      const updatedStickyNote = await updateStickyNoteBody(
        editingStickyNoteId,
        editingStickyNoteBody,
        Date.now(),
      );

      upsertStickyNote(updatedStickyNote);
      stopEditingStickyNote();
    } catch (error) {
      console.warn("StickyNote update failed", error);
    }
  }

  async function loadStickyNotes() {
    try {
      return await listStickyNotes();
    } catch (error) {
      console.warn("Sticky Notes load failed", error);
      return [];
    }
  }

  function upsertStickyNote(updatedStickyNote: StickyNote) {
    const existingStickyNote = stickyNotes.some(
      (stickyNote) => stickyNote.id === updatedStickyNote.id,
    );
    const nextStickyNotes = existingStickyNote
      ? stickyNotes.map((stickyNote) =>
          stickyNote.id === updatedStickyNote.id
            ? updatedStickyNote
            : stickyNote,
        )
      : [updatedStickyNote, ...stickyNotes];

    stickyNotes = [...nextStickyNotes].sort(compareStickyNotes);
  }

  function queueStickyNoteReorder(
    id: number,
    targetPosition: number | (() => number | null),
    restoreHandleFocus: boolean,
  ) {
    reorderQueue = reorderQueue.then(async () => {
      const resolvedTargetPosition =
        typeof targetPosition === "function"
          ? targetPosition()
          : targetPosition;

      if (resolvedTargetPosition === null) {
        return;
      }

      const stickyNote = stickyNotes.find((candidate) => candidate.id === id);

      if (!stickyNote || stickyNote.position === resolvedTargetPosition) {
        return;
      }

      try {
        stickyNotes = await reorderPersistedStickyNote(
          id,
          resolvedTargetPosition,
        );
        announceStickyNotePosition(id);
      } catch (error) {
        console.warn("StickyNote reorder failed", error);
        stickyNotes = await loadStickyNotes();
      }

      if (restoreHandleFocus) {
        await tick();
        document
          .querySelector<HTMLButtonElement>(
            `[data-sticky-note-reorder-id="${id}"]`,
          )
          ?.focus({ preventScroll: true });
      }
    });
  }

  function announceStickyNotePosition(id: number) {
    const stickyNote = stickyNotes.find((candidate) => candidate.id === id);

    if (!stickyNote) {
      return;
    }

    const group = stickyNoteGroup(stickyNote);
    const groupStickyNotes = stickyNotesInGroup(stickyNotes, group);
    const groupLabel = group === "pinned" ? "Pinned" : "Unpinned";

    reorderAnnouncement = `Moved sticky note to position ${
      stickyNote.position + 1
    } of ${groupStickyNotes.length} in ${groupLabel}.`;
  }

  function handleReorderHandleKeydown(
    event: KeyboardEvent,
    stickyNote: StickyNote,
  ) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const direction: StickyNoteMoveDirection =
      event.key === "ArrowUp" ? "up" : "down";

    if (
      targetPositionForKeyboardMove(stickyNotes, stickyNote.id, direction) ===
      null
    ) {
      return;
    }

    queueStickyNoteReorder(
      stickyNote.id,
      () =>
        targetPositionForKeyboardMove(stickyNotes, stickyNote.id, direction),
      true,
    );
  }

  function handleStickyNoteDragStart(event: DragEvent, stickyNote: StickyNote) {
    draggedStickyNoteId = stickyNote.id;
    dropTarget = null;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(stickyNote.id));
    }
  }

  function handleStickyNoteDragOver(
    event: DragEvent,
    targetStickyNote: StickyNote,
  ) {
    const draggedStickyNote = stickyNotes.find(
      (stickyNote) => stickyNote.id === draggedStickyNoteId,
    );

    if (!draggedStickyNote || !(event.currentTarget instanceof HTMLElement)) {
      dropTarget = null;
      return;
    }

    const targetRect = event.currentTarget.getBoundingClientRect();
    const dropAfter = event.clientY >= targetRect.top + targetRect.height / 2;
    const targetPosition = targetPositionForDrop(
      draggedStickyNote,
      targetStickyNote,
      dropAfter,
    );

    if (targetPosition === null) {
      dropTarget = null;

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }

      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    dropTarget =
      targetPosition === draggedStickyNote.position
        ? null
        : {
            stickyNoteId: targetStickyNote.id,
            targetPosition,
            dropAfter,
          };
  }

  function handleStickyNoteDragLeave(event: DragEvent, stickyNoteId: number) {
    if (
      event.currentTarget instanceof HTMLElement &&
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    if (dropTarget?.stickyNoteId === stickyNoteId) {
      dropTarget = null;
    }
  }

  function handleStickyNoteDrop(event: DragEvent) {
    if (draggedStickyNoteId === null || dropTarget === null) {
      return;
    }

    event.preventDefault();
    const id = draggedStickyNoteId;
    const targetPosition = dropTarget.targetPosition;

    clearStickyNoteDrag();
    queueStickyNoteReorder(id, targetPosition, false);
  }

  function clearStickyNoteDrag() {
    draggedStickyNoteId = null;
    dropTarget = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    const stickyNoteCommand = stickyNoteCommandFromKeydown(event);

    if (!stickyNoteCommand) {
      return;
    }

    event.preventDefault();
    void openComposer();
  }

  function handleComposerKeydown(event: KeyboardEvent) {
    if (isTextCompositionKeydown(event)) {
      return;
    }

    if (isSaveShortcut(event)) {
      event.preventDefault();
      void createStickyNote();
      return;
    }

    if (continueMarkdownList(event)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      discardComposer();
    }
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (isTextCompositionKeydown(event)) {
      return;
    }

    if (isSaveShortcut(event)) {
      event.preventDefault();
      void saveEditingStickyNote();
      return;
    }

    if (continueMarkdownList(event)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      discardEditingStickyNote();
    }
  }

  function handleStickyNoteEditTargetKeydown(
    event: KeyboardEvent,
    stickyNote: StickyNote,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    startEditingStickyNote(stickyNote);
  }

  function isSaveShortcut(event: KeyboardEvent) {
    return (
      event.metaKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      event.key === "Enter"
    );
  }

  function isTextCompositionKeydown(event: KeyboardEvent) {
    return (
      event.isComposing || event.key === "Process" || event.keyCode === 229
    );
  }

  function continueMarkdownList(event: KeyboardEvent) {
    if (
      event.key !== "Enter" ||
      event.metaKey ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      !(event.currentTarget instanceof HTMLTextAreaElement)
    ) {
      return false;
    }

    const textarea = event.currentTarget;
    const edit = insertMarkdownListContinuation(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
    );

    if (edit === null) {
      return false;
    }

    event.preventDefault();
    textarea.value = edit.value;
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    return true;
  }

  function autoResizeTextarea(textarea: HTMLTextAreaElement) {
    const resize = () => {
      const initialScrollTop = stickyNotesViewportElement?.scrollTop;

      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;

      if (!textarea.dataset.stickyNoteEditId) {
        return;
      }

      // Resizing a focused textarea can move its scroll container unexpectedly.
      restoreStickyNotesScrollTop(initialScrollTop);
      requestAnimationFrame(() => {
        restoreStickyNotesScrollTop(initialScrollTop);
        revealEditingStickyNote(textarea);
      });
    };
    const animationFrame = requestAnimationFrame(resize);

    textarea.addEventListener("input", resize);

    return {
      destroy() {
        cancelAnimationFrame(animationFrame);
        textarea.removeEventListener("input", resize);
      },
    };
  }

  function revealEditingStickyNote(textarea: HTMLTextAreaElement) {
    const viewport = stickyNotesViewportElement;
    const stickyNote = textarea.closest<HTMLElement>(".sticky-note");

    if (!viewport || !stickyNote) {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const stickyNoteRect = stickyNote.getBoundingClientRect();
    const viewportTop = viewportRect.top + viewport.clientTop;
    const scrollAdjustment = scrollAdjustmentToRevealStickyNote(
      {
        top: viewportTop,
        bottom: viewportTop + viewport.clientHeight,
      },
      {
        top: stickyNoteRect.top,
        bottom: stickyNoteRect.bottom,
      },
    );

    viewport.scrollTop += scrollAdjustment;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section
  class="sticky-notes-panel"
  aria-label="Sticky Notes"
  data-overlayscrollbars-initialize
  use:overlayScrollbars={{ viewport: stickyNotesViewportElement }}
>
  <div class="sticky-notes-viewport" bind:this={stickyNotesViewportElement}>
    <header class="panel-header">
      <h2>Sticky Notes</h2>
      <button
        class="icon-button add-sticky-note-button"
        type="button"
        aria-label="Create sticky note"
        title="Create sticky note"
        onclick={() => void openComposer()}
      >
        <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </header>

    {#if composerOpen}
      <div class="sticky-note sticky-note-composer">
        <textarea
          bind:this={newStickyNoteTextareaElement}
          bind:value={newStickyNoteBody}
          rows="3"
          use:disableAutocorrect
          autocapitalize="off"
          autocomplete="off"
          placeholder="Add a note..."
          spellcheck="false"
          aria-label="New sticky note"
          use:autoResizeTextarea
          onkeydown={handleComposerKeydown}
          onblur={() => void createStickyNote()}></textarea>
      </div>
    {/if}

    {#if stickyNotes.length === 0 && !composerOpen}
      <p class="empty-state">No notes.</p>
    {:else}
      <div class="sticky-note-groups" aria-label="Active sticky notes">
        {#each stickyNoteGroups as group (group.key)}
          <section
            class="sticky-note-group"
            aria-label={`${group.label} sticky notes`}
          >
            <div class="sticky-note-list" role="list">
              {#each group.stickyNotes as stickyNote (stickyNote.id)}
                <div
                  id={`sticky-note-${stickyNote.id}`}
                  role="listitem"
                  class={`sticky-note ${
                    editingStickyNoteId !== stickyNote.id
                      ? "sticky-note-display"
                      : ""
                  } ${
                    stickyNote.pinnedAtMs !== null ? "sticky-note-pinned" : ""
                  } ${
                    draggedStickyNoteId === stickyNote.id
                      ? "sticky-note-dragging"
                      : ""
                  } ${
                    dropTarget?.stickyNoteId === stickyNote.id
                      ? dropTarget.dropAfter
                        ? "sticky-note-drop-after"
                        : "sticky-note-drop-before"
                      : ""
                  }`}
                  ondragover={(event) =>
                    handleStickyNoteDragOver(event, stickyNote)}
                  ondragleave={(event) =>
                    handleStickyNoteDragLeave(event, stickyNote.id)}
                  ondrop={handleStickyNoteDrop}
                >
                  {#if editingStickyNoteId === stickyNote.id}
                    <textarea
                      data-sticky-note-edit-id={stickyNote.id}
                      bind:value={editingStickyNoteBody}
                      rows="3"
                      use:disableAutocorrect
                      autocapitalize="off"
                      autocomplete="off"
                      spellcheck="false"
                      aria-label="Edit sticky note"
                      use:autoResizeTextarea
                      onclick={(event) => event.stopPropagation()}
                      onkeydown={handleEditKeydown}
                      onblur={() => void saveEditingStickyNote()}></textarea>
                  {:else}
                    <div
                      class="sticky-note-edit-button"
                      aria-label="Edit sticky note"
                      role="button"
                      tabindex="0"
                      onclick={(event) =>
                        startEditingStickyNoteFromClick(event, stickyNote)}
                      onkeydown={(event) =>
                        handleStickyNoteEditTargetKeydown(event, stickyNote)}
                    >
                      <p>{stickyNote.body}</p>
                    </div>
                    <div class="sticky-note-actions">
                      <button
                        class="icon-button sticky-note-action-button sticky-note-reorder-handle"
                        type="button"
                        draggable="true"
                        data-sticky-note-reorder-id={stickyNote.id}
                        aria-label="Reorder sticky note"
                        aria-keyshortcuts="ArrowUp ArrowDown"
                        title="Drag or use arrow keys to reorder"
                        onclick={(event) => event.stopPropagation()}
                        onkeydown={(event) =>
                          handleReorderHandleKeydown(event, stickyNote)}
                        ondragstart={(event) =>
                          handleStickyNoteDragStart(event, stickyNote)}
                        ondragend={clearStickyNoteDrag}
                      >
                        <GripVertical
                          size={14}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        class={`icon-button sticky-note-action-button ${
                          stickyNote.pinnedAtMs !== null
                            ? "sticky-note-action-button-active"
                            : ""
                        }`}
                        type="button"
                        aria-label={stickyNote.pinnedAtMs === null
                          ? "Pin sticky note"
                          : "Unpin sticky note"}
                        title={stickyNote.pinnedAtMs === null
                          ? "Pin sticky note"
                          : "Unpin sticky note"}
                        onclick={(event) => {
                          event.stopPropagation();
                          void toggleStickyNotePin(stickyNote);
                        }}
                      >
                        {#if stickyNote.pinnedAtMs === null}
                          <PinIcon
                            size={14}
                            strokeWidth={2.2}
                            aria-hidden="true"
                          />
                        {:else}
                          <PinOff
                            size={14}
                            strokeWidth={2.2}
                            aria-hidden="true"
                          />
                        {/if}
                      </button>
                      <button
                        class="icon-button sticky-note-action-button"
                        type="button"
                        aria-label="Archive sticky note"
                        title="Archive sticky note"
                        onclick={(event) => {
                          event.stopPropagation();
                          void archiveStickyNote(stickyNote.id);
                        }}
                      >
                        <Archive
                          size={14}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {/if}

    <p class="visually-hidden" aria-live="polite">
      {reorderAnnouncement}
    </p>
  </div>
</section>

<style>
  .sticky-notes-panel {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex: 1;
    padding: 0.9rem;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: #fffcf6;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .sticky-notes-viewport {
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: 100%;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 12px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 720;
    line-height: 1.1;
  }

  .icon-button {
    display: inline-flex;
    width: 34px;
    min-width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: #4a4438;
  }

  .icon-button:hover {
    background: rgba(74, 68, 56, 0.08);
    color: #20211f;
  }

  .sticky-note-groups,
  .sticky-note-group,
  .sticky-note-list {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex: 0 0 auto;
    flex-direction: column;
  }

  .sticky-note-groups {
    gap: 10px;
  }

  .sticky-note-group {
    gap: 0;
  }

  .sticky-note-list {
    gap: 10px;
    overflow: visible;
  }

  .sticky-note {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 82px;
    padding: 12px;
    box-shadow: 0 4px 10px rgba(65, 52, 22, 0.08);
    border-radius: 6px;
    background: #ffe37a;
    cursor: text;
    overflow: hidden;
  }

  .sticky-note-dragging {
    opacity: 0.48;
  }

  .sticky-note-drop-before {
    box-shadow:
      inset 0 3px 0 #6d7d54,
      0 4px 10px rgba(65, 52, 22, 0.08);
  }

  .sticky-note-drop-after {
    box-shadow:
      inset 0 -3px 0 #6d7d54,
      0 4px 10px rgba(65, 52, 22, 0.08);
  }

  .sticky-note-display {
    padding: 0;
  }

  .sticky-note-pinned {
    border-color: rgba(89, 113, 62, 0.34);
  }

  .sticky-note-edit-button {
    display: block;
    width: 100%;
    min-height: 80px;
    padding: 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: text;
  }

  .sticky-note-edit-button:focus-visible {
    outline: 2px solid rgba(89, 113, 62, 0.28);
    outline-offset: -3px;
  }

  .sticky-note-edit-button:hover {
    background: transparent;
    color: inherit;
  }

  .sticky-note-pinned::before {
    position: absolute;
    right: 0;
    top: 0;
    z-index: 2;
    width: 16px;
    height: 16px;
    border-radius: 0 0 0 4px;
    background: linear-gradient(
      45deg,
      #c99f24,
      #c99f24 50%,
      #fffcf6 50%,
      #fffcf6
    );
    content: "";
    pointer-events: none;
  }

  .sticky-note-pinned::after {
    position: absolute;
    top: -4px;
    right: -10px;
    z-index: 3;
    width: 34px;
    height: 14px;
    border-top-left-radius: 0;
    background: transparent;
    content: "";
    pointer-events: none;
    transform: rotate(45deg);
  }

  .sticky-note-composer {
    flex: 0 0 auto;
  }

  .sticky-note p,
  .empty-state {
    margin: 0;
    color: #4a4438;
    font-size: 0.9rem;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .sticky-note-action-button {
    width: 28px;
    min-width: 28px;
    height: 28px;
    background: rgba(255, 246, 188, 0.72);
    cursor: pointer;
  }

  .sticky-note-action-button-active,
  .sticky-note-action-button-active:hover {
    background: rgba(89, 113, 62, 0.14);
    color: #2f3f24;
  }

  .sticky-note-reorder-handle {
    cursor: grab;
  }

  .sticky-note-reorder-handle:active {
    cursor: grabbing;
  }

  .sticky-note textarea {
    min-height: 78px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #4a4438;
    line-height: 1.45;
    font-size: 0.9rem;
    overflow: hidden;
    overflow-wrap: anywhere;
    resize: none;
  }

  .sticky-note textarea:focus-visible {
    outline: none;
  }

  .sticky-note textarea::placeholder {
    color: #6b614f;
    opacity: 1;
  }

  .sticky-note-actions {
    position: absolute;
    z-index: 4;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .sticky-note:hover .sticky-note-actions,
  .sticky-note:focus-within .sticky-note-actions {
    opacity: 1;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    border: 0;
    clip: rect(0 0 0 0);
    overflow: hidden;
    white-space: nowrap;
  }
</style>
