export interface AppRecommendation {
  id: string
  icon: string
  name: string
  description: string
  url: string
}

export const APP_RECOMMENDATIONS: AppRecommendation[] = [
  {
    id: 'petcare',
    icon: '🐾',
    name: 'PetCare 寵物日記',
    description: '記錄喝水、尿尿、異常狀況',
    url: 'https://apps.apple.com/tw/app/pet-care%E5%AF%B5%E7%89%A9%E6%97%A5%E8%A8%98/id6772930939',
  },
  {
    id: 'lovequest',
    icon: '💕',
    name: 'LoveQuest 情侶日常',
    description: '情侶互動、紀念日、小遊戲',
    url: 'https://apps.apple.com/tw/app/lovequest%E6%83%85%E4%BE%B6%E6%97%A5%E5%B8%B8/id6772859319',
  },
  {
    id: 'ai-mouth',
    icon: '🗣️',
    name: 'AI有點嘴',
    description: 'AI 娛樂分析，嘴你也嘴世界',
    url: 'https://apps.apple.com/tw/app/ai%E6%9C%89%E9%BB%9E%E5%98%B4/id6779218310',
  },
]

export function pickAppRecommendation(seed: string): AppRecommendation {
  let index = 0
  for (let i = 0; i < seed.length; i++) {
    index = (index + seed.charCodeAt(i)) % APP_RECOMMENDATIONS.length
  }
  return APP_RECOMMENDATIONS[index]!
}
