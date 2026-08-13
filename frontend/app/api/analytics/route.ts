import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export const revalidate = 0;

export async function GET() {
  let db;
  try {
    const dbPath = path.resolve(process.cwd(), '../backend/src/kisan_memory.db');
    db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS call_logs (
        call_id TEXT PRIMARY KEY,
        room_name TEXT,
        caller_name TEXT,
        district TEXT,
        status TEXT,
        outcome TEXT,
        duration_sec INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const starterCalls = [
      ["CALL-98218", "voice_assistant_room_4933", "रमेश (Ramesh)", "नोएडा (Noida)", "SUCCESS", "KVK कृषि अधिकारी आपातकालीन टिकट KV-6696 दर्ज", 52, "2026-08-12 23:08:46"],
      ["CALL-98216", "outbound_alert_room_104", "रमेश (Ramesh)", "नोएडा (Noida)", "SUCCESS", "आउटबाउंड वर्षा चेतावनी व ऑप्ट-आउट पूरा", 28, "2026-08-11 21:24:00"],
      ["CALL-98215", "voice_assistant_room_103", "सुरेश (Suresh)", "इंदौर (Indore)", "SUCCESS", "सोयाबीन कीट नियंत्रण व वर्षा पूर्वानुमान", 38, "2026-08-10 19:15:00"],
      ["CALL-98214", "voice_assistant_room_102", "रमेश (Ramesh)", "नोएडा (Noida)", "SUCCESS", "गेहूँ मंडी भाव व मौसम सलाह प्राप्त की", 45, "2026-08-09 18:10:00"],
      ["CALL-98217", "voice_assistant_room_105", "अज्ञात (Unknown)", "अनजान (Unknown)", "FAILED", "कॉल समय से पहले डिस्कनेक्ट हुई (Incomplete)", 3, "2026-08-12 18:40:00"]
    ];

    const totalRow = db.prepare("SELECT COUNT(*) as count FROM call_logs").get() as { count: number };

    if (totalRow.count === 0) {
      const insert = db.prepare(
        "INSERT OR IGNORE INTO call_logs (call_id, room_name, caller_name, district, status, outcome, duration_sec, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const call of starterCalls) {
        insert.run(...call);
      }
    }

    const total = (db.prepare("SELECT COUNT(*) as count FROM call_logs").get() as { count: number }).count;
    const success = (db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE status = 'SUCCESS'").get() as { count: number }).count;
    const failed = (db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE status = 'FAILED'").get() as { count: number }).count;

    const rate = total > 0 ? Number((success / total * 100).toFixed(1)) : 100.0;
    const recent = db.prepare("SELECT call_id, caller_name, district, status, outcome, duration_sec, created_at FROM call_logs ORDER BY created_at DESC LIMIT 10").all();

    db.close();

    return NextResponse.json({
      total_calls: total,
      successful_calls: success,
      failed_calls: failed,
      success_rate: rate,
      recent_calls: recent
    });
  } catch (err: any) {
    if (db) db.close();
    console.error('Analytics API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
