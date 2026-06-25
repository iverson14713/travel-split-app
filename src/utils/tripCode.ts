import { PUBLIC_APP_URL } from '../constants/app'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateTripCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

export function getShareLink(code: string): string {
  const inviteCode = code.trim().toUpperCase()
  return `${PUBLIC_APP_URL}/join?code=${inviteCode}`
}
