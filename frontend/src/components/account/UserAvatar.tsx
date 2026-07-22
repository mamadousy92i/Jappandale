import type { User } from "@/lib/types"

const sizes = {
  sm: "size-9 text-sm",
  md: "size-11 text-base",
  lg: "size-20 text-2xl",
} as const

export function UserAvatar({
  user,
  size = "md",
  className = "",
}: {
  user: Pick<User, "avatar" | "first_name" | "last_name" | "email">
  size?: keyof typeof sizes
  className?: string
}) {
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.trim()
    || user.email.charAt(0)

  return user.avatar ? (
    <img
      src={user.avatar}
      alt={`Photo de ${user.first_name || user.email}`}
      className={`${sizes[size]} shrink-0 rounded-full border border-black/10 object-cover ${className}`}
    />
  ) : (
    <span
      aria-label={`Avatar de ${user.first_name || user.email}`}
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-gold/20 font-heading font-bold text-gold-dark ${className}`}
    >
      {initials.toUpperCase()}
    </span>
  )
}
