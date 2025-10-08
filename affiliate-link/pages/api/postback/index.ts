import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

// แปลง status จากแพลตฟอร์มให้เหลือสามสถานะหลัก
function mapStatus(s?: string) {
  const t = (s || '').toLowerCase();
  if (['paid','purchase','purchased','completed','success'].includes(t)) return 'paid';
  if (['cart','add_to_cart','added_to_cart'].includes(t)) return 'cart';
  return 'click';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // รองรับ GET/POST จาก network
    const payload = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const {
      platform,           // 'lazada' | 'shopee'
      order_id,
      item_name,
      item_id,
      qty,
      commission,
      currency,
      status,
      subid,
      link_id,
      click_id,
    } = payload as any;

    if (!platform) return res.status(400).json({ error: 'missing platform' });

    const row = {
      platform,
      order_id: order_id?.toString(),
      item_name: item_name?.toString(),
      item_id: item_id?.toString(),
      qty: qty ? Number(qty) : 1,
      commission: commission ? Number(commission) : 0,
      currency: currency || 'THB',
      status: mapStatus(status),
      subid: subid?.toString(),
      link_id: link_id?.toString() || null,
      click_id: click_id?.toString() || null,
      raw: payload
    };

    const { error } = await supabase.from('conversions').insert(row);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'internal_error' });
  }
}

