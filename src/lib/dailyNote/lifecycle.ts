export function canStartTodayNote(activeNoteDate: string, currentDate: string) {
  return currentDate > activeNoteDate;
}
