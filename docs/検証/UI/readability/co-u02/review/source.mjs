// Read the existing design-owned manifest and gzip files; no UI fixture copy.
const baseURL = new URL('../../../../接続条件/co-d02/saves/', import.meta.url);
const names = new Set(['home', 'entry', 'port', 'return', 'second-return']);
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
async function verify(bytes, length, sha) {
  if (bytes.byteLength !== length || hex(await crypto.subtle.digest('SHA-256', bytes)) !== sha) throw Error('fixture_hash_mismatch');
}
export async function loadDocument(name, fetchSource = globalThis.fetch) {
  if (!names.has(name)) throw Error('unknown_fixture');
  const manifestResponse = await fetchSource(new URL('manifest.json', baseURL));
  if (!manifestResponse.ok) throw Error('fixture_manifest_unavailable');
  const manifest = await manifestResponse.json();
  const path = 'docs/検証/接続条件/co-d02/saves/' + name + '.save.json.gz';
  const record = manifest.records?.find(item => item.path === path);
  if (!record) throw Error('fixture_manifest_missing');
  const response = await fetchSource(new URL(name + '.save.json.gz', baseURL));
  if (!response.ok) throw Error('fixture_unavailable');
  const gzip = await response.arrayBuffer();
  await verify(gzip, record.gzip_bytes, record.gzip_sha256);
  const stream = new Blob([gzip]).stream().pipeThrough(new DecompressionStream('gzip'));
  const raw = await new Response(stream).arrayBuffer();
  await verify(raw, record.raw_bytes, record.raw_sha256);
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(raw));
}
