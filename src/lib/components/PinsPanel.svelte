<script lang="ts">
  import { onMount } from "svelte";
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
  let pinListElement = $state<HTMLDivElement>();
  let selectedPinId = $state<number | null>(null);
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
      return;
    }

    try {
      const pin = await createPersistedPin(body, Date.now());

      pins = [pin, ...pins];
      selectedPinId = pin.id;
      newPinBody = "";
    } catch (error) {
      console.warn("Pin create failed", error);
    }
  }

  async function archivePin(id: number) {
    try {
      await archivePersistedPin(id, Date.now());
      pins = pins.filter((pin) => pin.id !== id);
      ensureSelectedPin();
    } catch (error) {
      console.warn("Pin archive failed", error);
    }
  }

  function startEditingPin(pin: Pin) {
    selectedPinId = pin.id;
    editingPinId = pin.id;
    editingPinBody = pin.body;
  }

  function cancelEditingPin() {
    editingPinId = null;
    editingPinBody = "";
  }

  async function saveEditingPin() {
    if (editingPinId === null) {
      return;
    }

    const body = editingPinBody.trim();

    if (!body) {
      return;
    }

    try {
      const updatedPin = await updatePinBody(editingPinId, body, Date.now());

      pins = pins.map((pin) => (pin.id === updatedPin.id ? updatedPin : pin));
      cancelEditingPin();
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

    if (pinCommand !== "focusCreate" && !pinsPanelContainsFocus()) {
      return;
    }

    if (pinCommand !== "focusCreate" && isTextInputTarget(event.target)) {
      return;
    }

    event.preventDefault();
    handlePinCommand(pinCommand);
  }

  function handlePinCommand(command: ReturnType<typeof pinCommandFromKeydown>) {
    switch (command) {
      case "focusCreate":
        newPinTextareaElement?.focus();
        break;
      case "moveDown":
        movePinSelection(1);
        break;
      case "moveUp":
        movePinSelection(-1);
        break;
      case "editSelected":
        editSelectedPin();
        break;
      case "archiveSelected":
        void archiveSelectedPin();
        break;
    }
  }

  function movePinSelection(delta: number) {
    if (pins.length === 0) {
      selectedPinId = null;
      return;
    }

    const currentIndex = Math.max(
      0,
      pins.findIndex((pin) => pin.id === selectedPinId),
    );
    const nextIndex = Math.min(
      pins.length - 1,
      Math.max(0, currentIndex + delta),
    );

    selectedPinId = pins[nextIndex].id;
  }

  function editSelectedPin() {
    const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? pins[0];

    if (selectedPin) {
      startEditingPin(selectedPin);
    }
  }

  async function archiveSelectedPin() {
    const selectedPin = pins.find((pin) => pin.id === selectedPinId);

    if (selectedPin) {
      await archivePin(selectedPin.id);
    }
  }

  function ensureSelectedPin() {
    if (pins.some((pin) => pin.id === selectedPinId)) {
      return;
    }

    selectedPinId = pins[0]?.id ?? null;
  }

  function selectPin(id: number) {
    selectedPinId = id;
  }

  function pinsPanelContainsFocus() {
    const activeElement = document.activeElement;

    return activeElement instanceof Node && pinListElement?.contains(activeElement);
  }

  function isTextInputTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="pins-panel" aria-label="Pins">
  <header class="panel-header">
    <h2>Pins</h2>
  </header>

  <form
    class="pin-form"
    onsubmit={(event) => {
      event.preventDefault();
      createPin();
    }}
  >
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
    ></textarea>
    <button type="submit">Pin</button>
  </form>

  <div
    class="pin-list"
    aria-label="Active pins"
    aria-activedescendant={selectedPinId ? `pin-${selectedPinId}` : undefined}
    bind:this={pinListElement}
    role="listbox"
    tabindex="0"
  >
    {#if pins.length === 0}
      <p class="empty-state">No pins yet.</p>
    {:else}
      {#each pins as pin (pin.id)}
        <div
          id={`pin-${pin.id}`}
          class="pin"
          class:pin-selected={selectedPinId === pin.id}
          aria-selected={selectedPinId === pin.id}
          onfocusin={() => selectPin(pin.id)}
          role="option"
        >
          {#if editingPinId === pin.id}
            <textarea
              bind:value={editingPinBody}
              rows="3"
              use:disableAutocorrect
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              aria-label="Edit pin"
            ></textarea>
            <div class="pin-actions">
              <button type="button" onclick={saveEditingPin}>Save</button>
              <button type="button" onclick={cancelEditingPin}>Cancel</button>
            </div>
          {:else}
            <p>{pin.body}</p>
            <div class="pin-actions">
              <button type="button" onclick={() => startEditingPin(pin)}>
                Edit
              </button>
              <button type="button" onclick={() => archivePin(pin.id)}>
                Archive
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

  .pin-form {
    display: flex;
    min-width: 0;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: rgba(255, 252, 246, 0.82);
  }

  .pin-form textarea {
    min-height: 72px;
    padding: 10px;
  }

  .pin-form button {
    align-self: flex-start;
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
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: #fff4bf;
  }

  .pin-selected {
    border-color: rgba(89, 113, 62, 0.7);
    box-shadow: 0 0 0 1px rgba(89, 113, 62, 0.22);
  }

  .pin p,
  .empty-state {
    margin: 0;
    color: #4a4438;
    font-size: 0.9rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .pin button {
    align-self: flex-start;
    background: transparent;
    color: #4a4438;
  }

  .pin button:hover {
    background: rgba(74, 68, 56, 0.08);
  }

  .pin textarea {
    min-height: 76px;
    padding: 9px;
    background: rgba(255, 253, 248, 0.76);
  }

  .pin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
