import { useNavigate } from '@remix-run/react'
import DOMPurify from 'isomorphic-dompurify'
import { Markdown } from '#app/components/markdown.tsx'
import { Truncate } from '#app/components/ui/truncate.tsx'

export function PostContent({
	content,
	maxLines,
	linkTo,
	deactivateLinks,
	className,
}: {
	content: string
	maxLines?: number
	deactivateLinks: boolean
	linkTo?: string
	className?: string
}) {
	const navigate = useNavigate()

	const sanitizedContent = DOMPurify.sanitize(content)

	return (
		<div
			style={{ cursor: 'pointer' }}
			onClick={() => linkTo && navigate(linkTo)}
			className={className}
		>
			<Truncate lines={maxLines}>
				<Markdown deactivateLinks={deactivateLinks}>
					{sanitizedContent}
				</Markdown>
			</Truncate>
		</div>
	)
}
