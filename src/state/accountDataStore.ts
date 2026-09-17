import type { FainanceUserDataDocument } from "../data/userDataRepository";

type Listener = () => void;

type AccountDataState = {
  uid: string | null;
  value: FainanceUserDataDocument | null;
  loading: boolean;
  error: unknown | null;
};

let state: AccountDataState = { uid: null, value: null, loading: false, error: null };
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getAccountDataState(): AccountDataState {
  return state;
}

export function setAccountDataState(patch: Partial<AccountDataState>): void {
  state = { ...state, ...patch };
  emit();
}

export function resetAccountDataState(): void {
  state = { uid: null, value: null, loading: false, error: null };
  emit();
}

export function subscribeAccountData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
