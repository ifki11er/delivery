package com.baedalk.printapp

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import java.io.IOException
import java.io.OutputStream
import java.util.UUID
import org.json.JSONArray

@SuppressLint("MissingPermission")
class BluetoothPrinterManager(private val context: Context) {

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    // 영수증 프린터 통신을 위한 표준 SPP (Serial Port Profile) UUID
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    fun isBluetoothEnabled(): Boolean {
        return bluetoothAdapter?.isEnabled == true
    }

    fun getPairedPrinters(): List<Map<String, String>> {
        val printers = mutableListOf<Map<String, String>>()
        try {
            val pairedDevices: Set<BluetoothDevice>? = bluetoothAdapter?.bondedDevices
            pairedDevices?.forEach { device ->
                printers.add(mapOf("name" to (device.name ?: "Unknown"), "mac" to device.address))
            }
        } catch (e: SecurityException) {
            Log.e("BluetoothPrinter", "블루투스 권한이 아직 허용되지 않았습니다.", e)
        }
        return printers
    }

    fun connectPrinter(macAddress: String): Boolean {
        return try {
            val device = bluetoothAdapter?.getRemoteDevice(macAddress)
            bluetoothSocket = device?.createRfcommSocketToServiceRecord(SPP_UUID)
            bluetoothAdapter?.cancelDiscovery()
            bluetoothSocket?.connect()
            outputStream = bluetoothSocket?.outputStream
            Log.d("BluetoothPrinter", "프린터 연결 성공: $macAddress")
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "프린터 연결 실패", e)
            disconnect()
            false
        }
    }

    fun disconnect() {
        try {
            outputStream?.close()
            bluetoothSocket?.close()
        } catch (e: IOException) {
            Log.e("BluetoothPrinter", "연결 해제 중 오류", e)
        } finally {
            outputStream = null
            bluetoothSocket = null
        }
    }

    private fun ensureConnected(): Boolean {
        if (outputStream != null) return true
        if (!isBluetoothEnabled()) return false

        val prefs = context.getSharedPreferences("PrintAppPrefs", Context.MODE_PRIVATE)
        val defaultPrinter = prefs.getString("default_printer", "") ?: ""
        if (defaultPrinter.isBlank()) return false

        return connectPrinter(defaultPrinter)
    }

    fun printTestReceipt(): Boolean {
        if (!ensureConnected()) return false
        return try {
            // ESC/POS 초기화 (Initialize Printer)
            outputStream?.write(byteArrayOf(0x1B, 0x40)) 
            
            // 가운데 정렬 (Align Center)
            outputStream?.write(byteArrayOf(0x1B, 0x61, 0x01)) 
            
            val text = "\n\n=== Baedalk Print Test ===\n\nHPRT TP80N-M\nConnection Success!\n\n\n\n\n\n"
            // 일단 영어로 먼저 테스트 (한글은 추후 EUC-KR 설정 필요)
            outputStream?.write(text.toByteArray(Charsets.US_ASCII))
            
            // 용지 컷팅 (Cut Paper)
            feedAndCut()
            
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "인쇄 실패", e)
            false
        }
    }

    private fun textToBitmap(text: String, fontSize: Float = 28f, bold: Boolean = false): Bitmap {
        val width = 576 // 80mm 프린터 표준 픽셀 넓이
        val textPaint = TextPaint().apply {
            color = Color.BLACK
            textSize = fontSize
            typeface = Typeface.create(Typeface.SANS_SERIF, if (bold) Typeface.BOLD else Typeface.NORMAL)
            isAntiAlias = true
        }

        // 텍스트를 줄바꿈 처리를 위해 StaticLayout 사용
        val staticLayout = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            StaticLayout.Builder.obtain(text, 0, text.length, textPaint, width - 20)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(0f, 1.2f)
                .setIncludePad(false)
                .build()
        } else {
            @Suppress("DEPRECATION")
            StaticLayout(text, textPaint, width - 20, Layout.Alignment.ALIGN_NORMAL, 1.2f, 0f, false)
        }

        val height = staticLayout.height + 40
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE) // 배경은 흰색
        
        canvas.translate(10f, 20f) // 좌상단 약간의 여백
        staticLayout.draw(canvas)

        return bitmap
    }

    private data class KitchenOrderItem(
        val menuCode: String,
        val name: String,
        val quantity: Int,
        val note: String
    )

    private data class PaymentReceiptItem(
        val menuCode: String,
        val name: String,
        val price: Int,
        val quantity: Int,
        val amount: Int
    )

    private data class DeliveryShareItem(
        val name: String,
        val quantity: Int,
        val amount: Int
    )

    private data class DeliveryShareOrder(
        val nickname: String,
        val selectedAddress: String,
        val inputAddress: String,
        val phone: String,
        val items: List<DeliveryShareItem>,
        val deliveryFee: Int,
        val totalAmount: Int,
        val paymentMethod: String
    )

    private fun makeKitchenPaint(size: Float, bold: Boolean, scaleX: Float = 0.82f): TextPaint {
        return TextPaint().apply {
            color = Color.BLACK
            textSize = size
            typeface = Typeface.create("sans-serif-condensed", if (bold) Typeface.BOLD else Typeface.NORMAL)
            textScaleX = scaleX
            isAntiAlias = true
        }
    }

    private fun Canvas.drawCenteredText(text: String, y: Float, paint: TextPaint, width: Int) {
        val x = (width - paint.measureText(text)) / 2f
        drawText(text, x, y, paint)
    }

    private fun Canvas.drawFitText(text: String, x: Float, y: Float, maxWidth: Float, paint: TextPaint) {
        var displayText = text
        while (displayText.length > 2 && paint.measureText(displayText) > maxWidth) {
            displayText = displayText.dropLast(1)
        }
        if (displayText != text && displayText.length > 1) {
            displayText = displayText.dropLast(1)
        }
        drawText(displayText, x, y, paint)
    }

    private fun wrapTextToLines(text: String, maxWidth: Float, paint: TextPaint, maxLines: Int): List<String> {
        if (text.isBlank()) return listOf("")

        val lines = mutableListOf<String>()
        var remaining = text

        while (remaining.isNotEmpty() && lines.size < maxLines) {
            var end = remaining.length
            while (end > 1 && paint.measureText(remaining.take(end)) > maxWidth) {
                end--
            }

            if (lines.size == maxLines - 1 && end < remaining.length) {
                var shortened = remaining.take(end).trimEnd()
                while (shortened.length > 1 && paint.measureText("$shortened...") > maxWidth) {
                    shortened = shortened.dropLast(1).trimEnd()
                }
                lines.add("$shortened...")
                remaining = ""
            } else {
                lines.add(remaining.take(end).trimEnd())
                remaining = remaining.drop(end).trimStart()
            }
        }

        return lines
    }

    private fun wrapTextFully(text: String, maxWidth: Float, paint: TextPaint): List<String> {
        if (text.isBlank()) return listOf("")

        val lines = mutableListOf<String>()
        var remaining = text

        while (remaining.isNotEmpty()) {
            var end = remaining.length
            while (end > 1 && paint.measureText(remaining.take(end)) > maxWidth) {
                end--
            }
            lines.add(remaining.take(end).trimEnd())
            remaining = remaining.drop(end).trimStart()
        }

        return lines
    }

    private fun Canvas.drawRightText(text: String, right: Float, y: Float, paint: TextPaint) {
        drawText(text, right - paint.measureText(text), y, paint)
    }

    private fun Canvas.drawCenteredAt(text: String, centerX: Float, y: Float, paint: TextPaint) {
        drawText(text, centerX - (paint.measureText(text) / 2f), y, paint)
    }

    private fun Canvas.drawReceiptAmountRow(
        y: Float,
        item: PaymentReceiptItem,
        priceRight: Float,
        quantityCenter: Float,
        amountRight: Float,
        paint: TextPaint
    ) {
        val amountText = formatReceiptMoney(item.amount)
        val amountPaint = TextPaint(paint)
        while (amountPaint.textSize > 26f && amountPaint.measureText(amountText) > 96f) {
            amountPaint.textSize -= 1f
        }

        drawRightText(formatReceiptMoney(item.price), priceRight, y, paint)
        drawCenteredAt(item.quantity.toString(), quantityCenter, y, paint)
        drawRightText(amountText, amountRight, y, amountPaint)
    }

    private fun drawHorizontalLine(canvas: Canvas, y: Float, width: Int, paint: TextPaint) {
        canvas.drawLine(42f, y, width - 42f, y, paint)
    }

    private fun kitchenOrderToBitmap(
        tableName: String,
        orderSequence: Int,
        printedAt: String,
        items: List<KitchenOrderItem>
    ): Bitmap {
        val width = 576
        val titlePaint = makeKitchenPaint(40f, false, 0.86f)
        val tablePaint = makeKitchenPaint(64f, false, 0.78f)
        val headerPaint = makeKitchenPaint(40f, false, 0.82f)
        val itemPaint = makeKitchenPaint(42f, false, 0.78f)
        val sequencePaint = makeKitchenPaint(56f, true, 0.78f)
        val linePaint = makeKitchenPaint(1f, false).apply {
            strokeWidth = 3f
        }

        val kitchenNameMaxWidth = 342f
        val kitchenItemLineHeight = 54f
        val kitchenItemGap = 14f
        val itemAreaHeight = items.mapIndexed { index, item ->
            val name = "${item.menuCode.takeIf { it.isNotBlank() }?.let { "$it." } ?: ""}${item.name}"
            val lineCount = wrapTextToLines(name, kitchenNameMaxWidth, itemPaint, 2).size.coerceAtLeast(1)
            ((lineCount * kitchenItemLineHeight) + kitchenItemGap).toInt()
        }.sum().coerceAtLeast(66)
        val height = 540 + itemAreaHeight
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        var y = 72f
        canvas.drawCenteredText("주문서 (주방)", y, titlePaint, width)

        y += 82f
        canvas.drawFitText("테이블:$tableName", 42f, y, width - 84f, tablePaint)

        y += 34f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 58f
        canvas.drawText("메   뉴", 42f, y, headerPaint)
        canvas.drawText("수량", 382f, y, headerPaint)
        canvas.drawText("비고", 486f, y, headerPaint)

        y += 28f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 58f
        items.forEach { item ->
            val name = "${item.menuCode.takeIf { it.isNotBlank() }?.let { "$it." } ?: ""}${item.name}"
            val nameLines = wrapTextToLines(name, kitchenNameMaxWidth, itemPaint, 2)
            nameLines.forEachIndexed { lineIndex, line ->
                val prefix = if (lineIndex == 0) "" else "   "
                canvas.drawText("$prefix$line", 42f, y + (lineIndex.toFloat() * kitchenItemLineHeight), itemPaint)
            }
            canvas.drawText(item.quantity.toString(), 400f, y, itemPaint)
            canvas.drawText(item.note.ifBlank { "신규" }, 488f, y, itemPaint)
            y += (nameLines.size.coerceAtLeast(1) * kitchenItemLineHeight) + kitchenItemGap
        }

        y -= 18f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 52f
        canvas.drawRightText(printedAt, width - 42f, y, sequencePaint)

        y += 76f
        canvas.drawText("주문순서:$orderSequence", 42f, y, sequencePaint)

        return bitmap
    }

    private fun formatReceiptMoney(amount: Int): String {
        return "%,d".format(amount)
    }

    private fun paymentReceiptToBitmap(
        storeName: String,
        tableName: String,
        businessRegNo: String,
        address: String,
        representativeName: String,
        contact: String,
        printedAt: String,
        paymentMethod: String,
        taxableTotal: Int,
        vat: Int,
        receiptTotal: Int,
        items: List<PaymentReceiptItem>
    ): Bitmap {
        val width = 576
        val titlePaint = makeKitchenPaint(40f, true, 0.82f)
        val infoPaint = makeKitchenPaint(31f, false, 0.82f)
        val headerPaint = makeKitchenPaint(34f, false, 0.82f)
        val itemPaint = makeKitchenPaint(29f, false, 0.82f)
        val amountPaint = makeKitchenPaint(29f, false, 0.82f)
        val totalLabelPaint = makeKitchenPaint(42f, true, 0.82f)
        val totalAmountPaint = makeKitchenPaint(48f, true, 0.78f)
        val linePaint = makeKitchenPaint(1f, false).apply {
            strokeWidth = 3f
        }

        val itemNameMaxWidth = 230f
        val itemRowHeight = 36f
        val itemBlockGap = 16f
        val itemAreaHeight = items.sumOf { item ->
            val name = "${item.menuCode.takeIf { it.isNotBlank() }?.let { "$it." } ?: ""}${item.name}"
            val lineCount = wrapTextToLines(name, itemNameMaxWidth, itemPaint, 2).size.coerceAtLeast(1)
            ((lineCount * itemRowHeight) + itemBlockGap).toInt()
        }.coerceAtLeast(56)
        val height = 1320 + itemAreaHeight
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        var y = 74f
        canvas.drawCenteredText(storeName.ifBlank { "RESTAURANT" }.uppercase(), y, titlePaint, width)

        y += 96f
        canvas.drawFitText(tableName, 42f, y, width - 84f, infoPaint)
        y += 34f
        canvas.drawFitText("사업자번호 :$businessRegNo", 42f, y, width - 84f, infoPaint)
        y += 34f
        canvas.drawFitText("주소 :$address", 42f, y, width - 84f, infoPaint)
        y += 34f
        canvas.drawFitText("성명 :${representativeName.ifBlank { storeName }}", 42f, y, width - 84f, infoPaint)
        y += 34f
        canvas.drawFitText("전화 :$contact", 42f, y, width - 84f, infoPaint)
        y += 34f
        canvas.drawFitText("일자 : $printedAt", 42f, y, width - 84f, infoPaint)

        y += 28f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 50f
        canvas.drawText("품명", 42f, y, headerPaint)
        canvas.drawText("단가", 292f, y, headerPaint)
        canvas.drawText("수량", 398f, y, headerPaint)
        canvas.drawText("금액", 502f, y, headerPaint)

        y += 24f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 48f
        items.forEach { item ->
            val name = "${item.menuCode.takeIf { it.isNotBlank() }?.let { "$it." } ?: ""}${item.name}"
            val nameLines = wrapTextToLines(name, itemNameMaxWidth, itemPaint, 2)
            nameLines.forEachIndexed { lineIndex, line ->
                val prefix = if (lineIndex == 0) "" else "   "
                canvas.drawText("$prefix$line", 42f, y + (lineIndex.toFloat() * itemRowHeight), itemPaint)
            }
            canvas.drawReceiptAmountRow(y, item, 356f, 410f, 544f, amountPaint)
            y += (nameLines.size.coerceAtLeast(1) * itemRowHeight) + itemBlockGap
        }

        y -= 12f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 58f
        canvas.drawText("소  계:", 42f, y, totalLabelPaint)
        canvas.drawRightText(formatReceiptMoney(receiptTotal), 534f, y, totalLabelPaint)

        y += 34f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 52f
        canvas.drawText("품명 앞에 * 표시가 되어있는 품목은", 42f, y, infoPaint)
        y += 38f
        canvas.drawText("부가세 면세 품목입니다.", 42f, y, infoPaint)
        y += 42f
        canvas.drawText("부가세 과세 물품가액:", 42f, y, infoPaint)
        canvas.drawRightText(formatReceiptMoney(taxableTotal), 534f, y, infoPaint)
        y += 38f
        canvas.drawText("부      가      세:", 42f, y, infoPaint)
        canvas.drawRightText(formatReceiptMoney(vat), 534f, y, infoPaint)
        y += 38f
        canvas.drawText("부가세 면세 물품가액:", 42f, y, infoPaint)
        canvas.drawRightText("0", 534f, y, infoPaint)

        y += 34f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 54f
        canvas.drawText("청구금액:", 42f, y, infoPaint)
        canvas.drawRightText(formatReceiptMoney(receiptTotal), 534f, y, infoPaint)
        y += 38f
        canvas.drawText("받은금액:", 42f, y, infoPaint)
        canvas.drawRightText(formatReceiptMoney(receiptTotal), 534f, y, infoPaint)
        y += 38f
        canvas.drawText("거스름돈:", 42f, y, infoPaint)
        canvas.drawRightText("0", 534f, y, infoPaint)

        y += 34f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 78f
        canvas.drawText("${paymentMethod.ifBlank { "현금" }}:", 42f, y, totalAmountPaint)
        canvas.drawRightText(formatReceiptMoney(receiptTotal), 534f, y, totalAmountPaint)

        y += 34f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 58f
        canvas.drawText("정성을 다하겠습니다.", 42f, y, infoPaint)
        y += 38f
        canvas.drawText("계산자 : 관리자", 42f, y, infoPaint)

        return bitmap
    }

    private fun parseMoneyToInt(value: String): Int {
        return value.replace(Regex("[^0-9]"), "").toIntOrNull() ?: 0
    }

    private fun formatK(amount: Int): String {
        return "${amount / 1000}k"
    }

    private fun normalizePhone(rawPhone: String): String {
        val digits = rawPhone.replace(Regex("[^0-9]"), "")
        val local = when {
            digits.startsWith("84") -> "0${digits.drop(2)}"
            digits.startsWith("0") -> digits
            else -> "0$digits"
        }

        return if (local.length >= 10) {
            "${local.take(3)} ${local.drop(3).take(3)} ${local.drop(6)}"
        } else {
            local
        }
    }

    private fun compactSelectedAddress(rawAddress: String): String {
        fun stripCityCountry(value: String): String {
            return value
                .replace(Regex("(?i)\\b(vietnam|viet nam)\\b"), "")
                .replace(Regex("(?i)\\b(ho chi minh city|ho chi minh|hcm)\\b"), "")
                .replace("베트남", "")
                .replace("호찌민시", "")
                .replace("호치민시", "")
                .replace("호찌민", "")
                .replace("호치민", "")
                .replace(Regex("\\s{2,}"), " ")
                .trim()
        }

        val parts = stripCityCountry(rawAddress).split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .toMutableList()

        while (parts.isNotEmpty()) {
            val last = parts.last().lowercase()
            val shouldDrop = last.contains("vietnam") ||
                last.contains("ho chi minh") ||
                last.contains("hồ chí minh") ||
                last.contains("hcm") ||
                last.contains("베트남") ||
                last.contains("호찌민") ||
                last.contains("호치민")
            if (!shouldDrop) break
            parts.removeAt(parts.lastIndex)
        }

        return parts.joinToString(", ")
    }

    private fun normalizePaymentMethod(rawMethod: String): String {
        return when {
            rawMethod.contains("계좌") || rawMethod.contains("이체") || rawMethod.contains("bank", ignoreCase = true) -> "Banking"
            rawMethod.contains("현금") || rawMethod.contains("cash", ignoreCase = true) -> "Cash"
            rawMethod.contains("카드") || rawMethod.contains("card", ignoreCase = true) -> "Card"
            else -> rawMethod.trim().ifBlank { "Unknown" }
        }
    }

    private fun calculateChange(totalAmount: Int): Int {
        if (totalAmount <= 0) return 0
        val billUnit = 500_000
        val paid = ((totalAmount + billUnit - 1) / billUnit) * billUnit
        return paid - totalAmount
    }

    private fun parseDeliveryShareOrder(rawText: String): DeliveryShareOrder? {
        val lines = rawText.lineSequence().map { it.trim() }.filter { it.isNotBlank() }.toList()
        val selectedAddress = lines.firstOrNull { it.contains("선택주소") }
            ?.substringAfter(":")
            ?.trim()
        val inputAddress = lines.firstOrNull { it.contains("입력주소") }
            ?.substringAfter(":")
            ?.trim()
        val phone = lines.firstOrNull { it.contains("📞") || it.startsWith("+") }
            ?.replace("📞", "")
            ?.trim()
        val deliveryFee = lines.firstOrNull { it.startsWith("배달비") }
            ?.substringAfter(":")
            ?.let { parseMoneyToInt(it) }
        val totalAmount = lines.firstOrNull { it.startsWith("최종결제금액") }
            ?.substringAfter(":")
            ?.let { parseMoneyToInt(it) }
        val rawPayment = lines.firstOrNull { it.startsWith("결제방법") }
            ?.substringAfter(":")
            ?.substringBefore("(")
            ?.trim()

        if (
            selectedAddress.isNullOrBlank() ||
            inputAddress.isNullOrBlank() ||
            phone.isNullOrBlank() ||
            deliveryFee == null ||
            totalAmount == null ||
            rawPayment.isNullOrBlank()
        ) {
            return null
        }

        val itemRegex = Regex("""^🍲\s*(.+?)\s+([\d,]+)\s*₫(?:\s*\((.+)\))?\s*x\s*(\d+)\s*$""")
        val optionRegex = Regex("""([^+()]+?)\s*\+([\d,]+)\s*₫""")
        val items = mutableListOf<DeliveryShareItem>()

        lines.filter { it.startsWith("🍲") }.forEach { line ->
            val match = itemRegex.find(line) ?: return@forEach
            val name = match.groupValues[1].trim()
            val price = parseMoneyToInt(match.groupValues[2])
            val optionText = match.groupValues.getOrNull(3)?.trim() ?: ""
            val quantity = match.groupValues[4].toIntOrNull() ?: 1
            items.add(DeliveryShareItem(name, quantity, price * quantity))

            optionRegex.findAll(optionText).forEach { optionMatch ->
                val optionName = optionMatch.groupValues[1].trim()
                val optionPrice = parseMoneyToInt(optionMatch.groupValues[2])
                if (optionName.isNotBlank() && optionPrice > 0) {
                    items.add(DeliveryShareItem("($optionName)", quantity, optionPrice * quantity))
                }
            }
        }

        if (items.isEmpty()) return null

        return DeliveryShareOrder(
            nickname = "닉네임 정보 없음",
            selectedAddress = compactSelectedAddress(selectedAddress),
            inputAddress = inputAddress,
            phone = normalizePhone(phone),
            items = items,
            deliveryFee = deliveryFee,
            totalAmount = totalAmount,
            paymentMethod = normalizePaymentMethod(rawPayment)
        )
    }

    private fun deliveryShareOrderToBitmap(order: DeliveryShareOrder): Bitmap {
        val width = 576
        val left = 24f
        val right = width - 24f
        val nicknamePaint = makeKitchenPaint(42f, true, 0.82f)
        val infoPaint = makeKitchenPaint(42f, false, 0.82f)
        val phonePaint = makeKitchenPaint(62f, true, 0.78f)
        val headerPaint = makeKitchenPaint(29f, false, 0.82f)
        val itemPaint = makeKitchenPaint(31f, false, 0.82f)
        val itemAmountPaint = makeKitchenPaint(31f, false, 0.82f)
        val totalLabelPaint = makeKitchenPaint(35f, true, 0.82f)
        val totalPaint = makeKitchenPaint(43f, true, 0.78f)
        val memoPaint = makeKitchenPaint(29f, false, 0.82f)
        val linePaint = makeKitchenPaint(1f, false).apply {
            strokeWidth = 2f
        }
        val memoBorderPaint = TextPaint().apply {
            color = Color.BLACK
            strokeWidth = 1f
            style = Paint.Style.STROKE
            isAntiAlias = true
        }

        val addressLines = wrapTextFully("⦁ ${order.selectedAddress}", right - left, infoPaint)
        val inputLines = wrapTextFully("⦁ ${order.inputAddress}", right - left, infoPaint)
        val itemNameWidth = 350f
        val itemLineHeight = 38f
        val itemLineCount = order.items.sumOf { item ->
            wrapTextToLines("⦁ ${item.name}", itemNameWidth, itemPaint, 2).size
        }
        val height = (
            570 +
                (addressLines.size * 58) +
                (inputLines.size * 58) +
                (itemLineCount * itemLineHeight).toInt() +
                150
            ).coerceAtLeast(900)

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        var y = 76f
        canvas.drawText(order.nickname, left, y, nicknamePaint)
        y += 32f
        canvas.drawLine(left, y, right, y, linePaint)

        y += 44f
        addressLines.forEach { line ->
            canvas.drawText(line, left, y, infoPaint)
            y += 58f
        }
        y += 10f
        inputLines.forEach { line ->
            canvas.drawText(line, left, y, infoPaint)
            y += 58f
        }
        y += 10f
        canvas.drawText("⦁ ${order.phone}", left, y, phonePaint)

        y += 28f
        canvas.drawLine(left, y, right, y, linePaint)

        y += 48f
        canvas.drawText("메뉴", 104f, y, headerPaint)
        canvas.drawText("수량", 410f, y, headerPaint)
        canvas.drawText("금액", 500f, y, headerPaint)
        y += 18f
        canvas.drawLine(left, y, right, y, linePaint)

        y += 34f
        order.items.forEach { item ->
            val lines = wrapTextToLines("⦁ ${item.name}", itemNameWidth, itemPaint, 2)
            lines.forEachIndexed { index, line ->
                canvas.drawText(if (index == 0) line else "   $line", left + 10f, y, itemPaint)
                if (index == 0) {
                    canvas.drawCenteredAt(item.quantity.toString(), 430f, y, itemAmountPaint)
                    canvas.drawRightText(formatK(item.amount), right, y, itemAmountPaint)
                }
                y += itemLineHeight
            }
        }

        y += 12f
        canvas.drawText("배달비", left + 28f, y, itemPaint)
        canvas.drawRightText(formatK(order.deliveryFee), right, y, itemAmountPaint)

        y += 42f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 52f
        canvas.drawText(order.paymentMethod, left + 20f, y, totalLabelPaint)
        val change = calculateChange(order.totalAmount)
        canvas.drawRightText("${formatK(order.totalAmount)}  ( ${formatK(change)} )", right - 8f, y, totalPaint)

        y += 34f
        canvas.drawLine(left, y, right, y, linePaint)
        y += 42f
        canvas.drawText("MEMO", left + 28f, y, memoPaint)
        y += 18f
        canvas.drawRect(left, y, right, y + 160f, memoBorderPaint)

        return bitmap
    }

    private fun deliveryShareKitchenToBitmap(order: DeliveryShareOrder): Bitmap {
        val width = 576
        val left = 32f
        val right = width - 32f
        val titlePaint = makeKitchenPaint(40f, false, 0.86f)
        val tablePaint = makeKitchenPaint(58f, false, 0.78f)
        val headerPaint = makeKitchenPaint(38f, false, 0.82f)
        val itemPaint = makeKitchenPaint(42f, false, 0.78f)
        val metaPaint = makeKitchenPaint(34f, false, 0.82f)
        val linePaint = makeKitchenPaint(1f, false).apply {
            strokeWidth = 3f
        }
        val itemNameWidth = 342f
        val itemLineHeight = 54f
        val itemGap = 14f
        val itemAreaHeight = order.items.sumOf { item ->
            val lineCount = wrapTextToLines(item.name, itemNameWidth, itemPaint, 2).size.coerceAtLeast(1)
            ((lineCount * itemLineHeight) + itemGap).toInt()
        }.coerceAtLeast(66)
        val height = 520 + itemAreaHeight
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        var y = 72f
        canvas.drawCenteredText("주문서 (주방)", y, titlePaint, width)

        y += 78f
        canvas.drawFitText("배달K 공유주문", left, y, right - left, tablePaint)

        y += 34f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 58f
        canvas.drawText("메   뉴", left, y, headerPaint)
        canvas.drawText("수량", 392f, y, headerPaint)
        canvas.drawText("비고", 496f, y, headerPaint)

        y += 28f
        drawHorizontalLine(canvas, y, width, linePaint)

        y += 58f
        order.items.forEach { item ->
            val nameLines = wrapTextToLines(item.name, itemNameWidth, itemPaint, 2)
            nameLines.forEachIndexed { lineIndex, line ->
                val prefix = if (lineIndex == 0) "" else "   "
                canvas.drawText("$prefix$line", left, y + (lineIndex.toFloat() * itemLineHeight), itemPaint)
            }
            canvas.drawText(item.quantity.toString(), 410f, y, itemPaint)
            canvas.drawText("신규", 494f, y, itemPaint)
            y += (nameLines.size.coerceAtLeast(1) * itemLineHeight) + itemGap
        }

        y -= 18f
        drawHorizontalLine(canvas, y, width, linePaint)
        y += 52f
        canvas.drawFitText("입력주소 : ${order.inputAddress}", left, y, right - left, metaPaint)

        return bitmap
    }

    private fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        
        val xL = ((width + 7) / 8) % 256
        val xH = ((width + 7) / 8) / 256
        val yL = height % 256
        val yH = height / 256
        
        val widthBytes = (width + 7) / 8
        val dataSize = widthBytes * height
        
        val command = ByteArray(8 + dataSize)
        // GS v 0 (Raster Bit Image)
        command[0] = 0x1D
        command[1] = 0x76
        command[2] = 0x30
        command[3] = 0x00 // Normal mode
        command[4] = xL.toByte()
        command[5] = xH.toByte()
        command[6] = yL.toByte()
        command[7] = yH.toByte()
        
        var index = 8
        for (y in 0 until height) {
            for (x in 0 until width step 8) {
                var b = 0
                for (k in 0..7) {
                    if (x + k < width) {
                        val pixel = bitmap.getPixel(x + k, y)
                        val r = Color.red(pixel)
                        val g = Color.green(pixel)
                        val bCol = Color.blue(pixel)
                        val luminance = (r * 0.299 + g * 0.587 + bCol * 0.114).toInt()
                        if (luminance < 128) { // 어두우면 점을 찍음
                            b = b or (1 shl (7 - k))
                        }
                    }
                }
                command[index++] = b.toByte()
            }
        }
        return command
    }

    private fun feedAndCut() {
        val stream = outputStream ?: return

        stream.write(byteArrayOf(0x1B, 0x64, 0x05))
        stream.flush()
        Thread.sleep(200)

        stream.write(byteArrayOf(0x1D, 0x56, 0x00))
        stream.flush()
        Thread.sleep(200)
    }

    fun printOrderReceipt(receiptText: String, fontSize: Float = 28f, bold: Boolean = false): Boolean {
        if (!ensureConnected()) return false
        return try {
            // ESC/POS 초기화
            outputStream?.write(byteArrayOf(0x1B, 0x40)) 
            
            // 텍스트를 안드로이드 캔버스로 그려서 이미지(Bitmap)로 변환
            val bitmap = textToBitmap(receiptText, fontSize, bold)
            
            // 이미지를 ESC/POS 흑백 픽셀 명령어로 변환하여 전송
            val imageCommand = bitmapToEscPos(bitmap)
            outputStream?.write(imageCommand)
            
            // 여백 및 용지 컷팅
            feedAndCut()
            
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "이미지 영수증 인쇄 실패", e)
            false
        }
    }

    fun isDeliveryShareOrder(rawText: String): Boolean {
        return parseDeliveryShareOrder(rawText) != null
    }

    fun printDeliveryShareOrder(rawText: String): Boolean {
        if (!ensureConnected()) return false
        val order = parseDeliveryShareOrder(rawText) ?: return false

        return try {
            outputStream?.write(byteArrayOf(0x1B, 0x40))

            outputStream?.write(bitmapToEscPos(deliveryShareOrderToBitmap(order)))
            feedAndCut()
            outputStream?.write(byteArrayOf(0x1B, 0x40))
            outputStream?.write(bitmapToEscPos(deliveryShareKitchenToBitmap(order)))
            feedAndCut()

            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "배달K 공유 주문 인쇄 실패", e)
            false
        }
    }

    fun printKitchenOrderSheet(
        tableName: String,
        orderSequence: Int,
        printedAt: String,
        itemsJson: String
    ): Boolean {
        if (!ensureConnected()) return false
        return try {
            outputStream?.write(byteArrayOf(0x1B, 0x40))

            val itemsArray = JSONArray(itemsJson)
            val items = (0 until itemsArray.length()).map { index ->
                val item = itemsArray.getJSONObject(index)
                KitchenOrderItem(
                    menuCode = item.optString("menuCode"),
                    name = item.optString("name"),
                    quantity = item.optInt("quantity", 1),
                    note = item.optString("note", "신규")
                )
            }

            val imageCommand = bitmapToEscPos(
                kitchenOrderToBitmap(tableName, orderSequence, printedAt, items)
            )
            outputStream?.write(imageCommand)

            feedAndCut()

            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "주문서 인쇄 실패", e)
            false
        }
    }

    fun printPaymentReceipt(
        storeName: String,
        tableName: String,
        businessRegNo: String,
        address: String,
        representativeName: String,
        contact: String,
        printedAt: String,
        paymentMethod: String,
        taxableTotal: Int,
        vat: Int,
        receiptTotal: Int,
        itemsJson: String
    ): Boolean {
        if (!ensureConnected()) return false
        return try {
            outputStream?.write(byteArrayOf(0x1B, 0x40))

            val itemsArray = JSONArray(itemsJson)
            val items = (0 until itemsArray.length()).map { index ->
                val item = itemsArray.getJSONObject(index)
                PaymentReceiptItem(
                    menuCode = item.optString("menuCode"),
                    name = item.optString("name"),
                    price = item.optInt("price", 0),
                    quantity = item.optInt("quantity", 1),
                    amount = item.optInt("amount", 0)
                )
            }

            val imageCommand = bitmapToEscPos(
                paymentReceiptToBitmap(
                    storeName,
                    tableName,
                    businessRegNo,
                    address,
                    representativeName,
                    contact,
                    printedAt,
                    paymentMethod,
                    taxableTotal,
                    vat,
                    receiptTotal,
                    items
                )
            )
            outputStream?.write(imageCommand)

            feedAndCut()

            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e("BluetoothPrinter", "결제 영수증 인쇄 실패", e)
            false
        }
    }
}
