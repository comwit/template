/** A waiting worker must not interrupt work in another tab or embedded client. */
export async function activateUpdate(scope: ServiceWorkerGlobalScope, sourceId: string) {
  const clients = await scope.clients.matchAll({ type: "window", includeUncontrolled: true });
  const scopedClients = clients.filter((client) => client.url.startsWith(scope.registration.scope));
  if (scopedClients.length !== 1 || scopedClients[0].id !== sourceId) return "blocked";
  await scope.skipWaiting();
  return "activating";
}
