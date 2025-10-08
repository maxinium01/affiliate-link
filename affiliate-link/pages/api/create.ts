import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { url, platform } = req.body

  if (!url || !platform) {
    return res.status(400).json({ error: 'Missing url or platform' })
  }

  // ตัวอย่าง: สร้าง short id จำลอง
  const shortId = Math.random().toString(36).substring(2, 8)
  const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://affiliate-link-peach.vercel.app'}/go/${shortId}`

  return res.status(200).json({
    message: 'สร้างลิงก์สำเร็จ',
    shortUrl,
    originalUrl: url,
    platform,
  })
}
