type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({
  title,
  description = "This section is a placeholder. You can change the layout and features later.",
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-foreground text-xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
