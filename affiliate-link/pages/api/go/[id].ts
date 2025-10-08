// pages/api/go/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

const maxAgeDays = parseInt(process.env.COOKIE_MAX_AGE_DAYS || '30', 10);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).send('missing id');

    // 1) หา link ใน DB
    const { data: link, error } = await supabase
      .from('links')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !link) return res.status(404).send('link not found');

    // 2) เตรียมค่าที่จะล็อก
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';
    const referrer = (req.headers['referer'] as string) || '';
    const user_agent = (req.headers['user-agent'] as string) || '';

    // 3) บันทึกคลิกลง click_logs
    await supabase.from('click_logs').insert({
      link_id: link.id,
      platform: link.platform,          // 'lazada' | 'shopee'
      target_url: link.affiliate_url,   // ปลายทางที่จะ redirect
      ip,
      referrer,
      user_agent
    });

    // 4) เซ็ตคุกกี้ click (ไว้เชื่อมภายหลัง ถ้าจะใช้)
    const clickId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cookie = [
      `my_aff_click=${clickId}`,
      `Max-Age=${maxAgeDays * 24 * 3600}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
    ].join('; ');
    res.setHeader('Set-Cookie', cookie);

    // (ตัวเลือก) แปะ clickId ติดไปใน URL ปลายทางด้วย
    const u = new URL(link.affiliate_url);
    u.searchParams.set('my_click', clickId);

    // 5) Redirect
    res.writeHead(302, { Location: u.toString() });
    res.end();
  } catch (e) {
    console.error(e);
    return res.status(500).send('internal error');
  }
}
