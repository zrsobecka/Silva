import {
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  CodeXml,
  FolderKanban,
  Footprints,
  Gamepad2,
  HeartPulse,
  House,
  Shield,
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

const groupAppearance = {
  ...appearance,
  Programowanie: { icon: CodeXml, tone: "cyan" },
  Hakowanie: { icon: Shield, tone: "violet" },
  Projekty: { icon: FolderKanban, tone: "blue" },
  Zdrowie: { icon: HeartPulse, tone: "rose" },
};

export function CategoryIcon({
  category,
  forPlanGroup = false,
}: {
  category: string;
  forPlanGroup?: boolean;
}) {
  const icons: Partial<Record<string, (typeof appearance)["Gry"]>> = forPlanGroup
    ? groupAppearance
    : appearance;
  const item = Object.hasOwn(icons, category) ? icons[category] : undefined;
  const Icon = item?.icon ?? Tag;
  return (
    <span className="category-icon" data-tone={item?.tone ?? "slate"} aria-hidden="true">
      <Icon size={17} strokeWidth={1.8} />
    </span>
  );
}
