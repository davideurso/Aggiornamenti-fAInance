export function contactEndpoint(projectId) {
  if (!['fainance-test-20260823195207','fainance-a7794'].includes(projectId)) throw new Error('CONTACT_PROJECT_REQUIRED');
  return 'https://europe-west1-' + projectId + '.cloudfunctions.net/sendContactEmail';
}
