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
  requestNote?: string;
};

const selectedAddressLabels = ['선택주소', 'Selected address', 'Địa chỉ tùy chọn', '選択住所', 'ที่อยู่ที่เลือก'];
const inputAddressLabels = ['입력주소', 'Entered address', 'Địa chỉ nhập', '入力住所', 'ที่อยู่ที่ระบุ'];
const deliveryFeeLabels = ['배달비', 'Delivery fee', 'Phí ship', '配達費用', 'ค่าส่ง'];
const totalAmountLabels = ['최종결제금액', 'Total order amount', 'Tổng tiền thanh toán', '最終決済金額', 'ยอดชำระทั้งหมด'];
const paymentMethodLabels = ['결제방법', 'Payment method', 'Phương thức thanh toán', '決済方法', 'วิธีการชำระเงิน'];
const requestNoteLabels = ['추가요청사항', 'Additional request', 'Additional requests', 'Yêu cầu thêm', '追加リクエスト'];

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

function unwrapOuterParentheses(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return trimmed;

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0 && index < trimmed.length - 1) return trimmed;
  }

  return trimmed.slice(1, -1).trim();
}

function cleanOptionName(value: string) {
  return value
    .replace(/^[\s/·,|]+/, '')
    .replace(/[\s/·,|]+$/, '')
    .trim();
}

function parseDeliveryItemLine(line: string) {
  const quantityMatch = line.match(/\s*x\s*(\d+)\s*$/);
  if (!quantityMatch?.index) return null;

  const beforeQuantity = line.slice(0, quantityMatch.index).trim();
  const itemMatch = beforeQuantity.match(/^🍲\s*(.+?)\s+([\d,]+)\s*₫\s*(.*)$/);
  if (!itemMatch) return null;

  return {
    name: itemMatch[1].trim(),
    price: parseMoney(itemMatch[2]),
    optionText: unwrapOuterParentheses(itemMatch[3] || ''),
    quantity: Number(quantityMatch[1] || 1),
  };
}

function parseOptionItems(optionText: string, quantity: number): DeliveryShareItem[] {
  const optionRegex = /(.+?)\s*\+\s*([\d,]+)\s*₫/g;
  const options: DeliveryShareItem[] = [];

  for (const option of optionText.matchAll(optionRegex)) {
    const optionName = cleanOptionName(option[1] || '');
    const optionPrice = parseMoney(option[2] || '');
    if (optionName && optionPrice > 0) {
      options.push({ name: `(${optionName})`, quantity, amount: optionPrice * quantity });
    }
  }

  return options;
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
  ) return 'BANKING';

  if (
    rawMethod.includes('현금') ||
    /cash/i.test(rawMethod) ||
    rawMethod.toLowerCase().includes('tiền mặt') ||
    rawMethod.includes('現金') ||
    rawMethod.includes('เงินสด')
  ) return 'CASH';

  if (
    rawMethod.includes('카드') ||
    /card/i.test(rawMethod) ||
    rawMethod.toLowerCase().includes('thẻ') ||
    rawMethod.includes('カード') ||
    rawMethod.includes('บัตร')
  ) return 'CARD';

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
  const requestNote = valueAfterLabel(lines.find((line) => lineContainsAny(line, requestNoteLabels)) || '');
  const items: DeliveryShareItem[] = [];

  lines.filter((line) => line.startsWith('🍲')).forEach((line) => {
    const item = parseDeliveryItemLine(line);
    if (!item) return;

    items.push({ name: item.name, quantity: item.quantity, amount: item.price * item.quantity });
    items.push(...parseOptionItems(item.optionText, item.quantity));
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
    requestNote: requestNote || undefined,
  };
}

export function getDeliverySharePhoneDigits(order: DeliveryShareOrder) {
  return order.phone.replace(/[^\d]/g, '');
}

export function createDeliveryPrintHistoryData(order: DeliveryShareOrder, orderSequence: number) {
  return JSON.stringify({
    summary: `${order.paymentMethod} ${order.totalAmount.toLocaleString()}₫`,
    orderSequence,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
  });
}

export function getDeliveryPaymentMethodLabel(method?: string) {
  if (!method) return '미기록';
  if (/cash/i.test(method) || method.includes('현금')) return 'CASH';
  if (/bank|banking|transfer/i.test(method) || method.includes('계좌') || method.includes('이체')) return 'BANKING';
  if (/card/i.test(method) || method.includes('카드')) return 'CARD';
  return method;
}

