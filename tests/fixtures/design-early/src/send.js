export async function send(request, transport) {
  return transport(request);
}
