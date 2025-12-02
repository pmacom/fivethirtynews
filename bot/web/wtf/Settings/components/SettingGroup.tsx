interface SettingGroupProps {
  title: string,
  description?: string,
  children: React.ReactNode | React.ReactNode[] | undefined
}

export const SettingGroup = ({ title, description, children }:SettingGroupProps) => {
  return (
    <div className="flex border-2 p-4 rounded-lg">
      <div className="w-1/2">
        <div className="text-lg font-bold">{title}</div>
        { description && description.length && (
          <div className="text-sm text-slate-400">{description}</div>
        )}
      </div>

      <div className="w-1/2 flex flex-col gap-6 mt-2 mb-2 items-end">
        {children}
      </div>
    </div>
  )
}

export default SettingGroup