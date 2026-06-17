import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import type { Trip } from '../types'
import { createId } from '../utils/id'
import { generateTripCode, getShareLink } from '../utils/tripCode'
import { getAllTrips, saveTrip, setSession } from '../utils/storage'

export function CreateTripPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [created, setCreated] = useState<Trip | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = () => {
    setError('')
    if (!name.trim()) {
      setError('請輸入旅行名稱')
      return
    }
    if (!destination.trim()) {
      setError('請輸入目的地')
      return
    }
    if (!startDate || !endDate) {
      setError('請選擇開始與結束日期')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('結束日期不能早於開始日期')
      return
    }

    const existingTrips = getAllTrips()
    let code = generateTripCode()
    while (existingTrips[code]) {
      code = generateTripCode()
    }

    const hostId = createId()
    const trip: Trip = {
      id: createId(),
      code,
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      editPermission: 'host_only',
      members: [
        {
          id: hostId,
          nickname: '主揪',
          isHost: true,
          joinedAt: new Date().toISOString(),
        },
      ],
      itinerary: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    }

    saveTrip(trip)
    setSession({ tripCode: code, memberId: hostId })
    setCreated(trip)
  }

  const shareLink = created ? getShareLink(created.code) : ''

  const handleCopy = async () => {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <Layout showBack backTo="/">
        <div className="page">
          <h2 className="page-title">旅行建立成功！</h2>
          <p className="page-desc">分享以下資訊給旅伴，他們就能加入囉</p>

          <Card className="success-card">
            <div className="success-item">
              <span className="success-label">旅行代碼</span>
              <span className="success-code">{created.code}</span>
            </div>
            <div className="success-item">
              <span className="success-label">分享連結</span>
              <span className="success-link">{shareLink}</span>
            </div>
          </Card>

          <div className="page-actions">
            <Button fullWidth onClick={handleCopy}>
              {copied ? '已複製！' : '複製分享連結'}
            </Button>
            <Button fullWidth variant="secondary" onClick={() => navigate(`/trip/${created.code}`)}>
              進入旅行房間
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showBack backTo="/">
      <div className="page">
        <h2 className="page-title">建立旅行</h2>
        <p className="page-desc">填寫基本資訊，建立專屬的旅行房間</p>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
        >
          <Input
            label="旅行名稱"
            placeholder="例：京都賞楓之旅"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="目的地"
            placeholder="例：日本京都"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <Input
            label="開始日期"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="結束日期"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          {error && <p className="form-error-msg">{error}</p>}

          <Button type="submit" fullWidth size="lg">
            建立旅行
          </Button>
        </form>
      </div>
    </Layout>
  )
}
