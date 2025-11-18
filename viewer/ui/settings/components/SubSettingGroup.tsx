import { Separator } from "@/components/ui/separator"

interface SubSettingGroupProps {
  title: string,
  description: string,
  children: React.ReactNode | React.ReactNode[] | undefined
}

export const SubSettingGroup = ({ title, description, children }:SubSettingGroupProps) => {

  return (
    <div className="flex w-full flex-col border-[1px] rounded-lg">
      <div className="">
        <div className="text-sm p-1 pl-3 pt-2">{title}</div>
      </div>
      
      <Separator className="my-1" />

      <div className="text-sm text-slate-400">{description}</div>

      <div className="flex flex-col gap-6 mt-2 mb-2 items-end">
        {children}
      </div>

    </div>
  )
}

export default SubSettingGroup