import zaloBlack from "../../assets/images/zalo.png";
import zaloWhite from "../../assets/images/zalo-white.png";
import zaloBlue from "../../assets/images/zalo-blue.png";

interface ZaloIconProps {
  size?: number | string;
  className?: string;
  variant?: "white" | "blue" | "black";
  alt?: string;
}

export default function ZaloIcon({
  size = 20,
  className = "",
  variant = "white",
  alt = "Zalo",
}: ZaloIconProps) {
  const src =
    variant === "black" ? zaloBlack : variant === "blue" ? zaloBlue : zaloWhite;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
