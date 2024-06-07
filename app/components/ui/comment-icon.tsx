import { type CSSProperties } from 'react'

export function CommentIcon({ needsVote }: { needsVote: boolean }) {
	const notificationIconCss: CSSProperties = {
		position: 'relative',
		display: 'inline-block',
		fontSize: '24px',
	}

	const speechBalloonCss: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
	}

	const blueDotCss: CSSProperties = {
		position: 'absolute',
		top: '4px',
		right: '4px',
		width: '12px',
		height: '12px',
		backgroundColor: 'blue',
		borderRadius: '50%',
		border: '2px solid white',
		transform: 'translate(50%, -50%)',
	}

	return (
		<>
			<div style={notificationIconCss}>
				{needsVote && <div style={blueDotCss}></div>}
				<div style={speechBalloonCss} className="text-sm">
					🗨
				</div>
			</div>
		</>
	)
}
