import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "../lib/supabaseClient";

type ClickRow = {
  id: string;
  platform: "lazada" | "shopee";
  target_url: string;
  referrer: string | null;
  created_at: string;
};

type ConvRow = {
  id: string;
  platform: "lazada" | "shopee";
  order_id: string | null;
  item_name: string | null;
  qty: number | null;
  status: "click" | "cart" | "paid";
  commission: number | null;
  currency: string | null;
  subid: string | null;
  created_at: string;
};

export default function RealtimePanel() {
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [ready, setReady] = useState(false);

  const stat = useMemo(() => {
    return clicks.reduce(
      (acc, r) => {
        acc.total++;
        acc[r.platform]++;
        return acc;
      },
      { total: 0, lazada: 0, shopee: 0 } as {
        total: number;
        lazada: number;
        shopee: number;
      }
    );
  }, [clicks]);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabaseBrowser
        .from("click_logs")
        .select("id, platform, target_url, referrer, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!active) return;
      if (data) setClicks(data as ClickRow[]);
      setReady(true);
    })();

    const clickChannel = supabaseBrowser
      .channel("realtime:click_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "click_logs" },
        (payload: any) => {
          const r = payload.new as ClickRow;
          setClicks((prev) => [r, ...prev].slice(0, 30));
        }
      )
      .subscribe();

    // realtime conversions
    (async () => {
      const { data } = await supabaseBrowser
        .from("conversions")
        .select(
          "id, platform, order_id, item_name, qty, status, commission, currency, subid, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setConvs(data as ConvRow[]);
    })();

    const convChannel = supabaseBrowser
      .channel("realtime:conversions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversions" },
        (payload: any) => {
          const r = payload.new as ConvRow;
          setConvs((prev) => [r, ...prev].slice(0, 30));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabaseBrowser.removeChannel(clickChannel);
      supabaseBrowser.removeChannel(convChannel);
    };
  }, []);

  const sum = convs.reduce((acc, c) => acc + (c.commission || 0), 0);

  return (
    <section className="mt-8 space-y-10">
      {/* ตารางคลิก */}
      <div className="bg-white border border-orange-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-orange-700">
            📈 คลิกแบบเรียลไทม์
          </h3>
          <div className="text-sm">
            รวม: <b>{stat.total}</b> • Lazada:{" "}
            <b className="text-orange-600">{stat.lazada}</b> • Shopee:{" "}
            <b className="text-orange-600">{stat.shopee}</b>
          </div>
        </div>

        {!ready && <p className="text-sm text-gray-500">กำลังโหลดข้อมูล…</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2">เวลา</th>
                <th className="py-2">แพลตฟอร์ม</th>
                <th className="py-2">Referrer</th>
                <th className="py-2">ปลายทาง</th>
              </tr>
            </thead>
            <tbody>
              {clicks.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-white ${
                        r.platform === "lazada"
                          ? "bg-orange-500"
                          : "bg-orange-400"
                      }`}
                    >
                      {r.platform}
                    </span>
                  </td>
                  <td className="py-2 text-gray-600">{r.referrer || "-"}</td>
                  <td className="py-2 truncate max-w-[320px]">
                    <a
                      className="underline"
                      href={r.target_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.target_url}
                    </a>
                  </td>
                </tr>
              ))}
              {clicks.length === 0 && ready && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={4}>
                    ยังไม่มีคลิก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ตาราง Conversion */}
      <div className="bg-white border border-orange-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-orange-700">
            💰 ค่าคอม & สถานะออเดอร์
          </h3>
          <div className="text-sm">
            รวมค่าคอม:{" "}
            <b className="text-orange-700">{sum.toFixed(2)} THB</b>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2">เวลา</th>
                <th className="py-2">แพลตฟอร์ม</th>
                <th className="py-2">สินค้า</th>
                <th className="py-2">สถานะ</th>
                <th className="py-2">subid</th>
                <th className="py-2">ค่าคอม</th>
              </tr>
            </thead>
            <tbody>
              {convs.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="py-2">{c.platform}</td>
                  <td className="py-2">{c.item_name || "-"}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-white ${
                        c.status === "paid"
                          ? "bg-green-600"
                          : c.status === "cart"
                          ? "bg-amber-500"
                          : "bg-gray-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2">{c.subid || "-"}</td>
                  <td className="py-2">
                    {c.commission?.toFixed(2)} {c.currency || ""}
                  </td>
                </tr>
              ))}
              {convs.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    ยังไม่มีข้อมูลรายได้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
