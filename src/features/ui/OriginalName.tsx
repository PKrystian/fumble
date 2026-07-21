interface OriginalNameProps {
  name?: string | undefined;
  className?: string | undefined;
}

export function OriginalName({ name, className }: OriginalNameProps) {
  if (!name) return null;
  return (
    <span
      title={name}
      className={['font-normal italic text-arcane-300/80', className]
        .filter(Boolean)
        .join(' ')}
    >
      {name}
    </span>
  );
}
