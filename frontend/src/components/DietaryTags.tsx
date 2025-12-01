interface DietaryTagsProps {
  tags: string[];
}

export default function DietaryTags({ tags }: DietaryTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
          {tag}
        </span>
      ))}
    </div>
  );
}
