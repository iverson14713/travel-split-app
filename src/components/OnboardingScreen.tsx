import { useState } from 'react'
import { Button } from './ui/Button'
import { APP_NAME } from '../constants/app'

const SLIDES = [
  {
    icon: '🗺️',
    title: '朋友一起排行程',
    body: '建立旅程後分享連結，同伴加入後就能一起查看每日行程。',
  },
  {
    icon: '💰',
    title: '多人記帳分帳',
    body: '支援多幣別記帳、付款人與分攤成員，旅行花費一目了然。',
  },
  {
    icon: '✅',
    title: '結算更簡單',
    body: '系統會整理誰該給誰多少，旅程結束後快速完成結算。',
  },
] as const

interface OnboardingScreenProps {
  onComplete: () => void
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  const handleNext = () => {
    if (isLast) {
      onComplete()
      return
    }
    setStep((current) => current + 1)
  }

  return (
    <div className="onboarding-screen" role="dialog" aria-modal="true" aria-label="首次使用導覽">
      <div className="onboarding-card">
        <p className="onboarding-app-name">{APP_NAME}</p>
        <div className="onboarding-icon" aria-hidden="true">
          {slide.icon}
        </div>
        <h2 className="onboarding-title">{slide.title}</h2>
        <p className="onboarding-body">{slide.body}</p>

        <div className="onboarding-dots" aria-hidden="true">
          {SLIDES.map((_, index) => (
            <span
              key={index}
              className={`onboarding-dot${index === step ? ' onboarding-dot--active' : ''}`}
            />
          ))}
        </div>

        <Button fullWidth size="lg" onClick={handleNext}>
          {isLast ? '開始使用' : '下一步'}
        </Button>
      </div>
    </div>
  )
}
