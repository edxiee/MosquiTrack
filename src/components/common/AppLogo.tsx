import logo from "@/assets/images/Logo.png";
import soloLogo from "@/assets/images/solo-logo.png";

interface AppLogoProps {
  className?: string;
  variant?: "full" | "solo";
}

export default function AppLogo({ className, variant = "full" }: AppLogoProps) {
  const imageSrc = variant === "solo" ? soloLogo : logo;
  
  return (
    <img 
      src={imageSrc} 
      alt="MosquiTrack" 
      className={className} 
    />
  );
}