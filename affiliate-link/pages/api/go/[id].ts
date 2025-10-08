import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  // จำลอง redirect — ในเวอร์ชันจริงจะ lookup จาก DB
  if (!id) return res.status(400).send('Missing id')

  const redirectUrl = 'https://shopee.co.th' // ชั่วคราวก่อนเชื่อม Supabase
  res.writeHead(302, { Location: redirectUrl })
  res.end()
}
