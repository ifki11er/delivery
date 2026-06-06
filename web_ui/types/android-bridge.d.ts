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
  printTextWithStyle?(text: string, fontSize: number, bold: boolean): boolean;
  printKitchenOrderSheet?(tableName: string, orderSequence: number, printedAt: string, itemsJson: string): boolean;
  printPaymentReceipt?(
    storeName: string,
    tableName: string,
    businessRegNo: string,
    address: string,
    representativeName: string,
    contact: string,
    printedAt: string,
    paymentMethod: string,
    taxableTotal: number,
    vat: number,
    receiptTotal: number,
    itemsJson: string
  ): boolean;
  saveDefaultPrinter(mac: string): void;
  getDefaultPrinter(): string;
  signInWithGoogle(): void;
}

interface Window {
  AndroidBridge?: AndroidBridge;
}
