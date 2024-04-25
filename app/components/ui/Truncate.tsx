import { useNavigate } from '@remix-run/react'
import {
	useState,
	useRef,
	useEffect,
	type ReactNode,
	type CSSProperties,
} from 'react'

export const Truncate: React.FC<{
	children: ReactNode
	lines?: number // Number of lines after which to truncate
}> = ({ children, lines }) => {
	const [isTruncated, setIsTruncated] = useState(false)
	const postContentRef = useRef(null)

	const showOrHideEllipsis = function () {
		var element: HTMLElement = postContentRef.current!

		/* Show all child elements, because we may have hidden some of them last time this function ran */
		const contentDiv = element.firstChild as ChildNode & {
			children: HTMLCollection
		}

		if (!contentDiv.children) {
			return
		}

		const children: HTMLCollection = contentDiv.children!

		let n = children.length
		for (let i = 0; i < n; i++) {
			let child = children[i]! as HTMLElement
			child.style.display = 'inline-block'
		}

		/* Set the isTruncated state to true if there is any content that has been cut off */
		const maxHeight = element.clientHeight
		if (element.scrollHeight > maxHeight) {
			setIsTruncated(true)
		} else {
			setIsTruncated(false)
		}

		/* The following eliminates the one-line gap that occurs between the
                  first paragraph of the content and the ellipsis in some cases.
                  Specifically, when the content happens to be cut off between
                  paragraphs after the vertical gap between one paragraph but before
                  the next paragraph, then the we end up with an unnecessary gap.

               The content div uses a vertical flexbox layout with a gap, and the gap
               is only shown **between** elements. So if we set display=none for
               elements that are completely cutoff, then no gap will be placed
               after the preceding element. */

		if (lines !== undefined) {
			const elementTop = element.offsetTop
			let n = children.length

			for (let i = 0; i < n; i++) {
				let child = children[i]! as HTMLElement

				let relativeTop = child.offsetTop - elementTop
				if (relativeTop >= maxHeight - 2 && i > 0) {
					child.style.display = 'none'
				}
			}
		}
	}

	/* Show or hide the ellipsis and readMoreLink based on the
          content of the DOM: specifically, whether or not the post content div
          is being cut off or not. The code below updates the state correctly
          when the browser window is resized.*/
	useEffect(() => {
		window.addEventListener('resize', showOrHideEllipsis)
		showOrHideEllipsis()
		return () => window.removeEventListener('resize', showOrHideEllipsis)
	}, [showOrHideEllipsis])

	const navigate = useNavigate()

	const style: CSSProperties = {
		display: '-webkit-box',
		WebkitBoxOrient: 'vertical',
		WebkitLineClamp: lines || undefined,
		overflow: 'hidden',
		wordWrap: 'break-word',
		width: '100%', // Ensure the component's width is bounded by its parent
	}

	const ellipsisStyle: CSSProperties = {
		position: 'relative',
		fontSize: '24px',
		paddingLeft: '0px',
		lineHeight: '0.75em',
		top: '0px',
		paddingTop: '0px',
		marginTop: '-0.4em',
	}

	return (
		<>
			<div ref={postContentRef} style={style}>
				{children}
			</div>
			{isTruncated && <div style={ellipsisStyle}>...</div>}
		</>
	)
}
