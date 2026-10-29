import HashScrollRestore from '@/components/HashScrollRestore'
import HistoryNavigationFix from '@/components/HistoryNavigationFix'

/**
 * Template re-mounts on every [slug] navigation. Page visibility is handled by
 * rendering `page-wrapper loaded` in the layout (no legacy script loaders).
 */
export default function CenterTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HashScrollRestore />
      <HistoryNavigationFix />
      {children}
    </>
  )
}

