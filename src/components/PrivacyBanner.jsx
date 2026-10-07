/* Privacy banner — shown on every view per spec section 16. */
export default function PrivacyBanner() {
  return (
    <div className="no-print mx-auto mt-3 max-w-3xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 sm:text-sm">
      🔒 <strong>Private by design.</strong> Your uploaded files are processed
      locally in your browser. Files are never uploaded to a server.
    </div>
  )
}
