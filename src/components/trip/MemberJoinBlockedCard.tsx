import { Button } from '../ui/Button'

interface MemberJoinBlockedCardProps {
  onDismiss?: () => void
}

export function MemberJoinBlockedCard({ onDismiss }: MemberJoinBlockedCardProps) {
  return (
    <div className="join-blocked-card">
      <p className="join-blocked-title">這趟旅程已達免費成員上限</p>
      <p className="join-blocked-detail">
        免費版最多 4 位成員。
        <br />
        請旅程建立者解鎖這趟旅程後，你就可以加入。
      </p>
      {onDismiss && (
        <Button fullWidth type="button" onClick={onDismiss}>
          我知道了
        </Button>
      )}
    </div>
  )
}
