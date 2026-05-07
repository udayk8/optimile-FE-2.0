import { Input, Textarea } from "@/components/ui/Input";

type Props = {
  label: string;
  required?: boolean;
  type?: "checkbox" | "text" | "textarea";
  value: boolean | string;
  onChange: (value: boolean | string) => void;
};

export function ChecklistItem({ label, required, type = "checkbox", value, onChange }: Props) {
  return (
    <label className="checklist-item">
      <div className="checklist-label">
        <span>{label}</span>
        {required ? <span className="muted">(required)</span> : null}
      </div>
      {type === "checkbox" ? (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      ) : type === "textarea" ? (
        <Textarea value={String(value)} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input value={String(value)} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
