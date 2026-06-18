import { APP_NAME } from '../constants/app'
import { getShareLink } from './tripCode'

export function getLineShareText(code: string): string {
  const inviteLink = getShareLink(code)
  return `我建立了一趟旅程，邀請你一起加入「${APP_NAME}」！
一起看行程、記帳分帳，旅程結束後快速結算。

加入連結：
${inviteLink}`
}
