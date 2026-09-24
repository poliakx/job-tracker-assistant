import { redirect } from 'next/navigation'

// The Inbox was merged into the dashboard at `/` — keep old links and
// installed-PWA bookmarks working.
export default function InboxPage() {
  redirect('/')
}
