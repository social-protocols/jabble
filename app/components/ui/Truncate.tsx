import type react from 'react'

export const Truncate: React.FC<{
	children: react.ReactNode
	lines?: number // Number of lines after which to truncate
}> = ({ children, lines }) => {
	const style: react.CSSProperties = {
		display: '-webkit-box',
		WebkitBoxOrient: 'vertical',
		WebkitLineClamp: lines || undefined,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		wordWrap: 'break-word',
		width: '100%', // Ensure the component's width is bounded by its parent
	}

	return <div style={style}>{children}</div>
}
