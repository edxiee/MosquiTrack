import logo from "@/assets/images/Logo.png";

interface AppLogoProps {
  className?: string;
}

export default function AppLogo({
  className,
}: AppLogoProps) {
  return (
    <img
      src={logo}
      alt="MosquiTrack"
      className={className}
    />
  );
}