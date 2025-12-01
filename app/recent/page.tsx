import Viewer from '@/viewer/viewer'

export default function ThisWeekPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="fixed top-0 left-0 w-full h-full bg-black">
        <Viewer mode="this-week" skipSplash />
      </main>
    </div>
  );
}
