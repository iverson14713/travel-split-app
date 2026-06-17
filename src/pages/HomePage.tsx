import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'

export function HomePage() {
  return (
    <Layout>
      <div className="home">
        <div className="home-hero">
          <div className="home-icon" aria-hidden="true">
            ✈️
          </div>
          <h1 className="home-title">旅伴小本本</h1>
          <p className="home-subtitle">朋友旅行，一起看行程、一起記帳、結束一鍵分帳</p>
        </div>

        <div className="home-actions">
          <Link to="/create">
            <Button fullWidth size="lg">
              建立旅行
            </Button>
          </Link>
          <Link to="/join">
            <Button fullWidth size="lg" variant="secondary">
              加入旅行
            </Button>
          </Link>
        </div>

        <p className="home-hint">不用下載 App、不用註冊，打開連結就能一起用</p>
      </div>
    </Layout>
  )
}
