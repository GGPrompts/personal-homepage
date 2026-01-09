'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FloatingAgentButtonProps {
  agentId: string;
  avatarUrl?: string;
  avatarFallback?: string;
  onClick: (agentId: string) => void;
  className?: string;
}

export function FloatingAgentButton({
  agentId,
  avatarUrl,
  avatarFallback = 'AI',
  onClick,
  className,
}: FloatingAgentButtonProps) {
  return (
    <button
      onClick={() => onClick(agentId)}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'group flex items-center justify-center',
        'h-14 w-14 rounded-full',
        'glass border border-primary/30',
        'shadow-lg shadow-primary/20',
        'transition-all duration-300 ease-out',
        'hover:scale-110 hover:shadow-xl hover:shadow-primary/40',
        'hover:border-primary/60',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
        className
      )}
      data-tabz-action="open-agent"
      data-tabz-agent={agentId}
    >
      {/* Pulse ring on hover */}
      <span
        className={cn(
          'absolute inset-0 rounded-full',
          'bg-primary/20',
          'animate-ping opacity-0',
          'group-hover:opacity-75',
          'transition-opacity duration-300'
        )}
      />

      {/* Glow effect on hover */}
      <span
        className={cn(
          'absolute inset-0 rounded-full',
          'bg-gradient-to-br from-primary/30 to-primary/10',
          'opacity-0 blur-md',
          'group-hover:opacity-100',
          'transition-opacity duration-300'
        )}
      />

      {/* Avatar */}
      <Avatar className="h-10 w-10 relative z-10">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={`Agent ${agentId}`} />}
        <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

export default FloatingAgentButton;
