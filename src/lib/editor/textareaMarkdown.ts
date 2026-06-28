export type TextareaEdit = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function insertMarkdownListContinuation(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): TextareaEdit | null {
  if (selectionStart !== selectionEnd) {
    return null;
  }

  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf("\n", selectionStart);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  if (selectionStart !== lineEnd) {
    return null;
  }

  const currentLine = value.slice(lineStart, lineEnd);
  const continuation = markdownListContinuationForLine(currentLine);

  if (continuation === null) {
    return null;
  }

  const insertedText = `\n${continuation}`;
  const nextSelection = selectionStart + insertedText.length;

  return {
    value: `${value.slice(0, selectionStart)}${insertedText}${value.slice(
      selectionEnd,
    )}`,
    selectionStart: nextSelection,
    selectionEnd: nextSelection,
  };
}

export function markdownListContinuationForLine(line: string) {
  const taskItemMatch = line.match(/^([ \t]*)-[ \t]*\[[ xX]\](?:[ \t].*)?$/);

  if (taskItemMatch) {
    return `${taskItemMatch[1]}- [ ] `;
  }

  const bulletMatch = line.match(/^([ \t]*)-(?:[ \t].*)?$/);

  if (bulletMatch) {
    return `${bulletMatch[1]}- `;
  }

  return null;
}
