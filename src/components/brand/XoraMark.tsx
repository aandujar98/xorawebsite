import Image from "next/image";

type XoraMarkProps = {
  size?: number;
  className?: string;
};

export function XoraMark({ size = 52, className }: XoraMarkProps) {
  return (
    <Image
      src="/xora-logo.png"
      alt="XOrA Network"
      width={656}
      height={522}
      className={className ?? "brand-logo"}
      style={{ height: size, width: "auto" }}
      priority
    />
  );
}
