type AndroidOrder = {
  id: string;
  raw_text: string;
  parsed_data?: string;
  timestamp: string;
  status: string;
};

type AndroidPrinter = {
  name: string;
  mac: string;
};

interface AndroidBridge {
  isBluetoothEnabled(): boolean;
  openBluetoothSettings(): void;
  getPairedPrinters(): string;
  connectPrinter(macAddress: string): boolean;
  printBitmapDataUrl?(dataUrl: string): boolean;
  saveDefaultPrinter(mac: string): void;
  getDefaultPrinter(): string;
  signInWithGoogle(): void;
  finishSharePrint?(): boolean;
  finishApp?(): boolean;
}

interface Window {
  AndroidBridge?: AndroidBridge;
}
