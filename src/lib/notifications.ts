import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function sendPomodoroCompleteNotification() {
  try {
    if (!(await isPermissionGranted())) {
      return;
    }

    sendNotification({
      title: "Pomodoro complete",
      body: "Take a short break or write a quick note.",
    });
  } catch (error) {
    console.warn("Failed to send Pomodoro notification.", error);
  }
}

export async function isNotificationPermissionGranted() {
  try {
    return await isPermissionGranted();
  } catch (error) {
    console.warn("Failed to check notification permission.", error);
    return false;
  }
}

export async function requestNotificationPermission() {
  try {
    return (await requestPermission()) === "granted";
  } catch (error) {
    console.warn("Failed to request notification permission.", error);
    return false;
  }
}
