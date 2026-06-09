'use client';

type MiniReceiptStore = {
  name: string;
  businessRegNo?: string | null;
  address?: string | null;
  representativeName?: string | null;
  contact?: string | null;
};

type MiniReceiptItem = {
  menu_code?: string;
  name: string;
  price: number;
  quantity: number;
};

type ReceiptSettings = {
  businessRegNo: boolean;
  address: boolean;
  representativeName: boolean;
  contact: boolean;
};

function makeCanvas(height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 576;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.lineWidth = 2;
  return { canvas, ctx };
}

function setFont(ctx: CanvasRenderingContext2D, size: number, bold = false, condensed = false) {
  ctx.font = `${bold ? '700' : '400'} ${size}px ${condensed ? 'Arial Narrow, ' : ''}Arial, sans-serif`;
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options?: {
  size?: number;
  bold?: boolean;
  align?: CanvasTextAlign;
  condensed?: boolean;
}) {
  setFont(ctx, options?.size ?? 28, options?.bold ?? false, options?.condensed ?? false);
  ctx.textAlign = options?.align ?? 'left';
  ctx.fillText(text, x, y);
}

function drawRightFit(ctx: CanvasRenderingContext2D, text: string, right: number, y: number, maxWidth: number, size: number) {
  let nextSize = size;
  setFont(ctx, nextSize);
  while (nextSize > 18 && ctx.measureText(text).width > maxWidth) {
    nextSize -= 1;
    setFont(ctx, nextSize);
  }
  ctx.textAlign = 'right';
  ctx.fillText(text, right, y);
}

function line(ctx: CanvasRenderingContext2D, y: number) {
  ctx.beginPath();
  ctx.moveTo(28, y);
  ctx.lineTo(548, y);
  ctx.stroke();
}

function money(amount: number) {
  return amount.toLocaleString();
}

