import type { Member } from '../../types'
import { getMemberDisplayLabel } from '../../utils/memberNames'
import { Button } from '../ui/Button'

interface ActiveMemberListProps {
  members: Member[]
  allMembers?: Member[]
  currentMemberId?: string
  showRemove?: boolean
  onRemove?: (member: Member) => void
}

export function ActiveMemberList({
  members,
  allMembers,
  currentMemberId,
  showRemove = false,
  onRemove,
}: ActiveMemberListProps) {
  const labelMembers = allMembers ?? members

  return (
    <div className="member-list">
      {members.map((member) => (
        <div key={member.id} className="member-item">
          <div className="member-item-main">
            <span className="member-name">
              {getMemberDisplayLabel(labelMembers, member.id, currentMemberId)}
            </span>
            {member.isHost && <span className="member-badge">主揪</span>}
          </div>
          {showRemove && !member.isHost && onRemove && (
            <Button
              size="sm"
              variant="outline"
              type="button"
              className="member-remove-btn"
              onClick={() => onRemove(member)}
            >
              移除
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
