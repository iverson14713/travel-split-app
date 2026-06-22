import { useEffect } from 'react'
import { LegalDocumentLayout } from '../components/legal/LegalDocumentLayout'
import { APP_NAME, CONTACT_EMAIL } from '../constants/app'

const PAGE_TITLE = `${APP_NAME}｜支援中心`

export function SupportPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = PAGE_TITLE
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <LegalDocumentLayout title="支援中心">
      <p>
        如果你在使用 {APP_NAME} 時遇到問題，或有任何建議，歡迎透過 Email 聯絡我們。
      </p>

      <p>
        客服信箱：
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>常見問題</h2>

      <h2>1. 如何建立旅程？</h2>
      <p>打開 App 後，點選新增旅程，輸入旅程名稱、日期與成員即可開始使用。</p>

      <h2>2. 如何記錄支出？</h2>
      <p>進入旅程後，到「記帳」頁面新增支出，填入金額、付款人、分類與分攤成員。</p>

      <h2>3. 如何邀請朋友一起查看？</h2>
      <p>建立旅程後，可以透過分享功能邀請同行夥伴加入同一趟旅程。</p>

      <h2>4. 如何結算？</h2>
      <p>旅程結束後，到「結算」頁面查看每位成員應收應付金額。</p>

      <h2>5. 內購解鎖後沒有生效怎麼辦？</h2>
      <p>
        請先確認 Apple ID 是否完成付款，並在 App 內點選「恢復此旅程解鎖」。如果仍有問題，請 Email
        聯絡我們。
      </p>

      <h2>6. 如何刪除資料？</h2>
      <p>你可以在 App 內刪除旅程、支出與行程資料。若需要協助，也可以透過 Email 聯絡我們。</p>
    </LegalDocumentLayout>
  )
}
