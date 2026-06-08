'use client';

export type DeliveryShareItem = {
  name: string;
  quantity: number;
  amount: number;
};

export type DeliveryShareOrder = {
  nickname: string;
  selectedAddress: string;
  inputAddress: string;
  phone: string;
  items: DeliveryShareItem[];
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string;
  rawPaymentMethod: string;
};

const selectedAddressLabels = ['선택주소', 'Selected address', 'Địa chỉ tùy chọn', '選択住所', 'ที่อยู่ที่เลือก'];
const inputAddressLabels = ['입력주소', 'Entered address', 'Địa chỉ nhập', '入力住所', 'ที่อยู่ที่ระบุ'];
const deliveryFeeLabels = ['배달비', 'Delivery fee', 'Phí ship', '配達費用', 'ค่าส่ง'];
const totalAmountLabels = ['최종결제금액', 'Total order amount', 'Tổng tiền thanh toán', '最終決済金額', 'ยอดชำระทั้งหมด'];
const paymentMethodLabels = ['결제방법', 'Payment method', 'Phương thức thanh toán', '決済方法', 'วิธีการชำระเงิน'];

function lineContainsAny(line: string, keywords: string[]) {
  return keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()));
}

function valueAfterLabel(line: string) {
  const colonIndexes = [line.indexOf(':'), line.indexOf('：')].filter((index) => index >= 0);
  if (colonIndexes.length === 0) return '';
  return line.slice(Math.min(...colonIndexes) + 1).trim();
}

function parseMoney(value: string) {
  return Number(value.replace(/[^\d]/g, '') || 0);
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    return `0${digits.slice(2)}`.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  }
  if (digits.length >= 10) return digits.replace(/(\d{3})(\d{3,4})(\d+)/, '$1 $2 $3');
  return raw.trim();
}

export function normalizePaymentMethod(rawMethod: string) {
  if (
    rawMethod.includes('계좌') ||
    rawMethod.includes('이체') ||
    /bank|transfer/i.test(rawMethod) ||
    rawMethod.toLowerCase().includes('chuyển khoản') ||
    rawMethod.includes('โอน')
  ) return 'Banking';

  if (
    rawMethod.includes('현금') ||
    /cash/i.test(rawMethod) ||
    rawMethod.toLowerCase().includes('tiền mặt') ||
    rawMethod.includes('現金') ||
    rawMethod.includes('เงินสด')
  ) return 'Cash';

  if (
    rawMethod.includes('카드') ||
    /card/i.test(rawMethod) ||
    rawMethod.toLowerCase().includes('thẻ') ||
    rawMethod.includes('カード') ||
    rawMethod.includes('บัตร')
  ) return 'Card';

  return rawMethod.trim() || 'Unknown';
}

export function parseDeliveryShareOrder(rawText: string): DeliveryShareOrder | null {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const selectedAddress = valueAfterLabel(lines.find((line) => line.startsWith('🗺️') || lineContainsAny(line, selectedAddressLabels)) || '');
  const inputAddress = valueAfterLabel(lines.find((line) => line.startsWith('✏️') || lineContainsAny(line, inputAddressLabels)) || '');
  const phone = lines.find((line) => line.includes('📞') || line.startsWith('+'))?.replace('📞', '').trim() || '';
  const deliveryFee = parseMoney(valueAfterLabel(lines.find((line) => lineContainsAny(line, deliveryFeeLabels)) || ''));
  const totalAmount = parseMoney(valueAfterLabel(lines.find((line) => lineContainsAny(line, totalAmountLabels)) || ''));
  const rawPaymentMethod = valueAfterLabel(lines.find((line) => lineContainsAny(line, paymentMethodLabels)) || '').split('(')[0].trim();
  const itemRegex = /^🍲\s*(.+?)\s+([\d,]+)\s*₫(?:\s*\((.+)\))?\s*x\s*(\d+)\s*$/;
  const optionRegex = /([^+()]+?)\s*\+([\d,]+)\s*₫/g;
  const items: DeliveryShareItem[] = [];

  lines.filter((line) => line.startsWith('🍲')).forEach((line) => {
    const match = itemRegex.exec(line);
    if (!match) return;

    const quantity = Number(match[4] || 1);
    const price = parseMoney(match[2]);
    items.push({ name: match[1].trim(), quantity, amount: price * quantity });

    const optionText = match[3] || '';
    for (const option of optionText.matchAll(optionRegex)) {
      const optionName = option[1]?.trim();
      const optionPrice = parseMoney(option[2] || '');
      if (optionName && optionPrice > 0) {
        items.push({ name: `(${optionName})`, quantity, amount: optionPrice * quantity });
      }
    }
  });

  if (!selectedAddress || !inputAddress || !phone || !deliveryFee || !totalAmount || !rawPaymentMethod || items.length === 0) {
    return null;
  }

  return {
    nickname: '닉네임 정보 없음',
    selectedAddress,
    inputAddress,
    phone: normalizePhone(phone),
    items,
    deliveryFee,
    totalAmount,
    paymentMethod: normalizePaymentMethod(rawPaymentMethod),
    rawPaymentMethod,
  };
}

