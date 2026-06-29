import "overlayscrollbars/overlayscrollbars.css";
import "./overlayScrollbars.css";
import { OverlayScrollbars } from "overlayscrollbars";

type OverlayScrollbarsActionOptions = {
  viewport?: HTMLElement;
};

export function overlayScrollbars(
  node: HTMLElement,
  options: OverlayScrollbarsActionOptions = {},
) {
  let instance: ReturnType<typeof OverlayScrollbars> | null = null;

  function initialize(viewport: HTMLElement | undefined) {
    if (instance || !viewport) {
      return;
    }

    instance = OverlayScrollbars(
      {
        target: node,
        elements: {
          viewport,
        },
      },
      {
        overflow: {
          x: "hidden",
          y: "scroll",
        },
        scrollbars: {
          theme: "os-theme-koko",
          autoHide: "leave",
          autoHideDelay: 450,
        },
      },
    );
  }

  initialize(options.viewport);

  return {
    update(nextOptions: OverlayScrollbarsActionOptions = {}) {
      initialize(nextOptions.viewport);
    },
    destroy() {
      instance?.destroy();
      instance = null;
    },
  };
}
