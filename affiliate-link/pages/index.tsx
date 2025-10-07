import { useState } from 'react';

export default function Home() {
  const [platform, setPlatform] = useState<'lazada'|'shopee'>('lazada');
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<{short_url:string, affiliate_url:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const createLink = async () => {
    setErr(''); setResult(null); setLoading(true);
    try {
      const r = await fetch('/api/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, original_url: url })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'สร้างลิงก์ไม่สำเร็จ');
      setResult({ short_url: data.short_url, affiliate_url: data.affiliate_url });
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white text-[#222]">
      <header className="w-full border-b border-orange-200 bg-white/70 backdrop-blur sticky top-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-600">Affiliate Link Generator</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <section className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-orange-700 mb-4">🔗 สร้างลิงก์ Affiliate ของคุณเอง</h2>

          <div className="flex gap-2 mb-4">
            <button onClick={()=>setPlatform('lazada')} className={`px-4 py-2 rounded-xl border ${platform==='lazada'?'bg-orange-500 text-white border-orange-600':'bg-white text-orange-600 border-orange-300'}`}>Lazada</button>
            <button onClick={()=>setPlatform('shopee')} className={`px-4 py-2 rounded-xl border ${platform==='shopee'?'bg-orange-500 text-white border-orange-600':'bg-white text-orange-600 border-orange-300'}`}>Shopee</button>
          </div>

          <label className="block text-sm text-orange-800 mb-1">ใส่ลิงก์สินค้าของคุณ</label>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder={platform==='lazada'? 'https://www.lazada.co.th/...':'https://shopee.co.th/...'} className="w-full rounded-xl border border-orange-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white mb-4" />

          <button onClick={createLink} disabled={loading||!url} className="px-5 py-3 rounded-xl bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 disabled:opacity-50">
            {loading? 'กำลังสร้างลิงก์...' : 'สร้างลิงก์ของฉัน'}
          </button>

          {err && <p className="mt-3 text-red-600">❌ {err}</p>}

          {result && (
            <div className="mt-6 bg-white border border-orange-200 rounded-xl p-4">
              <p className="text-sm text-gray-600">ลิงก์สั้น (แชร์อันนี้):</p>
              <div className="flex items-center gap-2 mt-1">
                <input readOnly value={result.short_url} className="flex-1 rounded-lg border border-gray-300 px-3 py-2"/>
                <button onClick={()=>navigator.clipboard.writeText(result.short_url)} className="px-3 py-2 rounded-lg bg-orange-500 text-white">คัดลอก</button>
              </div>

              <p className="text-sm text-gray-600 mt-4">ลิงก์ปลายทาง (แนบ aff_id แล้ว):</p>
              <input readOnly value={result.affiliate_url} className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2"/>

              <p className="text-xs text-gray-500 mt-3">เมื่อมีคนคลิกลิงก์สั้น ระบบจะตั้งคุกกี้ 30 วัน + บันทึกคลิก (IP/Referrer) แล้วพาไปยังหน้าสินค้า</p>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold text-orange-700 mb-2">📌 หมายเหตุ</h3>
          <ul className="list-disc ml-6 text-sm text-gray-700 space-y-1">
            <li>อายุคุกกี้ถูกตั้งไว้ 30 วัน (แก้ได้ใน ENV)</li>
            <li>ค่าคอม Affiliate จะขึ้นกับนโยบายของแพลตฟอร์ม (ส่วนใหญ่ 7 วันสำหรับ Lazada/Shopee)</li>
            <li>เปลี่ยนค่า aff_id ได้ใน Environment Variables บน Vercel</li>
          </ul>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-gray-500">© {new Date().getFullYear()} Affiliate Link Generator</footer>
    </div>
  );
}