export function getDeliverySharePhoneDigits(order: DeliveryShareOrder) {
  return order.phone.replace(/[^\d]/g, '');
}

export function createDeliveryPrintHistoryData(order: DeliveryShareOrder, orderSequence: number) {
  return JSON.stringify({
    summary: `${order.paymentMethod} ${order.totalAmount.toLocaleString()}₫`,
    orderSequence,
  });
}

export function getDeliveryPrintHistorySummary(parsedData?: string) {
  if (!parsedData) return '';
  try {
    const parsed = JSON.parse(parsedData) as { summary?: unknown };
    return typeof parsed.summary === 'string' ? parsed.summary : parsedData;
  } catch {
    return parsedData;
  }
}

export function getDeliveryPrintHistorySequence(parsedData?: string) {
  if (!parsedData) return undefined;
  try {
    const parsed = JSON.parse(parsedData) as { orderSequence?: unknown };
    return typeof parsed.orderSequence === 'number' ? parsed.orderSequence : undefined;
  } catch {
    return undefined;
  }
}

function moneyToK(amount: number) {
  return `${Math.round(amount / 1000).toLocaleString()}k`;
}

function nextChangeAmount(total: number) {
  const paid = Math.ceil(total / 500000) * 500000;
  return paid - total;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3) {
  const chars = [...text];
  const lines: string[] = [];
  let current = '';

  chars.forEach((char) => {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options?: {
  size?: number;
  bold?: boolean;
  align?: CanvasTextAlign;
}) {
  ctx.font = `${options?.bold ? '700' : '400'} ${options?.size || 28}px Arial, sans-serif`;
  ctx.textAlign = options?.align || 'left';
  ctx.fillStyle = '#000';
  ctx.fillText(text, x, y);
}

function makeCanvas(height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 576;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

export function renderDeliveryShareReceipt(order: DeliveryShareOrder) {
  const rowHeight = 34;
  const measure = makeCanvas(1).ctx;
  measure.font = '400 31px Arial, sans-serif';
  const selectedAddressLines = wrapText(measure, `⦁${order.selectedAddress}`, 510, 4).length;
  const itemHeight = order.items.reduce((sum, item) => {
    const { ctx } = makeCanvas(1);
    ctx.font = '400 27px Arial, sans-serif';
    return sum + wrapText(ctx, item.name, 300, 2).length * rowHeight;
  }, 0);
  const height = 710 + itemHeight + selectedAddressLines * 38;
  const { canvas, ctx } = makeCanvas(height);
  let y = 64;

  drawText(ctx, order.nickname, 36, y, { size: 34, bold: true });
  y += 34;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 38;

  ctx.font = '400 31px Arial, sans-serif';
  wrapText(ctx, `⦁ ${order.selectedAddress}`, 510, 4).forEach((line) => {
    drawText(ctx, line, 36, y, { size: 31 });
    y += 38;
  });
  drawText(ctx, `⦁ ${order.inputAddress}`, 36, y, { size: 31 });
  y += 44;
  drawText(ctx, `⦁ ${order.phone}`, 36, y, { size: 35, bold: true });
  y += 26;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 44;

  drawText(ctx, '메뉴', 110, y, { size: 24, align: 'center' });
  drawText(ctx, '수량', 410, y, { size: 24, align: 'center' });
  drawText(ctx, '금액', 520, y, { size: 24, align: 'right' });
  y += 20;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 34;

  order.items.forEach((item) => {
    ctx.font = '400 27px Arial, sans-serif';
    const lines = wrapText(ctx, `⦁ ${item.name}`, 330, 2);
    lines.forEach((line, index) => {
      drawText(ctx, line, 36, y, { size: 27 });
      if (index === 0) {
        drawText(ctx, String(item.quantity), 410, y, { size: 27, align: 'center' });
        drawText(ctx, moneyToK(item.amount), 542, y, { size: 27, align: 'right' });
      }
      y += rowHeight;
    });
  });

  drawText(ctx, '배달비', 72, y + 8, { size: 27 });
  drawText(ctx, moneyToK(order.deliveryFee), 542, y + 8, { size: 27, align: 'right' });
  y += 54;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 52;

  drawText(ctx, order.paymentMethod, 72, y, { size: 31, bold: true });
  drawText(ctx, moneyToK(order.totalAmount), 342, y, { size: 38, bold: true, align: 'center' });
  drawText(ctx, `( ${moneyToK(nextChangeAmount(order.totalAmount))} )`, 542, y, { size: 31, bold: true, align: 'right' });
  y += 28;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 42;
  drawText(ctx, 'MEMO', 72, y, { size: 24 });
  y += 22;
  ctx.strokeRect(34, y, 508, 148);

  return canvas.toDataURL('image/png');
}

export function renderDeliveryKitchenOrder(order: DeliveryShareOrder, options?: { orderSequence?: number }) {
  const measure = makeCanvas(1).ctx;
  measure.font = '400 32px Arial, sans-serif';
  const itemHeight = order.items.reduce((sum, item, index) => {
    const name = `${String(index + 1).padStart(2, '0')}.${item.name}`;
    return sum + Math.max(1, wrapText(measure, name, 330, 2).length) * 42;
  }, 0);
  measure.font = '700 36px Arial, sans-serif';
  const selectedAddressLines = wrapText(measure, order.selectedAddress, 500, 5);
  const inputAddressLines = wrapText(measure, order.inputAddress, 500, 3);
  const addressHeight = Math.max(1, selectedAddressLines.length + inputAddressLines.length) * 42 + 8;
  const height = 524 + itemHeight + addressHeight;
  const { canvas, ctx } = makeCanvas(height);
  let y = 72;

  drawText(ctx, '주문서 (주방)', 288, y, { size: 37, align: 'center' });
  y += 72;
  drawText(ctx, '배달K 주문', 34, y, { size: 44 });
  y += 34;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 52;

  drawText(ctx, '메  뉴', 72, y, { size: 28 });
  drawText(ctx, '수량', 410, y, { size: 28, align: 'center' });
  drawText(ctx, '비고', 532, y, { size: 28, align: 'right' });
  y += 24;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 46;

  order.items.forEach((item, index) => {
    ctx.font = '400 32px Arial, sans-serif';
    const name = `${String(index + 1).padStart(2, '0')}.${item.name}`;
    wrapText(ctx, name, 330, 2).forEach((line, lineIndex) => {
      drawText(ctx, lineIndex === 0 ? line : `   ${line}`, 34, y, { size: 32 });
      if (lineIndex === 0) {
        drawText(ctx, String(item.quantity), 410, y, { size: 32, align: 'center' });
        drawText(ctx, '신규', 532, y, { size: 32, align: 'right' });
      }
      y += 42;
    });
  });
  y += 12;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(542, y);
  ctx.stroke();
  y += 44;
  const now = new Date();
  const printedAt = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  drawText(ctx, printedAt, 542, y, { size: 36, bold: true, align: 'right' });
  y += 44;
  ctx.font = '700 36px Arial, sans-serif';
  selectedAddressLines.forEach((line) => {
    drawText(ctx, line, 34, y, { size: 36, bold: true });
    y += 42;
  });
  y += 8;
  inputAddressLines.forEach((line) => {
    drawText(ctx, line, 34, y, { size: 36, bold: true });
    y += 42;
  });
  if (options?.orderSequence) {
    y += 16;
    drawText(ctx, `주문순서:${options.orderSequence}`, 34, y, { size: 40, bold: true });
  }

  return canvas.toDataURL('image/png');
}
