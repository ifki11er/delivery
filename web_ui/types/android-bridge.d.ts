type AndroidOrder = {
  id: number;
  raw_text: string;
  timestamp: string;
  status: string;
};

type AndroidPrinter = {
  name: string;
  mac: string;
};

interface AndroidBridge {
  getOrders(): string;
  isBluetoothEnabled(): boolean;
  openBluetoothSettings(): void;
  getPairedPrinters(): string;
  connectPrinter(macAddress: string): boolean;
  printTest(): boolean;
  printText(text: string): boolean;
  setAutoPrintEnabled(enabled: boolean): void;
  isAutoPrintEnabled(): boolean;
  saveDefaultPrinter(mac: string): void;
  getDefaultPrinter(): string;
  signInWithGoogle(): void;
}

interface Window {
  AndroidBridge?: AndroidBridge;
}
