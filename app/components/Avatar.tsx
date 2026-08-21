function initialsFor(firstName: string | null, lastName: string | null, email: string) {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];
  if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

export function Avatar({
  photoUrl,
  firstName,
  lastName,
  email,
  size = 32,
}: {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  size?: number;
}) {
  const style = { width: size, height: size };

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
    >
      {initialsFor(firstName ?? null, lastName ?? null, email)}
    </div>
  );
}
