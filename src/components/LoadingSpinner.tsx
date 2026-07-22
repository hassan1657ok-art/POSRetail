export function LoadingSpinner({ fullScreen }: { fullScreen?: boolean }) {
  const cls = fullScreen ? 'h-screen flex items-center justify-center' : 'flex items-center justify-center p-8'
  return (
    <div className={cls}>
      <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
}
