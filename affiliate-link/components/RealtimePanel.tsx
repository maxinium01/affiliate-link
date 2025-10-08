import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ClickRow = {
  platform: "lazada" | "shopee";
  target_url: string;
  created_at: string;
};

export default function RealtimePanel() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // สร้าง client เมื่ออยู่บนเบราว์เซอร์ + มี ENV ครบ
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      setErr("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      setLoading(false);
      return;
    }
    // lazy create เฉพาะฝั่ง client
    const client = createClient(url, anon);
    setSupabase(client);
  }, []);

  // โหลดข้อมูล + subscribe realtime
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("click_logs")
        .select("platform, target_url, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!active) return;
      if (error) {
        setErr(error.message);
      } else if (data) {
        setClicks(data as ClickRow[]);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel("realtime:click_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "click_logs" },
        (payload) => {
          const row = payload.new as ClickRow;
          setClicks((prev) => [row, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // นับจำนวนต่อแพลตฟอร์ม
  const stat = useMemo(() => {
    return clicks.reduce(
      (acc, c) => {
        acc.total += 1;
        if (c.platform === "lazada") acc.lazada += 1;
        if (c.platform === "shopee") acc.shopee += 1;
        return acc;
      },
      { total: 0, lazada: 0, shopee: 0 }
    );
  }, [clicks]);

  if (err) {
    return <p className="text-sm text-red-600">❌ {err}</p>;
  }
  if (loading) {
    return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>;
  }

  return (
    <div className="mt-10 border-t border-orange-200 pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-orange-700">
          ⚡ การคลิกล่าสุด (เรียลไทม์)
        </h3>
        <div className="text-sm text-gray-700">
          รวม: <b>{stat.total}</b> • Lazada:{" "}
          <b className="text-orange-600">{stat.lazada}</b> • Shopee:{" "}
          <b className="text-orange-600">{stat.shopee}</b>
        </div>
      </div>

      <ul className="space-y-2">
        {clicks.map((c, i) => (
          <li
            key={`${c.created_at}-${i}`}
            className="text-sm bg-orange-50 border border-orange-200 rounded-lg p-2"
          >
            <span className="font-semibold text-orange-600">{c.platform}</span>{" "}
            <span className="text-gray-700 break-all">{c.target_url}</span>
            <span className="block text-xs text-gray-500">
              {new Date(c.created_at).toLocaleString("th-TH")}
            </span>
          </li>
        ))}
        {!clicks.length && (
          <li className="text-sm text-gray-500">ยังไม่มีการคลิก</li>
        )}
      </ul>
    </div>
  );
}
