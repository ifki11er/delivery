type AndroidOrder = {
  id: number;
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
  getOrders(): string;
  isBluetoothEnabled(): boolean;
  openBluetoothSettings(): void;
  getPairedPrinters(): string;
  connectPrinter(macAddress: string): boolean;
  printTest(): boolean;
  printText(text: string): boolean;
  saveDefaultPrinter(mac: string): void;
  getDefaultPrinter(): string;
  signInWithGoogle(): void;
}

interface Window {
  AndroidBridge?: AndroidBridge;
}
