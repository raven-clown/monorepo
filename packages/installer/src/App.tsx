import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { InstallerInfo } from '../electron/preload'

type Lang = 'en' | 'th'

const dict = {
  en: {
    tagline: 'Fast, offline-first snippet manager',
    install: 'Install',
    customize: 'Customize installation',
    installLocation: 'Install location',
    browse: 'Browse…',
    desktopShortcut: 'Create a desktop shortcut',
    installing: 'Installing…',
    launch: 'Launch Snippet Manager',
    finish: 'Finish',
    done: 'Installation complete',
    uninstallTitle: 'Remove Snippet Manager?',
    uninstallBody: 'This removes the app and its shortcuts.',
    deleteData: 'Also delete my snippets and settings',
    cancel: 'Cancel',
    uninstall: 'Uninstall',
    uninstalling: 'Removing…',
    uninstalled: 'Snippet Manager has been removed.',
    close: 'Close',
    errorPrefix: 'Something went wrong: ',
  },
  th: {
    tagline: 'ตัวจัดการ snippet โค้ด เร็ว ใช้งานออฟไลน์ได้เต็มรูปแบบ',
    install: 'ติดตั้ง',
    customize: 'ปรับแต่งการติดตั้ง',
    installLocation: 'ตำแหน่งติดตั้ง',
    browse: 'เลือกโฟลเดอร์…',
    desktopShortcut: 'สร้างไอคอนบนเดสก์ท็อป',
    installing: 'กำลังติดตั้ง…',
    launch: 'เปิด Snippet Manager',
    finish: 'เสร็จสิ้น',
    done: 'ติดตั้งเรียบร้อยแล้ว',
    uninstallTitle: 'ลบ Snippet Manager?',
    uninstallBody: 'จะลบตัวแอปและ shortcut ทั้งหมด',
    deleteData: 'ลบ snippet และการตั้งค่าทั้งหมดด้วย',
    cancel: 'ยกเลิก',
    uninstall: 'ลบโปรแกรม',
    uninstalling: 'กำลังลบ…',
    uninstalled: 'ลบ Snippet Manager เรียบร้อยแล้ว',
    close: 'ปิด',
    errorPrefix: 'เกิดข้อผิดพลาด: ',
  },
} as const

type Screen =
  | 'loading'
  | 'welcome'
  | 'installing'
  | 'finish'
  | 'uninstall-confirm'
  | 'uninstalling'
  | 'uninstall-done'
  | 'error'

