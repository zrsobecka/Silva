import {
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  Footprints,
  Gamepad2,
  House,
  Tag,
} from "lucide-react";

const appearance = {
  Gry: { icon: Gamepad2, tone: "violet" },
  Ruch: { icon: Footprints, tone: "lime" },
  Nauka: { icon: BookOpen, tone: "cyan" },
  Dom: { icon: House, tone: "amber" },
  Praca: { icon: BriefcaseBusiness, tone: "blue" },
  Samodzielność: { icon: CarFront, tone: "rose" },
};

export function CategoryIcon({ category }: { category: string }) {
  const item = appearance[category as keyof typeof appearance];
  const Icon = item?.icon ?? Tag;
  return (
    <span className="category-icon" data-tone={item?.tone ?? "slate"} aria-hidden="true">
      <Icon size={17} strokeWidth={1.8} />
    </span>
  );
}
