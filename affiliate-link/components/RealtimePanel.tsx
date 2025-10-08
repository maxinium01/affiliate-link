import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RealtimePanel() {
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("click_logs")
        .select("platform, target_url, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!error && data) setClicks(data);
      setLoading(false);
    };
    load();

    // subscribe realtime
    const channel = supabase
      .channel("realtime:click_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "click_logs" },
        (payload) => {
          setClicks((prev) => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>;

  return (
    <div className="mt-10 border-t border-orange-200 pt-6">
      <h3 className="text-lg font-semibold text-orange-700 mb-3">
        ⚡ การคลิกล่าสุด (เรียลไทม์)
      </h3>
      <ul className="space-y-2">
        {clicks.map((c, i) => (
          <li
            key={i}
            className="text-sm bg-orange-50 border border-orange-200 rounded-lg p-2"
          >
            <span className="font-semibold text-orange-600">{c.platform}</span>{" "}
            <span className="text-gray-700 truncate">{c.target_url}</span>
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