const UNINSTALL_STAGE_KEY: Record<string, { en: string; th: string }> = {
  shortcuts: { en: 'Removing shortcuts…', th: 'กำลังลบ shortcut…' },
  registry: { en: 'Cleaning up…', th: 'กำลังล้างข้อมูล…' },
  data: { en: 'Removing your data…', th: 'กำลังลบข้อมูล…' },
  files: { en: 'Removing files…', th: 'กำลังลบไฟล์…' },
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('th') ? 'th' : 'en'))
  const t = dict[lang]

  const [screen, setScreen] = useState<Screen>('loading')
  const [info, setInfo] = useState<InstallerInfo | null>(null)
  const [installDir, setInstallDir] = useState('')
  const [desktopShortcut, setDesktopShortcut] = useState(true)
  const [customizing, setCustomizing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 1 })
  const [launchOnFinish, setLaunchOnFinish] = useState(true)
  const [deleteData, setDeleteData] = useState(false)
  const [uninstallStage, setUninstallStage] = useState('files')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    window.installer.getInfo().then((i) => {
      setInfo(i)
      setInstallDir(i.defaultInstallDir)
      setScreen(i.mode === 'uninstall' ? 'uninstall-confirm' : 'welcome')
    })
  }, [])

  useEffect(() => window.installer.onProgress(setProgress), [])
  useEffect(() => window.installer.onUninstallProgress(setUninstallStage), [])

  async function handleBrowse() {
    const picked = await window.installer.pickDirectory()
    if (picked) setInstallDir(picked)
  }

  async function handleInstall() {
    setScreen('installing')
    setProgress({ done: 0, total: 1 })
    const result = await window.installer.install({ installDir, desktopShortcut })
    if (result.ok) {
      setScreen('finish')
    } else {
      setErrorMessage(result.message)
      setScreen('error')
    }
  }

  async function handleFinish() {
    if (launchOnFinish) {
      await window.installer.launchAndClose(installDir)
    } else {
      await window.installer.close()
    }
  }

  async function handleUninstall() {
    setScreen('uninstalling')
    const result = await window.installer.uninstall({ installDir, deleteUserData: deleteData })
    if (result.ok) {
      setScreen('uninstall-done')
    } else {
      setErrorMessage(result.message)
      setScreen('error')
    }
  }

  const percent = Math.round((progress.done / Math.max(progress.total, 1)) * 100)

  return (
    <div className="app">
      <div className="drag-bar">
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            EN
          </button>
          <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>
            ไทย
          </button>
        </div>
        <button className="close-btn" onClick={() => window.installer.close()} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {screen === 'welcome' && info && (
        <div className="screen">
          <div className="app-icon">
            <img src="/icon.png" alt="" />
          </div>
          <h1 className="hero-title">{info.productName}</h1>
          <p className="hero-sub">{t.tagline}</p>
          <p className="hero-sub">v{info.version}</p>

          <div className="actions">
            <button className="primary" onClick={handleInstall}>
              {t.install}
            </button>
            <button className="link" onClick={() => setCustomizing((c) => !c)}>
              {t.customize}
            </button>
          </div>

          {customizing && (
            <div className="customize-panel">
              <div>
                <div className="field-label">{t.installLocation}</div>
                <div className="path-row">
                  <input type="text" value={installDir} onChange={(e) => setInstallDir(e.target.value)} />
                  <button onClick={handleBrowse}>{t.browse}</button>
                </div>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={desktopShortcut}
                  onChange={(e) => setDesktopShortcut(e.target.checked)}
                />
                {t.desktopShortcut}
              </label>
            </div>
          )}
        </div>
      )}

      {screen === 'installing' && (
        <div className="screen">
          <div className="app-icon">
            <img src="/icon.png" alt="" />
          </div>
          <p className="progress-label">{t.installing}</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="progress-label">{percent}%</p>
        </div>
      )}

      {screen === 'finish' && (
        <div className="screen">
          <div className="app-icon">
            <img src="/icon.png" alt="" />
          </div>
          <h1 className="hero-title">{t.done}</h1>
          <label className="check-row">
            <input type="checkbox" checked={launchOnFinish} onChange={(e) => setLaunchOnFinish(e.target.checked)} />
            {t.launch}
          </label>
          <div className="actions">
            <button className="primary" onClick={handleFinish}>
              {t.finish}
            </button>
          </div>
        </div>
      )}

      {screen === 'uninstall-confirm' && info && (
        <div className="screen">
          <div className="app-icon">
            <img src="/icon.png" alt="" />
          </div>
          <h1 className="hero-title">{t.uninstallTitle}</h1>
          <p className="hero-sub">{t.uninstallBody}</p>
          <label className="check-row">
            <input type="checkbox" checked={deleteData} onChange={(e) => setDeleteData(e.target.checked)} />
            {t.deleteData}
          </label>
          <div className="actions">
            <button className="primary" onClick={handleUninstall}>
              {t.uninstall}
            </button>
            <button className="link" onClick={() => window.installer.close()}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {screen === 'uninstalling' && (
        <div className="screen">
          <div className="spinner" />
          <p className="progress-label">{UNINSTALL_STAGE_KEY[uninstallStage]?.[lang] ?? t.uninstalling}</p>
        </div>
      )}

      {screen === 'uninstall-done' && (
        <div className="screen">
          <div className="app-icon">
            <img src="/icon.png" alt="" />
          </div>
          <h1 className="hero-title">{t.uninstalled}</h1>
          <div className="actions">
            <button className="primary" onClick={() => window.installer.close()}>
              {t.close}
            </button>
          </div>
        </div>
      )}

      {screen === 'error' && (
        <div className="screen">
          <p className="error-text">
            {t.errorPrefix}
            {errorMessage}
          </p>
          <div className="actions">
            <button className="primary" onClick={() => window.installer.close()}>
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
