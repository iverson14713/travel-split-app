import { TRIP_UNLOCK_PRICE_LABEL } from '../../constants/freeLimits'
import { Button } from '../ui/Button'

interface MemberLimitBannerProps {
  memberCount: number
  maxMembers: number
  onUpgrade: () => void
}

export function MemberLimitBanner({ memberCount, maxMembers, onUpgrade }: MemberLimitBannerProps) {
  return (
    <div className="member-limit-banner">
      <p className="member-limit-banner-title">免費版成員已滿</p>
      <p className="member-limit-banner-detail">
        目前 {memberCount} / {maxMembers} 位成員。解鎖這趟旅程後，可以邀請更多同伴加入。
      </p>
      <Button fullWidth type="button" size="sm" onClick={onUpgrade}>
        {TRIP_UNLOCK_PRICE_LABEL} 解鎖這趟旅程
      </Button>
    </div>
  )
}