export function getDeliveryPrintHistoryDetail(parsedData?: string) {
  if (!parsedData) return { paymentMethod: '미기록', totalAmount: null as number | null };
  try {
    const parsed = JSON.parse(parsedData) as {
      summary?: unknown;
      paymentMethod?: unknown;
      totalAmount?: unknown;
    };
    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
    const summaryAmount = summary.match(/([\d,]+)\s*₫/)?.[1];
    const summaryMethod = summary.replace(/[\d,]+\s*₫.*/, '').trim();
    const totalAmount = typeof parsed.totalAmount === 'number'
      ? parsed.totalAmount
      : summaryAmount
        ? Number(summaryAmount.replace(/,/g, ''))
        : null;
    const paymentMethod = typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod : summaryMethod;
    return { paymentMethod: getDeliveryPaymentMethodLabel(paymentMethod), totalAmount };
  } catch {
    const amount = parsedData.match(/([\d,]+)\s*₫/)?.[1];
    const method = parsedData.replace(/[\d,]+\s*₫.*/, '').trim();
    return {
      paymentMethod: getDeliveryPaymentMethodLabel(method),
      totalAmount: amount ? Number(amount.replace(/,/g, '')) : null,
    };
  }
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines?: number) {
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
  return typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines;
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

function drawCheckbox(ctx: CanvasRenderingContext2D, centerX: number, baselineY: number, size = 18) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(centerX - size / 2), Math.round(baselineY - size + 3), size, size);
  ctx.restore();
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

export function renderDeliveryShareReceipt(order: DeliveryShareOrder) { // 배달k공유 출력 (배달용 주문서)
  const rowHeight = 34; // 메뉴 한 줄의 세로 높이
  const left = 0; // 전체 가로선/메모박스의 왼쪽 끝
  const right = 576; // 전체 가로선/메모박스의 오른쪽 끝
  const checkX = 28; // 체크박스 가운데 위치
  const menuX = 58; // 메뉴명 시작 위치
  const qtyX = 486; // 수량 가운데 위치
  const amountX = 576; // 금액 오른쪽 정렬 위치
  const menuWidth = 398; // 메뉴명이 줄바꿈되는 최대 폭
  const menuTitleX = menuX + menuWidth / 2;
  const measure = makeCanvas(1).ctx;
  measure.font = '400 31px Arial, sans-serif';
  const selectedAddressLines = wrapText(measure, `⦁${order.selectedAddress}`, right - left, 4).length;
  const requestLines = order.requestNote ? wrapText(measure, `⦁ 추가요청사항 : ${order.requestNote}`, right - left, 3) : [];
  const itemHeight = order.items.reduce((sum, item) => {
    const { ctx } = makeCanvas(1);
    ctx.font = '400 27px Arial, sans-serif';
    return sum + wrapText(ctx, item.name, menuWidth).length * rowHeight;
  }, 0);
  const requestHeight = requestLines.length > 0 ? 44 + requestLines.length * 38 : 0;
  const height = 790 + itemHeight + selectedAddressLines * 38 + requestHeight;
  const { canvas, ctx } = makeCanvas(height);
  let y = 64;

  drawText(ctx, '배달K 주문 (Giao hàng)', left, y, { size: 34, bold: true });
  y += 34;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 38;

  ctx.font = '400 31px Arial, sans-serif';
  wrapText(ctx, `⦁ ${order.selectedAddress}`, right - left, 4).forEach((line) => {
    drawText(ctx, line, left, y, { size: 31 });
    y += 38;
  });
  drawText(ctx, `⦁ ${order.inputAddress}`, left, y, { size: 31 });
  y += 44;
  drawText(ctx, `⦁ ${order.phone}`, left, y, { size: 35, bold: true });
  if (requestLines.length > 0) {
    y += 44;
    requestLines.forEach((line) => {
      drawText(ctx, line, left, y, { size: 31 });
      y += 38;
    });
  }
  y += 26;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 44;

  drawText(ctx, '확인', checkX, y, { size: 24, align: 'center' });
  drawText(ctx, '메뉴', menuTitleX, y, { size: 24, align: 'center' });
  drawText(ctx, '수량', qtyX, y, { size: 24, align: 'center' });
  drawText(ctx, '금액', amountX, y, { size: 24, align: 'right' });
  y += 20;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 34;

  order.items.forEach((item) => {
    ctx.font = '400 27px Arial, sans-serif';
    const lines = wrapText(ctx, item.name, menuWidth);
    lines.forEach((line, index) => {
      if (index === 0) {
        drawCheckbox(ctx, checkX, y);
        drawText(ctx, line, menuX, y, { size: 27 });
        drawText(ctx, String(item.quantity), qtyX, y, { size: 27, align: 'center' });
        drawText(ctx, moneyToK(item.amount), amountX, y, { size: 27, align: 'right' });
      } else {
        drawText(ctx, line, menuX, y, { size: 27 });
      }
      y += rowHeight;
    });
  });

  drawText(ctx, '배달비', menuX, y + 8, { size: 27 });
  drawText(ctx, moneyToK(order.deliveryFee), amountX, y + 8, { size: 27, align: 'right' });
  y += 54;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 52;

  drawText(ctx, order.paymentMethod, menuX, y, { size: 31, bold: true });
  drawText(ctx, moneyToK(order.totalAmount), 342, y, { size: 38, bold: true, align: 'center' });
  drawText(ctx, `( ${moneyToK(nextChangeAmount(order.totalAmount))} )`, right, y, { size: 31, bold: true, align: 'right' });
  y += 28;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 42;
  drawText(ctx, 'MEMO', menuX, y, { size: 24 });
  y += 22;
  ctx.strokeRect(left, y, right - left, 148);
  y += 196;

  const now = new Date();
  const printedAt = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  drawText(ctx, printedAt, right, y, { size: 38, bold: true, align: 'right' });

  return canvas.toDataURL('image/png');
}

