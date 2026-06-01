package com.baedalk.printapp

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.util.concurrent.Executors

class BaedalkNotificationService : NotificationListenerService() {

    private lateinit var dbHelper: OrderDbHelper
    
    // 알림이 동시에 여러 개 와도 큐(Queue)에 담아 순서대로 하나씩 처리하기 위한 단일 스레드 작업자
    private val printExecutor = Executors.newSingleThreadExecutor()

    override fun onCreate() {
        super.onCreate()
        dbHelper = OrderDbHelper(this)
        Log.d("BaedalkNotiService", "Notification Service Created")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        sbn ?: return

        val packageName = sbn.packageName
        val notification = sbn.notification
        val extras = notification.extras

        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        Log.d("BaedalkNotiService", "알림 감지: [패키지] $packageName, [제목] $title, [내용] $text")

        // 임시로 배달k 관련 패키지만 필터링 (정확한 패키지명을 알기 전까지 폭넓게 감지)
        // 실제 배달앱 패키지명을 알아내면 이 부분을 수정합니다.
        if (packageName.contains("baedal") || packageName.contains("k") || title.contains("배달") || title.contains("주문")) {
            Log.d("BaedalkNotiService", "배달k 주문 알림 포착! DB에 저장합니다.")
            
            // TODO: 알림 텍스트 파싱 로직 추가
            val parsedData = "메뉴 파싱 데이터 (구현 예정)" 
            val rawLog = "[앱 패키지] $packageName\n[제목] $title\n[내용] $text"
            
            dbHelper.insertOrder(
                rawText = rawLog,
                parsedData = parsedData,
                status = "PENDING"
            )
            
            // 자동 출력(Auto Print) 설정 확인 및 백그라운드 인쇄 수행
            val prefs = getSharedPreferences("PrintAppPrefs", android.content.Context.MODE_PRIVATE)
            val isAutoPrint = prefs.getBoolean("auto_print", false)
            val defaultMac = prefs.getString("default_printer", "") ?: ""
            
            if (isAutoPrint && defaultMac.isNotEmpty()) {
                Log.d("BaedalkNotiService", "자동 인쇄가 켜져 있습니다. 프린터 연결 시도: $defaultMac")
                
                // Thread.start() 대신 SingleThreadExecutor의 큐에 작업을 추가합니다.
                // 10개의 알림이 1초만에 동시에 들어와도, 앞의 인쇄(연결+출력+3초 대기)가 끝나야 다음 인쇄가 시작됩니다.
                printExecutor.submit {
                    val printerManager = BluetoothPrinterManager(this)
                    if (printerManager.connectPrinter(defaultMac)) {
                        val receiptText = "\n================================\n           주 문 서\n================================\n\n$rawLog\n\n"
                        val success = printerManager.printOrderReceipt(receiptText)
                        Log.d("BaedalkNotiService", "자동 인쇄 결과: $success")
                        
                        // ★ 중요: 블루투스로 데이터(특히 용량이 큰 이미지) 전송 직후 바로 연결을 끊어버리면
                        // 프린터 기계가 데이터를 끝까지 받지 못하고 컷팅 명령이 무시될 수 있습니다.
                        // 프린터가 컷팅 모터를 구동할 수 있도록 3초간 소켓 연결을 유지한 뒤 종료합니다.
                        Thread.sleep(3000)
                        
                        printerManager.disconnect()
                    } else {
                        Log.e("BaedalkNotiService", "자동 인쇄 실패 - 프린터 연결 불가")
                    }
                }
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        // 알림이 지워졌을 때의 처리가 필요하면 구현
    }
}
