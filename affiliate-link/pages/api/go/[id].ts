import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

const maxAgeDays = parseInt(process.env.COOKIE_MAX_AGE_DAYS || '30', 10);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query as { id: string };
    if (!id) return res.status(400).send('missing id');

    const { data: link, error } = await supabase.from('links').select('*').eq('id', id).single();
    if (error || !link) return res.status(404).send('link not found');

    const clickId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cookie = `my_aff_click=${clickId}; Max-Age=${maxAgeDays*24*3600}; Path=/; HttpOnly; SameSite=Lax; Secure`;
    res.setHeader('Set-Cookie', cookie);

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const ref = (req.headers['referer'] as string) || '';
    const ua = (req.headers['user-agent'] as string) || '';

    await supabase.from('click_logs').insert({
      link_id: id,
      platform: link.platform,
      target_url: link.affiliate_url,
      ip,
      referrer: ref,
      user_agent: ua
    });

    const u = new URL(link.affiliate_url);
    u.searchParams.set('my_click', clickId);

    res.writeHead(302, { Location: u.toString() });
    return res.end();
  } catch (e) {
    console.error(e);
    return res.status(500).send('internal error');
  }
}
