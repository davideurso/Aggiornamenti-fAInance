export function chatgptEnvironmentEnabled(environment,projectId){
 return (environment==='test'&&projectId==='fainance-test-20260823195207')||
  (environment==='production'&&projectId==='fainance-a7794');
}
export function chatgptProjectEnabled(projectId){
 return ['fainance-test-20260823195207','fainance-a7794'].includes(projectId);
}
