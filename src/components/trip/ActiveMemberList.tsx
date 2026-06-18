import type { Member } from '../../types'
import { Button } from '../ui/Button'

interface ActiveMemberListProps {
  members: Member[]
  showRemove?: boolean
  onRemove?: (member: Member) => void
}

export function ActiveMemberList({ members, showRemove = false, onRemove }: ActiveMemberListProps) {
  return (
    <div className="member-list">
      {members.map((m) => (
        <div key={m.id} className="member-item">
          <div className="member-item-main">
            <span className="member-name">{m.nickname}</span>
            {m.isHost && <span className="member-badge">主揪</span>}
          </div>
          {showRemove && !m.isHost && onRemove && (
            <Button
              size="sm"
              variant="outline"
              type="button"
              className="member-remove-btn"
              onClick={() => onRemove(m)}
            >
              移除
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
