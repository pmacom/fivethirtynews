import React from 'react'

interface SourceContentProps {
  children: React.ReactNode
}

function SourceContent({ children }: SourceContentProps) {
  return (
    <div className={`
        p-[15%]
        text-3xl
        fixed
        top-0
        left-0
        w-full
        bg-black
        bg-opacity-80
        h-full
        flex
        items-center
        justify-center
      `}>
      {children}
    </div>
  )
}

export default SourceContent