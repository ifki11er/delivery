package com.baedalk.printapp

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class BaedalkNotificationService : NotificationListenerService() {

    private lateinit var dbHelper: OrderDbHelper

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
            
            dbHelper.insertOrder(
                rawText = "[앱 패키지] $packageName\n[제목] $title\n[내용] $text",
                parsedData = parsedData,
                status = "PENDING"
            )
            
            // TODO: 프린터 인쇄 명령 호출 (4단계에서 구현)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        // 알림이 지워졌을 때의 처리가 필요하면 구현
    }
}
