<script lang="ts">
  import { onMount, tick } from "svelte";
  import Archive from "@lucide/svelte/icons/archive";
  import Plus from "@lucide/svelte/icons/plus";
  import {
    archivePin as archivePersistedPin,
    createPin as createPersistedPin,
    listPins,
    type Pin,
    updatePinBody,
  } from "$lib/api/pins";
  import { pinCommandFromKeydown } from "$lib/keyboard";
  import { disableAutocorrect } from "$lib/textAssist";

  let pins = $state<Pin[]>([]);
  let newPinBody = $state("");
  let newPinTextareaElement = $state<HTMLTextAreaElement>();
  let composerOpen = $state(false);
  let editingPinId = $state<number | null>(null);
  let editingPinBody = $state("");

  onMount(() => {
    void loadPins().then((loadedPins) => {
      pins = loadedPins;
    });
  });

  async function createPin() {
    const body = newPinBody.trim();

    if (!body) {
      closeComposer();
      return;
    }

    try {
      const pin = await createPersistedPin(body, Date.now());

      pins = [pin, ...pins];
      closeComposer();
    } catch (error) {
      console.warn("Pin create failed", error);
    }
  }

  async function openComposer() {
    composerOpen = true;

    await tick();
    newPinTextareaElement?.focus();
  }

  function closeComposer() {
    composerOpen = false;
    newPinBody = "";
  }

  function discardComposer() {
    closeComposer();
  }

  async function archivePin(id: number) {
    try {
      await archivePersistedPin(id, Date.now());
      pins = pins.filter((pin) => pin.id !== id);
    } catch (error) {
      console.warn("Pin archive failed", error);
    }
  }

  function startEditingPin(pin: Pin) {
    editingPinId = pin.id;
    editingPinBody = pin.body;

    void tick().then(() => {
      const editTextarea = document.querySelector<HTMLTextAreaElement>(
        `[data-pin-edit-id="${pin.id}"]`,
      );

      editTextarea?.focus();
      editTextarea?.setSelectionRange(
        editTextarea.value.length,
        editTextarea.value.length,
      );
    });
  }

  function stopEditingPin() {
    editingPinId = null;
    editingPinBody = "";
  }

  function discardEditingPin() {
    stopEditingPin();
  }

  async function saveEditingPin() {
    if (editingPinId === null) {
      return;
    }

    try {
      const updatedPin = await updatePinBody(
        editingPinId,
        editingPinBody,
        Date.now(),
      );

      pins = pins.map((pin) => (pin.id === updatedPin.id ? updatedPin : pin));
      stopEditingPin();
    } catch (error) {
      console.warn("Pin update failed", error);
    }
  }

  async function loadPins() {
    try {
      return await listPins();
    } catch (error) {
      console.warn("Pins load failed", error);
      return [];
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const pinCommand = pinCommandFromKeydown(event);

    if (!pinCommand) {
      return;
    }

    event.preventDefault();
    void openComposer();
  }

  function handleComposerKeydown(event: KeyboardEvent) {
    if (isSaveShortcut(event)) {
      event.preventDefault();
      void createPin();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      discardComposer();
    }
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (isSaveShortcut(event)) {
      event.preventDefault();
      void saveEditingPin();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      discardEditingPin();
    }
  }

  function handlePinEditTargetKeydown(event: KeyboardEvent, pin: Pin) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    startEditingPin(pin);
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
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="pins-panel" aria-label="Pins">
  <header class="panel-header">
    <h2>Pins</h2>
    <button
      class="icon-button add-pin-button"
      type="button"
      aria-label="Create pin"
      title="Create pin"
      onclick={() => void openComposer()}
    >
      <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
    </button>
  </header>

  {#if composerOpen}
    <div class="pin pin-composer">
      <textarea
        bind:this={newPinTextareaElement}
        bind:value={newPinBody}
        rows="3"
        use:disableAutocorrect
        autocapitalize="off"
        autocomplete="off"
        placeholder="Pin a monthly goal, reminder, or idea..."
        spellcheck="false"
        aria-label="New pin"
        onkeydown={handleComposerKeydown}
        onblur={() => void createPin()}></textarea>
    </div>
  {/if}

  <div class="pin-list" aria-label="Active pins">
    {#if pins.length === 0}
      <p class="empty-state">No pins yet.</p>
    {:else}
      {#each pins as pin (pin.id)}
        <div
          id={`pin-${pin.id}`}
          class="pin"
          class:pin-display={editingPinId !== pin.id}
        >
          {#if editingPinId === pin.id}
            <textarea
              data-pin-edit-id={pin.id}
              bind:value={editingPinBody}
              rows="3"
              use:disableAutocorrect
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              aria-label="Edit pin"
              onclick={(event) => event.stopPropagation()}
              onkeydown={handleEditKeydown}
              onblur={() => void saveEditingPin()}></textarea>
          {:else}
            <div
              class="pin-edit-button"
              aria-label="Edit pin"
              role="button"
              tabindex="0"
              onclick={() => startEditingPin(pin)}
              onkeydown={(event) => handlePinEditTargetKeydown(event, pin)}
            >
              <p>{pin.body}</p>
            </div>
            <div class="pin-actions">
              <button
                class="icon-button pin-action-button"
                type="button"
                aria-label="Archive pin"
                title="Archive pin"
                onclick={(event) => {
                  event.stopPropagation();
                  void archivePin(pin.id);
                }}
              >
                <Archive size={14} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</section>

<style>
  .pins-panel {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    padding: 0.9rem;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: rgba(255, 252, 246, 0.82);
    overflow: hidden;
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

  .pin-list {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
  }

  .pin {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 82px;
    padding: 14px 36px 16px 14px;
    border: 1px solid rgba(130, 107, 46, 0.18);
    border-radius: 6px;
    background: #fff1a8;
    box-shadow: 0 8px 18px rgba(65, 52, 22, 0.08);
    cursor: text;
    overflow: hidden;
  }

  .pin-display {
    padding: 0;
  }

  .pin-edit-button {
    display: block;
    width: 100%;
    min-height: 80px;
    padding: 14px 36px 16px 14px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: text;
  }

  .pin-edit-button:focus-visible {
    outline: 2px solid rgba(89, 113, 62, 0.28);
    outline-offset: -3px;
  }

  .pin-edit-button:hover {
    background: transparent;
    color: inherit;
  }

  .pin::before {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 26px;
    height: 26px;
    background: transparent;
    content: "";
    pointer-events: none;
  }

  .pin::after {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 22px;
    height: 22px;
    border-top-left-radius: 2px;
    background: #d8b73d;
    clip-path: polygon(100% 0, 0 100%, 100% 100%);
    content: "";
    pointer-events: none;
  }

  .pin-composer {
    flex: 0 0 auto;
  }

  .pin p,
  .empty-state {
    margin: 0;
    color: #4a4438;
    font-size: 0.9rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .pin-action-button {
    width: 28px;
    min-width: 28px;
    height: 28px;
    background: rgba(255, 251, 231, 0.56);
    cursor: default;
  }

  .pin textarea {
    min-height: 78px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #4a4438;
    line-height: 1.45;
  }

  .pin textarea:focus-visible {
    outline: none;
  }

  .pin-actions {
    position: absolute;
    z-index: 1;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .pin:hover .pin-actions,
  .pin:focus-within .pin-actions {
    opacity: 1;
  }
</style>
