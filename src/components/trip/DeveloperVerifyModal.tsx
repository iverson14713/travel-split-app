import { useEffect, useState } from 'react'
import { DEVELOPER_UNLOCK_CODE } from '../../constants/freeLimits'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface DeveloperVerifyModalProps {
  open: boolean
  onClose: () => void
  onVerified: () => void
}

export function DeveloperVerifyModal({ open, onClose, onVerified }: DeveloperVerifyModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPassword('')
    setError('')
  }, [open])

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  const handleSubmit = () => {
    if (password.trim() !== DEVELOPER_UNLOCK_CODE) {
      setError('密碼錯誤')
      return
    }
    setPassword('')
    setError('')
    onVerified()
  }

  return (
    <Modal open={open} onClose={handleClose} title="開發者驗證">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <p className="settings-hint">請輸入開發者密碼</p>
        <Input
          label="密碼"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError('')
          }}
          placeholder="輸入密碼"
          autoComplete="off"
        />
        {error && <p className="form-error-msg">{error}</p>}
        <Button fullWidth type="button" variant="outline" onClick={handleClose}>
          取消
        </Button>
        <Button fullWidth type="submit">
          確認
        </Button>
      </form>
    </Modal>
  )
}
