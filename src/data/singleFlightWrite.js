// A caller timeout must not enqueue a second write while the first is still pending.
export function createSingleFlightWriter() {
 const pending=new Map();
 return function run(key,start) {
  if(pending.has(key))return pending.get(key);
  const operation=Promise.resolve().then(start);
  pending.set(key,operation);
  const release=()=>{if(pending.get(key)===operation)pending.delete(key);};
  operation.then(release,release);
  return operation;
 };
}
