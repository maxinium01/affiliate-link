// pages/api/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

function shortId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD').replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 40);
}

// เวอร์ชันสำหรับ URL string
function appendParamStr(urlStr: string, key: string, value: string) {
  const u = new URL(urlStr);
  if (!u.searchParams.has(key)) u.searchParams.set(key, value);
  return u.toString();
}

// เวอร์ชันสำหรับ URL object
function appendParamURL(u: URL, key: string, value: string) {
  if (!u.searchParams.has(key)) u.searchParams.set(key, value);
}

function buildAffiliateUrl(original: string, platform: 'lazada'|'shopee', subid: string) {
  const lazadaId = process.env.DEFAULT_LAZADA_AFF_ID || '123456';
  const shopeeId = process.env.DEFAULT_SHOPEE_AFF_ID || 'abc789';
  const subLz = process.env.SUBID_PARAM_LAZADA || 'subid';
  const subSh = process.env.SUBID_PARAM_SHOPEE || 'sub_id';

  const u = new URL(original);
  if (platform === 'lazada') {
    appendParamURL(u, 'aff_id', lazadaId);
    appendParamURL(u, subLz, subid);
  } else {
    // ถ้าบัญชี Shopee ใช้ชื่อ param อื่น เช่น affiliate_id ให้เปลี่ยนบรรทัดนี้
    appendParamURL(u, 'affiliate', shopeeId);
    appendParamURL(u, subSh, subid);
  }
  return u.toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { platform, original_url, product_name } = req.body as {
      platform: 'lazada'|'shopee',
      original_url: string,
      product_name?: string
    };

    if (!platform || !original_url) {
      return res.status(400).json({ error: 'missing platform/original_url' });
    }

    // สร้าง subid อัตโนมัติจากชื่อสินค้าหรือ slug ท้าย URL
    const fallbackSlug = new URL(original_url).pathname.split('/').filter(Boolean).slice(-1)[0] || 'offer';
    const subid = slugify(product_name || fallbackSlug);

    // ประกอบ affiliate_url พร้อม aff_id + subid
    const affiliate_url = buildAffiliateUrl(original_url, platform, subid);

    // สร้าง short id แล้วบันทึกลงตาราง
    const id = shortId();

    const { error: e1 } = await supabase
      .from('links')
      .insert({ id, platform, original_url, affiliate_url });
    if (e1) return res.status(500).json({ error: e1.message });

    const { error: e2 } = await supabase
      .from('offers')
      .insert({ link_id: id, product_name: product_name || '', subid });
    if (e2) return res.status(500).json({ error: e2.message });

    // สร้าง short URL คืนให้หน้าเว็บ
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const short_url = `${proto}://${host}/api/go/${id}`;

    return res.status(200).json({ id, short_url, affiliate_url, subid });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'internal_error' });
  }
}
