import { getShareLink } from './tripCode'

export function getLineShareText(code: string): string {
  const shareUrl = getShareLink(code)
  return `這趟旅程的行程和記帳都放這裡：\n${shareUrl}\n\n點進去輸入你的名字就可以加入。`
}

