"use client";
/**
 * QR detection: the browser's native BarcodeDetector where available
 * (Android Chrome, macOS) — very fast; otherwise a WebAssembly ZXing build
 * served from /wasm so it also works offline (Windows, iOS Safari, Firefox).
 */
export interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

export async function createQrDetector(): Promise<Detector> {
  const Native = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector;
  if (Native) {
    try {
      if ((await Native.getSupportedFormats()).includes("qr_code")) return new Native({ formats: ["qr_code"] });
    } catch {}
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : prefix + path),
    },
    fireImmediately: true,
  });
  return new BarcodeDetector({ formats: ["qr_code"] });
}
