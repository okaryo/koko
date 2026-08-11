import type { CommandProps } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, type Transaction } from "@tiptap/pm/state";
import { canJoin } from "@tiptap/pm/transform";

type ExtensionFactory = typeof import("@tiptap/core").Extension;

const normalizedListTypes = new Set(["bulletList", "orderedList", "taskList"]);

export function createAdjacentListNormalization(Extension: ExtensionFactory) {
  return Extension.create({
    name: "adjacentListNormalization",

    addProseMirrorPlugins() {
      return [createAdjacentListNormalizationPlugin()];
    },
  });
}

export function createAdjacentListNormalizationPlugin() {
  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }

      const transaction = newState.tr;

      return joinAdjacentListsInTransaction(transaction) ? transaction : null;
    },
  });
}

export function joinAdjacentLists({ tr }: CommandProps) {
  return joinAdjacentListsInTransaction(tr);
}

function joinAdjacentListsInTransaction(transaction: Transaction) {
  let joined = false;
  let boundary = findJoinableListBoundary(transaction.doc, transaction.doc, 0);

  while (boundary !== null) {
    transaction.join(boundary);
    joined = true;
    boundary = findJoinableListBoundary(transaction.doc, transaction.doc, 0);
  }

  return joined;
}

function findJoinableListBoundary(
  document: Node,
  node: Node,
  contentStart: number,
): number | null {
  let childOffset = 0;

  for (let index = 0; index < node.childCount; index += 1) {
    const child = node.child(index);

    if (index > 0) {
      const previousChild = node.child(index - 1);
      const boundary = contentStart + childOffset;

      if (
        listsAreCompatible(previousChild, child) &&
        canJoin(document, boundary)
      ) {
        return boundary;
      }
    }

    if (!child.isLeaf) {
      const nestedBoundary = findJoinableListBoundary(
        document,
        child,
        contentStart + childOffset + 1,
      );

      if (nestedBoundary !== null) {
        return nestedBoundary;
      }
    }

    childOffset += child.nodeSize;
  }

  return null;
}

function listsAreCompatible(first: Node, second: Node) {
  if (first.type !== second.type || !normalizedListTypes.has(first.type.name)) {
    return false;
  }

  if (first.type.name !== "orderedList") {
    return true;
  }

  return (
    normalizeOrderedListType(first.attrs.type) ===
    normalizeOrderedListType(second.attrs.type)
  );
}

function normalizeOrderedListType(type: unknown) {
  return !type || type === "1" ? null : type;
}
