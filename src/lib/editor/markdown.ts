import type { JSONContent } from "@tiptap/core";

export function markdownFromTiptapJson(doc: JSONContent) {
  return renderBlock(doc, 0).trimEnd();
}

export function looksLikeMarkdown(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }

  return markdownPatterns.some((pattern) => pattern.test(trimmedText));
}

const markdownPatterns = [
  /^#{1,6}\s+\S/m,
  /^(?:[-+*])\s+\S/m,
  /^(?:[-+*])\s+\[[ xX]\]\s+\S/m,
  /^\d+[.)]\s+\S/m,
  /^>\s+\S/m,
  /^```[\s\S]*```$/m,
  /^~~~[\s\S]*~~~$/m,
  /^(?:-{3,}|\*{3,}|_{3,})$/m,
  /(?:^|\s)(?:\*\*|__)\S[\s\S]*?\S(?:\*\*|__)(?:\s|$)/,
  /\[[^\]]+\]\([^)]+\)/,
  /(?:^|\s)`[^`\n]+`(?:\s|$)/,
];

function renderBlock(node: JSONContent, depth: number): string {
  switch (node.type) {
    case "doc":
      return renderBlocks(node.content ?? [], depth);
    case "paragraph":
      return renderInlineContent(node.content ?? []);
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 1))} ${renderInlineContent(node.content ?? [])}`;
    case "bulletList":
      return renderBulletList(node, depth);
    case "orderedList":
      return renderOrderedList(node, depth);
    case "taskList":
      return renderTaskList(node, depth);
    case "blockquote":
      return renderBlocks(node.content ?? [], depth)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "codeBlock":
      return `\`\`\`\n${renderPlainText(node.content ?? [])}\n\`\`\``;
    default:
      return renderBlocks(node.content ?? [], depth);
  }
}

function renderBlocks(nodes: JSONContent[], depth: number) {
  return nodes
    .map((node) => renderBlock(node, depth))
    .filter((block) => block.length > 0)
    .join("\n\n");
}

function renderBulletList(node: JSONContent, depth: number) {
  return (node.content ?? [])
    .map((listItem) => renderListItem(listItem, "- ", depth))
    .join("\n");
}

function renderOrderedList(node: JSONContent, depth: number) {
  const start = Number(node.attrs?.start ?? 1);

  return (node.content ?? [])
    .map((listItem, index) =>
      renderListItem(listItem, `${start + index}. `, depth),
    )
    .join("\n");
}

function renderTaskList(node: JSONContent, depth: number) {
  return (node.content ?? [])
    .map((taskItem) => {
      const marker = taskItem.attrs?.checked ? "- [x] " : "- [ ] ";

      return renderListItem(taskItem, marker, depth);
    })
    .join("\n");
}

function renderListItem(node: JSONContent, marker: string, depth: number) {
  const indent = "  ".repeat(depth);
  const childBlocks = node.content ?? [];
  const firstBlock = childBlocks[0];
  const firstLine = `${indent}${marker}${renderListItemFirstLine(firstBlock)}`;
  const rest = childBlocks
    .slice(1)
    .map((child) =>
      indentContinuation(renderBlock(child, depth + 1), depth + 1),
    )
    .filter((block) => block.length > 0);

  return [firstLine, ...rest].join("\n");
}

function renderListItemFirstLine(node: JSONContent | undefined) {
  if (!node) {
    return "";
  }

  if (node.type === "paragraph") {
    return renderInlineContent(node.content ?? []);
  }

  return renderBlock(node, 0);
}

function indentContinuation(markdown: string, depth: number) {
  if (!markdown) {
    return "";
  }

  const indent = "  ".repeat(depth);

  return markdown
    .split("\n")
    .map((line) => (line ? `${indent}${line}` : line))
    .join("\n");
}

function renderInlineContent(nodes: JSONContent[]) {
  return nodes.map(renderInline).join("");
}

function renderInline(node: JSONContent): string {
  if (node.type === "text") {
    return applyMarks(node.text ?? "", node.marks ?? []);
  }

  if (node.type === "hardBreak") {
    return "  \n";
  }

  return renderInlineContent(node.content ?? []);
}

function applyMarks(text: string, marks: NonNullable<JSONContent["marks"]>) {
  return marks.reduce((markedText, mark) => {
    switch (mark.type) {
      case "bold":
        return `**${markedText}**`;
      case "italic":
        return `*${markedText}*`;
      case "code":
        return `\`${markedText}\``;
      case "link":
        return `[${markedText}](${mark.attrs?.href ?? ""})`;
      default:
        return markedText;
    }
  }, text);
}

function renderPlainText(nodes: JSONContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return node.text ?? "";
      }

      return renderPlainText(node.content ?? []);
    })
    .join("");
}
