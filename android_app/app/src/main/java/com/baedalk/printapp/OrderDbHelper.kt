package com.baedalk.printapp

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log

class OrderDbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_VERSION = 1
        const val DATABASE_NAME = "BaedalkOrders.db"
        const val TABLE_NAME = "orders"
        
        const val COLUMN_ID = "id"
        const val COLUMN_RAW_TEXT = "raw_text"
        const val COLUMN_PARSED_DATA = "parsed_data"
        const val COLUMN_STATUS = "status" // "PENDING", "PRINTED", "FAILED"
        const val COLUMN_TIMESTAMP = "timestamp"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTable = """
            CREATE TABLE $TABLE_NAME (
                $COLUMN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COLUMN_RAW_TEXT TEXT,
                $COLUMN_PARSED_DATA TEXT,
                $COLUMN_STATUS TEXT,
                $COLUMN_TIMESTAMP DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """.trimIndent()
        db.execSQL(createTable)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_NAME")
        onCreate(db)
    }

    fun insertOrder(rawText: String, parsedData: String, status: String = "PENDING"): Long {
        val db = this.writableDatabase
        val values = ContentValues().apply {
            put(COLUMN_RAW_TEXT, rawText)
            put(COLUMN_PARSED_DATA, parsedData)
            put(COLUMN_STATUS, status)
        }
        val id = db.insert(TABLE_NAME, null, values)
        Log.d("OrderDbHelper", "Inserted order ID: $id")
        return id
    }
}
