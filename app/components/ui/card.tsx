import { type PropsWithChildren } from 'react'

type CardProps = {
	className: string | undefined
}

export function Card(props: PropsWithChildren<CardProps>) {
	return (
		<div
			className={
				'w-full space-y-5 rounded-lg bg-primary-foreground p-5' +
				' ' +
				props.className
			}
		>
			{props.children}
		</div>
	)
}
