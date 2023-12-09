import { PropsWithChildren } from "react";

type CardProps = {
  className: string | undefined,
}

export function Card(props: PropsWithChildren<CardProps>) {
  return (
    <div className={"rounded-lg bg-primary-foreground p-5 w-full max-w-3xl space-y-5" + " " + props.className}>
      {props.children}
    </div>
  )

}
