// Only fixed, non-personal categories may cross the Analytics boundary.
export const sections = ['home', 'spese', 'history', 'budget', 'budgetPlan', 'goals', 'savings', 'share', 'stats', 'statistiche', 'settings', 'more', 'consulenteAI', 'voice', 'alerts', 'patrimonio', 'debtCredits', 'shopping', 'appunti', 'tools', 'recurring', 'login', 'register'];
const values: Record<string, readonly string[]> = {
  section: sections,
  flow: ['registration', 'login', 'movement', 'budget', 'goal', 'backup_import', 'ai_request'],
  step: ['started', 'completed', 'failed', 'cancelled', 'abandoned'],
  method: ['email', 'google', 'apple', 'manual', 'bulk', 'receipt', 'voice', 'assistant', 'import', 'backup', 'advice', 'realtime', 'unknown'],
  reason: ['validation', 'plan_limit', 'service', 'verification_required', 'user_cancel', 'navigation', 'page_exit', 'unknown'],
  operation: ['create', 'update', 'merge', 'replace'],
  kind: ['expense', 'income'],
  open_reason: ['cold_start', 'foreground'],
  action: ['open_section', 'create_expense', 'create_income', 'create_recurring', 'create_goal', 'update_goal_saved', 'create_alert', 'set_category_budget', 'create_debt_credit', 'update_debt_credit', 'delete_debt_credit', 'set_patrimonio_value', 'create_note', 'add_shopping_items', 'create_shopping_list', 'create_shopping_unit', 'create_share_project', 'create_share_expense', 'create_share_settlement', 'create_expense_category', 'create_payment_method', 'set_setting'],
  result: ['requested', 'completed', 'failed', 'cancelled'],
};
const events: Record<string, readonly string[]> = {
  fainance_app_open: ['open_reason'],
  fainance_section_view: ['section'],
  fainance_flow: ['flow', 'step', 'method', 'reason', 'operation', 'kind'],
  fainance_ai_action: ['action', 'result'],
  fainance_account_created: ['method'],
};
export function sanitizeAnalyticsEvent(name: string, input: Record<string, unknown> = {}) {
  if (!Object.prototype.hasOwnProperty.call(events, name)) return null;
  const params: Record<string, string> = {};
  for (const key of events[name]) {
    const value = input[key];
    if (typeof value === 'string' && values[key].includes(value)) params[key] = value;
  }
  if (name === 'fainance_section_view' && !params.section) return null;
  if (name === 'fainance_flow' && (!params.flow || !params.step)) return null;
  if (name === 'fainance_ai_action' && (!params.action || !params.result)) return null;
  return { name, params };
}

export const analyticsProjects = {
  production: { projectId: 'fainance-a7794', nativeAppId: 'it.fainanceapp.app', webAppId: '1:739607555867:web:ae797cd0a578e476cd6dbe', measurementId: 'G-3R8XXV6E4E' },
  test: { projectId: 'fainance-test-20260823195207', nativeAppId: 'it.fainanceapp.app.test', webAppId: '1:537576395820:web:d97428c9606950d9366d89', measurementId: 'G-SVWNRQMZC0' },
} as const;

export function assertAnalyticsIdentity(environment: 'production' | 'test', projectId: string, native?: { projectId: string; appId: string }) {
  const expected = analyticsProjects[environment];
  if (!expected || projectId !== expected.projectId || (native && (native.projectId !== expected.projectId || native.appId !== expected.nativeAppId))) {
    throw new Error('FAINANCE_ANALYTICS_ENVIRONMENT_MISMATCH');
  }
  return expected;
}
