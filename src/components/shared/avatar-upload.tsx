import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/tailwind";

interface AvatarUploadProps {
  value?: string;
  onChange: (value: string) => void;
  fallback?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function AvatarUpload({
  value,
  onChange,
  fallback = "A",
  size = "default",
  className,
}: AvatarUploadProps) {
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <button
      className={cn("group relative cursor-pointer rounded-full", className)}
      data-slot="avatar-upload"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      type="button"
    >
      <Avatar className="size-16" size={size}>
        <AvatarImage src={value} />
        <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        <Camera className="size-6 text-white" />
      </div>
      <input
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
    </button>
  );
}
