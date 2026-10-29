import '@/app/payment-premium.css'

/** Checkout sits inside the centre site layout so the public header and footer show. */
export default function CenterPaymentLayout({ children }: { children: React.ReactNode }) {
  return <div className="center-payment-page min-h-[60vh] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">{children}</div>
}
