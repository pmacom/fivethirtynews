import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface BasicToggleProps {
  /**
   * A unique identifier for the toggle switch. ex: `simple-mode`
   */
  slug: string,
  label: string,
  checked: boolean
  onChange?: (checked: boolean) => void
}
export const BasicToggle = ({ slug, checked, label, onChange }:BasicToggleProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor={slug}>{label}</Label>
      <Switch
        id={slug}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )
}

export default BasicToggle