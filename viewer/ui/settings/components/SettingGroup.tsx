interface SettingGroupProps {
  title: string,
  description?: string,
  children: React.ReactNode | React.ReactNode[] | undefined
}

export const SettingGroup = ({ title, description, children }:SettingGroupProps) => {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div>
        <div className="text-xl font-bold text-slate-100">{title}</div>
        { description && description.length && (
          <div className="text-sm text-slate-400 mt-1">{description}</div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  )
}

export default SettingGroup