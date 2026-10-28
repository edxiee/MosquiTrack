import loginLogo from "@/assets/images/Log-In-Logo.png";

interface AuthLogoProps {
  className?: string;
}

export default function AuthLogo({ className }: AuthLogoProps) {
  return (
    <div className="flex justify-center">
      <img
        src={loginLogo}
        alt="MosquiTrack"
        // Adjust the height class (e.g., h-12, h-16, h-20) to perfectly fit your login card
        className={className ?? "h-16 w-auto object-contain"} 
      />
    </div>
  );
}