import { BRAND } from '@/lib/brand'
export default function AdminLoginFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="box-border w-full max-w-full shrink-0 overflow-x-hidden border-t border-gray-200/80 bg-white/60 px-4 py-5 text-center backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/60">
      <p className="m-0 max-w-full break-words text-xs text-gray-500 dark:text-gray-400">
        © {year} {BRAND.name} Pvt. Ltd.
      </p>
      <p className="m-0 mt-1 text-[11px] text-gray-400 dark:text-gray-500">{BRAND.productName}</p>
    </footer>
  )
}
