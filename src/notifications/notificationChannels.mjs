// Channels are independent from the legacy reminder schedule flags.
// Existing installations preserve the previous Push behavior for Share/service notices.
export const NOTIFICATION_CHANNEL_MODES = ["off", "in_app", "push", "email", "push_email"];
export const NOTIFICATION_CHANNEL_KEYS = ["spending_alert", "share", "recurring", "period_closure", "reminders", "custom", "service"];
export const DEFAULT_NOTIFICATION_CHANNELS = Object.freeze({
  spending_alert: "in_app", share: "push", recurring: "in_app",
  period_closure: "in_app", reminders: "in_app", custom: "in_app", service: "push",
});

export function notificationChannelKind(type) {
  const t = String(type || "").trim().toLowerCase();
  if (t === "spending_alert") return "spending_alert";
  if (t === "period_closure") return "period_closure";
  if (t === "recurring_confirmation") return "recurring";
  if (t.startsWith("share_") || t.startsWith("project_") || t.startsWith("share")) return "share";
  if (t === "custom_reminder") return "custom";
  if (t === "expense_reminder" || t === "salary_reminder") return "reminders";
  return "service";
}
export function normalizedNotificationChannels(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(NOTIFICATION_CHANNEL_KEYS.map((kind) => {
    const mode = String(source[kind] || "");
    return [kind, NOTIFICATION_CHANNEL_MODES.includes(mode) ? mode : DEFAULT_NOTIFICATION_CHANNELS[kind]];
  }));
}
export function notificationDeliveryMode(channels, type) {
  return normalizedNotificationChannels(channels)[notificationChannelKind(type)];
}
export function isSystemCommunication(type) {
  return notificationChannelKind(type) === "service";
}
export function notificationShowsInApp(channels, type) {
  if (isSystemCommunication(type)) return true;
  return notificationDeliveryMode(channels, type) !== "off";
}
export function notificationAllowsPush(channels, type) {
  return ["push", "push_email"].includes(notificationDeliveryMode(channels, type));
}
export function notificationAllowsEmail(channels, type) {
  return ["email", "push_email"].includes(notificationDeliveryMode(channels, type));
}

// Legacy cloud account snapshots may contain older channel choices. Preserve the
// most recent local channel revision without changing unrelated reminder flags.
export function mergeNotificationChannelState(previous, incoming) {
  const oldState = previous && typeof previous === "object" ? previous : {};
  const newState = incoming && typeof incoming === "object" ? incoming : {};
  if (Number(oldState.notificationChannelsUpdatedAtMs || 0) > Number(newState.notificationChannelsUpdatedAtMs || 0)) {
    return { ...newState, notificationChannels: oldState.notificationChannels, notificationChannelsUpdatedAtMs: oldState.notificationChannelsUpdatedAtMs };
  }
  return { ...newState };
}
