<script lang="ts">
  type Pin = {
    id: number;
    body: string;
  };

  const today = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  let dailyNoteBody = $state("");
  let pins = $state<Pin[]>([]);
  let newPinBody = $state("");

  function createPin() {
    const body = newPinBody.trim();

    if (!body) {
      return;
    }

    pins = [{ id: Date.now(), body }, ...pins];
    newPinBody = "";
  }

  function archivePin(id: number) {
    pins = pins.filter((pin) => pin.id !== id);
  }
</script>

<main class="app-shell" aria-label="koko workspace">
  <div class="workspace">
    <section class="note-panel" aria-label="DailyNote editor">
      <header class="panel-header note-header">
        <h1>{today}</h1>
        <button type="button">Start today's note</button>
      </header>

      <textarea
        class="daily-note"
        bind:value={dailyNoteBody}
        placeholder={`# ${today}\n\n- [ ] Write the next thing to do\n- Log what changed, why, and what to return to`}
        aria-label="DailyNote body"
      ></textarea>
    </section>

    <aside class="side-panel" aria-label="Sidebar">
      <section class="timer-panel" aria-label="Pomodoro">
        <header class="panel-header">
          <h2>Pomodoro</h2>
        </header>

        <div class="timer-face" aria-label="25 minutes remaining">
          <span>25:00</span>
          <small>Ready</small>
        </div>

        <div class="timer-actions" aria-label="Pomodoro controls">
          <button type="button">Start</button>
          <button type="button">Reset</button>
        </div>
      </section>

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
            bind:value={newPinBody}
            rows="3"
            placeholder="Pin a monthly goal, reminder, or idea..."
            aria-label="New pin"
          ></textarea>
          <button type="submit">Pin</button>
        </form>

        <div class="pin-list" aria-label="Active pins">
          {#if pins.length === 0}
            <p class="empty-state">No pins yet.</p>
          {:else}
            {#each pins as pin (pin.id)}
              <article class="pin">
                <p>{pin.body}</p>
                <button type="button" onclick={() => archivePin(pin.id)}>
                  Archive
                </button>
              </article>
            {/each}
          {/if}
        </div>
      </section>
    </aside>
  </div>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    min-width: 860px;
    min-height: 640px;
    color: #20211f;
    background: #f4f1ea;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      "Segoe UI", sans-serif;
  }

  :global(button),
  :global(textarea) {
    font: inherit;
  }

  .app-shell {
    min-height: 100vh;
  }

  .workspace,
  .side-panel,
  .pins-panel,
  .note-panel,
  .timer-panel,
  .pin,
  .pin-form {
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: rgba(255, 252, 246, 0.82);
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 18.5rem;
    gap: 0.8rem;
    min-height: 100vh;
    padding: 0.8rem;
    border: 0;
    background: transparent;
  }

  .side-panel,
  .pins-panel,
  .note-panel,
  .timer-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 0.9rem;
  }

  .note-panel {
    gap: 0.85rem;
    background: #fffdf8;
  }

  .side-panel {
    gap: 0.8rem;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .pins-panel,
  .timer-panel {
    gap: 12px;
  }

  .pins-panel {
    flex: 1;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .note-header {
    min-height: 2.2rem;
  }

  h1,
  h2 {
    margin: 0;
    font-weight: 720;
    line-height: 1.1;
  }

  h1 {
    font-size: 1.35rem;
  }

  h2 {
    font-size: 1rem;
  }

  button {
    min-height: 34px;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-radius: 6px;
    background: #2e332a;
    color: #fffdf8;
    cursor: pointer;
    padding: 0 12px;
  }

  button:hover {
    background: #22271f;
  }

  button:focus-visible,
  textarea:focus-visible {
    outline: 2px solid #6f8f4e;
    outline-offset: 2px;
  }

  textarea {
    width: 100%;
    resize: none;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 6px;
    background: #fffdf8;
    color: #20211f;
    line-height: 1.5;
  }

  .daily-note {
    flex: 1;
    min-height: 0;
    padding: 20px;
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace;
    font-size: 0.95rem;
  }

  .pin-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
  }

  .pin-form textarea {
    min-height: 72px;
    padding: 10px;
  }

  .pin-form button,
  .timer-actions button {
    align-self: flex-start;
  }

  .pin-list {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
  }

  .pin {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: #fff4bf;
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

  .timer-face {
    display: grid;
    min-height: 104px;
    place-items: center;
    align-content: center;
    gap: 6px;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: #fffdf8;
  }

  .timer-face span {
    font-variant-numeric: tabular-nums;
    font-size: 2rem;
    font-weight: 740;
    line-height: 1;
  }

  .timer-face small {
    color: #6d675d;
    font-size: 0.8rem;
  }

  .timer-actions {
    display: flex;
    gap: 8px;
  }
</style>
