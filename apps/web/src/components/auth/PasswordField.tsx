import { useId, useState } from "react";
import { IconEye, IconEyeOff } from "../ui/Icons";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  id?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required,
  minLength,
  placeholder,
  id: idProp,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <label className="login-field" htmlFor={id}>
      <span className="login-field-label">{label}</span>
      <div className="login-password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="login-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
    </label>
  );
}
