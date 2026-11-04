// The SDK falls back to polling when it detects buffering. Starting in
// streaming mode avoids paying a polling round trip during every cold start.
export function firestoreTransportSettings(_nativeRuntime: boolean, _environment: string) {
 return { experimentalAutoDetectLongPolling: true };
}