export function renderDeliveryKitchenOrder(order: DeliveryShareOrder, options?: { orderSequence?: number }) { // 배달k공유 출력 (주방용 주문서)
  const left = 0; // 전체 가로선의 왼쪽 끝
  const right = 576; // 전체 가로선의 오른쪽 끝
  const checkX = 28; // 체크박스 가운데 위치
  const menuX = 58; // 메뉴명 시작 위치
  const qtyX = 486; // 수량 가운데 위치
  const noteX = 576; // 비고 오른쪽 정렬 위치
  const menuWidth = 398; // 메뉴명이 줄바꿈되는 최대 폭
  const menuTitleX = menuX + menuWidth / 2;
  const measure = makeCanvas(1).ctx;
  measure.font = '400 27px Arial, sans-serif';
  const itemHeight = order.items.reduce((sum, item) => {
    return sum + Math.max(1, wrapText(measure, item.name, menuWidth).length) * 34;
  }, 0);
  measure.font = '700 36px Arial, sans-serif';
  const selectedAddressLines = wrapText(measure, order.selectedAddress, right - left, 5);
  const inputAddressLines = wrapText(measure, order.inputAddress, right - left, 3);
  const addressHeight = Math.max(1, selectedAddressLines.length + inputAddressLines.length) * 42 + 8;
  const height = 524 + itemHeight + addressHeight;
  const { canvas, ctx } = makeCanvas(height);
  let y = 72;

  drawText(ctx, '주문서 (주방)', 288, y, { size: 37, align: 'center' });
  y += 72;
  drawText(ctx, '배달K 주문 (Bếp)', left, y, { size: 42 });
  y += 34;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 44;

  drawText(ctx, '확인', checkX, y, { size: 24, align: 'center' });
  drawText(ctx, '메  뉴', menuTitleX, y, { size: 24, align: 'center' });
  drawText(ctx, '수량', qtyX, y, { size: 24, align: 'center' });
  drawText(ctx, '비고', noteX, y, { size: 24, align: 'right' });
  y += 20;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 34;

  order.items.forEach((item) => {
    ctx.font = '400 27px Arial, sans-serif';
    wrapText(ctx, item.name, menuWidth).forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        drawCheckbox(ctx, checkX, y);
        drawText(ctx, line, menuX, y, { size: 27 });
        drawText(ctx, String(item.quantity), qtyX, y, { size: 27, align: 'center' });
        drawText(ctx, '신규', noteX, y, { size: 27, align: 'right' });
      } else {
        drawText(ctx, line, menuX, y, { size: 27 });
      }
      y += 34;
    });
  });
  y += 12;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 44;
  const now = new Date();
  const printedAt = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  drawText(ctx, printedAt, right, y, { size: 36, bold: true, align: 'right' });
  y += 44;
  ctx.font = '700 36px Arial, sans-serif';
  selectedAddressLines.forEach((line) => {
    drawText(ctx, line, left, y, { size: 36, bold: true });
    y += 42;
  });
  y += 8;
  inputAddressLines.forEach((line) => {
    drawText(ctx, line, left, y, { size: 36, bold: true });
    y += 42;
  });
  if (options?.orderSequence) {
    y += 16;
    drawText(ctx, `주문순서:${options.orderSequence}`, left, y, { size: 40, bold: true });
  }

  return canvas.toDataURL('image/png');
}
