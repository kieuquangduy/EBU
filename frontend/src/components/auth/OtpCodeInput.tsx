import { useRef } from "react";

const OTP_LENGTH = 6;

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
};

export default function OtpCodeInput({ value, onChange, error, disabled }: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (index: number, input: string) => {
    const digit = input.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (value[index]) {
        const next = [...value];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    for (let index = 0; index < pasted.length; index++) next[index] = pasted[index];
    onChange(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-between" onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }, (_, index) => {
        const digit = value[index] ?? "";
        return (
          <input
            key={index}
            ref={(element) => { inputRefs.current[index] = element; }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`OTP digit ${index + 1}`}
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoFocus={index === 0}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={`min-w-0 w-12 h-14 text-center text-xl font-bold rounded-xl border outline-none transition-all duration-150 disabled:opacity-60
              ${error
                ? "border-red-400 bg-red-50 text-red-600"
                : digit
                  ? "border-[#E14D3D] bg-white text-gray-900"
                  : "border-[#E5E7EB] bg-white text-gray-900"
              }
              focus:border-[#E14D3D] focus:ring-1 focus:ring-[#E14D3D]`}
            style={{ fontFamily: "Inter, sans-serif" }}
          />
        );
      })}
    </div>
  );
}
