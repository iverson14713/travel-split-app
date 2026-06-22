import aiMouthIcon from '../assets/app-icons/ai-mouth.png'
import loveQuestIcon from '../assets/app-icons/lovequest.png'
import petCareIcon from '../assets/app-icons/petcare.png'

export interface OwnedAppPromo {
  id: string
  name: string
  description: string
  icon: string
  url: string
}

export const ownedAppPromos: OwnedAppPromo[] = [
  {
    id: 'ai-mouth',
    name: 'AI有點嘴',
    description: 'AI 娛樂分析，嘴你也嘴世界',
    icon: aiMouthIcon,
    url: 'https://apps.apple.com/tw/app/ai%E6%9C%89%E9%BB%9E%E5%98%B4/id6779218310',
  },
  {
    id: 'lovequest',
    name: 'LoveQuest 情侶日常',
    description: '情侶互動、紀念日、小遊戲',
    icon: loveQuestIcon,
    url: 'https://apps.apple.com/tw/app/lovequest%E6%83%85%E4%BE%B6%E6%97%A5%E5%B8%B8/id6772859319',
  },
  {
    id: 'petcare',
    name: 'PetCare 寵物日記',
    description: '記錄喝水、尿尿、異常狀況',
    icon: petCareIcon,
    url: 'https://apps.apple.com/tw/app/pet-care%E5%AF%B5%E7%89%A9%E6%97%A5%E8%A8%98/id6772930939',
  },
]

export function pickRandomOwnedAppPromo(): OwnedAppPromo {
  const index = Math.floor(Math.random() * ownedAppPromos.length)
  return ownedAppPromos[index]!
}
