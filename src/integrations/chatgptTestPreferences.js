export function preferLocalAIConsent(local, localTimestamp, remote, remoteTimestamp) {
  return Number(localTimestamp || 0) > Number(remoteTimestamp || 0) || !remote ||
    (local?.accepted === true && remote.accepted !== true && Number(remoteTimestamp || 0) <= 0);
}
export function pendingChatgptLanguage(environment, projectId, preference, lastApplied) {
  if (environment !== 'test' || projectId !== 'fainance-test-20260823195207') return null;
  if (!preference || !['it','en','es','fr','de','pt','pl','nl','ro','el'].includes(preference.language)) return null;
  const stamp=Number(preference.updatedAtMs || 0);
  return Number.isFinite(stamp) && stamp > Number(lastApplied || 0) ? {language:preference.language,stamp} : null;
}
