import { supabaseConfigError } from '../lib/supabase'

export function SupabaseConfigError() {
  return (
    <div className="config-error">
      <div className="config-error-card">
        <p className="config-error-icon">⚠️</p>
        <h1 className="config-error-title">Supabase 尚未設定</h1>
        <p className="config-error-message">{supabaseConfigError}</p>
        <div className="config-error-steps">
          <p>請在專案根目錄建立 <code>.env</code> 檔案：</p>
          <pre className="config-error-code">{`VITE_SUPABASE_URL=https://你的專案.supabase.co
VITE_SUPABASE_ANON_KEY=你的_anon_key`}</pre>
          <p>設定完成後請重新啟動 <code>npm run dev</code>。</p>
          <p>
            並到 Supabase SQL Editor 執行 <code>supabase/schema.sql</code> 建立資料表。
          </p>
        </div>
      </div>
    </div>
  )
}
