/* Nebenkosten – Texterkennung für Rechnungen, läuft komplett auf dem Gerät (Tesseract, Apache-2.0) */
let mod = null, api = null;
function simdOk() {
  try { return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }
  catch (_) { return false; }
}
async function init() {
  if (api) return;
  postMessage({ status: 'laden' });
  importScripts(simdOk() ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js');
  mod = await self.TesseractCore({});
  const r = await fetch('deu.traineddata');
  if (!r.ok) throw new Error('Sprachdaten fehlen');
  mod.FS.writeFile('deu.traineddata', new Uint8Array(await r.arrayBuffer()));
  api = new mod.TessBaseAPI();
  if (api.Init(null, 'deu', 1) === -1) throw new Error('Init fehlgeschlagen');
}
onmessage = async (e) => {
  try {
    await init();
    postMessage({ status: 'lesen' });
    mod.FS.writeFile('/input', new Uint8Array(e.data));
    if (api.SetImageFile(1, 0) === 1) throw new Error('Bild nicht lesbar');
    api.Recognize(null);
    const text = api.GetUTF8Text();
    api.Clear();
    postMessage({ ok: true, text });
  } catch (err) {
    postMessage({ ok: false, err: String(err && err.message || err) });
  }
};
