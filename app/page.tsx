import Viewer from '@/viewer/viewer'
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="fixed top-0 left-0 w-full h-full bg-black">
        <Viewer />
      </main>
    </div>
  );
}