function moneyK(amount: number) {
  const value = amount / 1000;
  return `${Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
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
  return lines;
}

export function renderMiniKitchenOrder(params: {
  tableName: string;
  orderSequence: number;
  printedAt: string;
  note?: string | null;
  items: MiniReceiptItem[];
}) {
  const measure = makeCanvas(1).ctx;
  setFont(measure, 31, false, true);
  const itemHeight = params.items.reduce((sum, item) => {
    const name = `${item.menu_code ? `${item.menu_code}.` : ''}${item.name}`;
    return sum + Math.max(1, wrapText(measure, name, 330).length) * 38;
  }, 0);
  const height = 440 + itemHeight + (params.note ? 48 : 0);
  const { canvas, ctx } = makeCanvas(height);
  let y = 70;

  drawText(ctx, '주문서 (주방)', 288, y, { size: 38, align: 'center', condensed: true });
  y += 70;
  drawText(ctx, `테이블:${params.tableName}`, 28, y, { size: 48, condensed: true });
  y += 30;
  line(ctx, y);
  y += 48;
  drawText(ctx, '메  뉴', 44, y, { size: 27, condensed: true });
  drawText(ctx, '수량', 430, y, { size: 27, align: 'center', condensed: true });
  drawText(ctx, '비고', 542, y, { size: 27, align: 'right', condensed: true });
  y += 24;
  line(ctx, y);
  y += 42;

  params.items.forEach((item) => {
    const name = `${item.menu_code ? `${item.menu_code}.` : ''}${item.name}`;
    setFont(ctx, 31, false, true);
    const lines = wrapText(ctx, name, 330);
    lines.forEach((text, index) => {
      drawText(ctx, index === 0 ? text : `   ${text}`, 28, y, { size: 31, condensed: true });
      if (index === 0) {
        drawText(ctx, String(item.quantity), 430, y, { size: 31, align: 'center', condensed: true });
        drawText(ctx, '신규', 542, y, { size: 31, align: 'right', condensed: true });
      }
      y += 38;
    });
  });

  y += 8;
  line(ctx, y);
  y += 42;
  drawText(ctx, params.printedAt, 542, y, { size: 36, bold: true, align: 'right', condensed: true });
  y += 38;
  drawText(ctx, `주문순서:${params.orderSequence}`, 28, y, { size: 40, bold: true, condensed: true });
  if (params.note) {
    y += 38;
    drawText(ctx, `메모:${params.note}`, 28, y, { size: 28, condensed: true });
  }

  return canvas.toDataURL('image/png');
}

export function renderMiniPaymentReceipt(params: {
  store: MiniReceiptStore;
  tableName: string;
  printedAt: string;
  paymentMethod: string;
  settings: ReceiptSettings;
  items: MiniReceiptItem[];
}) {
  const infoRows = [
    params.settings.businessRegNo ? `사업자번호 : ${params.store.businessRegNo || ''}` : '',
    params.settings.address ? `주소 : ${params.store.address || ''}` : '',
    params.settings.representativeName ? `성명 : ${params.store.representativeName || params.store.name}` : '',
    params.settings.contact ? `전화 : ${params.store.contact || ''}` : '',
  ].filter(Boolean);
  const measure = makeCanvas(1).ctx;
  setFont(measure, 24, false, true);
  const itemHeight = params.items.reduce((sum, item) => {
    const name = `${item.menu_code ? `${item.menu_code}.` : ''}${item.name}`;
    return sum + Math.max(1, wrapText(measure, name, 260).length) * 32 + 4;
  }, 0);
  const height = 700 + infoRows.length * 32 + itemHeight;
  const { canvas, ctx } = makeCanvas(height);
  let y = 68;

  drawText(ctx, `${params.store.name || 'RESTAURANT'} (${params.tableName})`, 288, y, {
    size: 34,
    bold: true,
    align: 'center',
    condensed: true,
  });
  y += 76;

  infoRows.forEach((row) => {
    drawText(ctx, row, 28, y, { size: 28, condensed: true });
    y += 32;
  });

  y += 10;
  line(ctx, y);
  y += 40;
  drawText(ctx, '품명', 28, y, { size: 27, condensed: true });
  drawText(ctx, '단가', 374, y, { size: 27, align: 'right', condensed: true });
  drawText(ctx, '수량', 438, y, { size: 27, align: 'center', condensed: true });
  drawText(ctx, '금액', 542, y, { size: 27, align: 'right', condensed: true });
  y += 24;
  line(ctx, y);
  y += 38;

  params.items.forEach((item) => {
    const amount = item.price * item.quantity;
    const name = `${item.menu_code ? `${item.menu_code}.` : ''}${item.name}`;
    setFont(ctx, 24, false, true);
    const lines = wrapText(ctx, name, 260);

    lines.forEach((text, index) => {
      drawText(ctx, index === 0 ? text : `   ${text}`, 28, y, { size: 24, condensed: true });
      if (index === 0) {
        drawRightFit(ctx, moneyK(item.price), 374, y, 62, 23);
        drawText(ctx, String(item.quantity), 438, y, { size: 24, align: 'center', condensed: true });
        drawRightFit(ctx, moneyK(amount), 542, y, 86, 23);
      }
      y += 32;
    });
    y += 4;
  });

  const taxableTotal = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vat = Math.round(taxableTotal * 0.08);
  const receiptTotal = taxableTotal + vat;

  line(ctx, y);
  y += 46;
  drawText(ctx, '소  계:', 28, y, { size: 30, bold: true, condensed: true });
  drawRightFit(ctx, money(taxableTotal), 542, y, 170, 30);
  y += 38;
  line(ctx, y);
  y += 42;
  drawText(ctx, '부가세 과세 물품가액:', 28, y, { size: 28, condensed: true });
  drawRightFit(ctx, money(taxableTotal), 542, y, 170, 28);
  y += 34;
  drawText(ctx, '부      가      세:', 28, y, { size: 28, condensed: true });
  drawRightFit(ctx, money(vat), 542, y, 170, 28);
  y += 34;
  drawText(ctx, '부가세 면세 물품가액:', 28, y, { size: 28, condensed: true });
  drawRightFit(ctx, '0', 542, y, 170, 28);
  y += 34;
  line(ctx, y);
  y += 58;
  drawText(ctx, `${params.paymentMethod}:`, 28, y, { size: 42, bold: true, condensed: true });
  drawRightFit(ctx, money(receiptTotal), 542, y, 210, 42);
  y += 38;
  line(ctx, y);
  y += 48;
  drawText(ctx, params.printedAt, 542, y, { size: 25, align: 'right', condensed: true });

  return canvas.toDataURL('image/png');
}
