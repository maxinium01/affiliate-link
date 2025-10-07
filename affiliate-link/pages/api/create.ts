import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

function shortId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function appendParam(urlStr: string, key: string, value: string) {
  const u = new URL(urlStr);
  if (!u.searchParams.has(key)) u.searchParams.set(key, value);
  return u.toString();
}

function buildAffiliateUrl(original: string, platform: 'lazada'|'shopee') {
  const lazadaId = process.env.DEFAULT_LAZADA_AFF_ID || '123456';
  const shopeeId = process.env.DEFAULT_SHOPEE_AFF_ID || 'abc789';
  let url = original;
  if (platform === 'lazada') {
    url = appendParam(url, 'aff_id', lazadaId);
  } else {
    // NOTE: adjust param name for your Shopee program if needed
    url = appendParam(url, 'affiliate', shopeeId);
  }
  return url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { platform, original_url } = req.body as { platform: 'lazada'|'shopee', original_url: string };

    if (!platform || !original_url) return res.status(400).json({ error: 'missing platform/original_url' });

    const affiliate_url = buildAffiliateUrl(original_url, platform);
    const id = shortId();

    const { error } = await supabase.from('links').insert({ id, platform, original_url, affiliate_url });
    if (error) return res.status(500).json({ error: error.message });

    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const shortUrl = `${proto}://${host}/api/go/${id}`;

    return res.status(200).json({ id, short_url: shortUrl, affiliate_url });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'internal_error' });
  }
}
