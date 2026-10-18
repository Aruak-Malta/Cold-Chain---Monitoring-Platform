import type { ReactNode } from "react";

type PageTitleProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageTitle({ eyebrow, title, description, action }: Readonly<PageTitleProps>) {
  return (
    <section className="page-title">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action}
    </section>
  );
}
