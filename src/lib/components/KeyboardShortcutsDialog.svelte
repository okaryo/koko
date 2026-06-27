<script lang="ts">
  import X from "@lucide/svelte/icons/x";

  type Shortcut = {
    action: string;
    keys: string[];
  };

  type ShortcutGroup = {
    title: string;
    shortcuts: Shortcut[];
  };

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();
  let dialogElement = $state<HTMLDialogElement>();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "DailyNote",
      shortcuts: [
        { action: "Focus editor", keys: ["Cmd", "Shift", "N"] },
        { action: "Copy note", keys: ["Cmd", "Shift", "C"] },
        { action: "Insert timestamp", keys: ["Ctrl", "T"] },
      ],
    },
    {
      title: "Pomodoro",
      shortcuts: [
        { action: "Start or pause", keys: ["Cmd", "Shift", "P"] },
        { action: "Reset", keys: ["Cmd", "Shift", "R"] },
      ],
    },
    {
      title: "Sticky Notes",
      shortcuts: [
        { action: "Focus new sticky note", keys: ["Cmd", "Shift", "I"] },
        { action: "Save sticky note", keys: ["Cmd", "Enter"] },
        { action: "Cancel sticky note editing", keys: ["Esc"] },
      ],
    },
    {
      title: "App",
      shortcuts: [
        { action: "Keyboard shortcuts", keys: ["Cmd", "/"] },
        { action: "Close dialog", keys: ["Esc"] },
      ],
    },
  ];

  $effect(() => {
    if (!dialogElement) {
      return;
    }

    if (open && !dialogElement.open) {
      dialogElement.showModal();
      dialogElement.focus({ preventScroll: true });
      return;
    }

    if (!open && dialogElement.open) {
      dialogElement.close();
    }
  });

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogElement) {
      onClose();
    }
  }
</script>

<dialog
  class="shortcut-dialog"
  aria-label="Keyboard shortcuts"
  tabindex="-1"
  bind:this={dialogElement}
  onclick={handleDialogClick}
  oncancel={onClose}
  onclose={onClose}
>
  <div class="dialog-content">
    <header class="dialog-header">
      <h2>Keyboard shortcuts</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close"
        title="Close"
        onclick={onClose}
      >
        <X size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </header>

    <div class="shortcut-groups">
      {#each shortcutGroups as group (group.title)}
        <section class="shortcut-group">
          <h3>{group.title}</h3>
          <div class="shortcut-list">
            {#each group.shortcuts as shortcut (shortcut.action)}
              <div class="shortcut-row">
                <span>{shortcut.action}</span>
                <span class="shortcut-keys">
                  {#each shortcut.keys as key (key)}
                    <kbd>{key}</kbd>
                  {/each}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</dialog>

<style>
  .shortcut-dialog {
    width: min(34rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    padding: 0;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-radius: 8px;
    background: #fffdf8;
    color: #20211f;
    overflow: hidden;
    box-shadow: 0 18px 48px rgba(43, 41, 36, 0.24);
  }

  .shortcut-dialog:focus {
    outline: none;
  }

  .shortcut-dialog::backdrop {
    background: rgba(32, 33, 31, 0.28);
  }

  .dialog-content {
    display: flex;
    max-height: inherit;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(43, 41, 36, 0.1);
  }

  h2,
  h3 {
    margin: 0;
    line-height: 1.1;
  }

  h2 {
    font-size: 1rem;
  }

  h3 {
    color: #5a5449;
    font-size: 0.78rem;
    font-weight: 720;
  }

  .icon-button {
    display: inline-flex;
    width: 32px;
    min-width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: #4a4438;
  }

  .icon-button:hover {
    background: rgba(43, 41, 36, 0.08);
    color: #20211f;
  }

  .shortcut-groups {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 14px;
    overflow: auto;
    padding: 14px 16px 16px;
  }

  .shortcut-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(43, 41, 36, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .shortcut-row {
    display: flex;
    min-height: 40px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(43, 41, 36, 0.08);
    font-size: 0.87rem;
  }

  .shortcut-row:last-child {
    border-bottom: 0;
  }

  .shortcut-keys {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 5px;
  }

  kbd {
    min-width: 1.5rem;
    padding: 3px 6px;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-bottom-color: rgba(43, 41, 36, 0.28);
    border-radius: 5px;
    background: #f4f1ea;
    color: #3d3931;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.1;
    text-align: center;
  }
</style>
