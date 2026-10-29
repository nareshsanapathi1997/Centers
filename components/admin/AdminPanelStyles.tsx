import './admin-buttons.css'
import './admin-header.css'
import './admin-modal.css'
import './admin-forms.css'
import './admin-meridian.css'
import './admin-remix-icons.css'
import { getBasePath } from '@/lib/with-base-path'

export default function AdminPanelStyles() {
  const remixiconHref = `${getBasePath()}/assets/css/remixicon.css`
  return <link rel="stylesheet" href={remixiconHref} precedence="default" />
}
