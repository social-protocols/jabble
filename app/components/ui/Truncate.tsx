import {
	useState,
	useRef,
	useEffect,
	type ReactNode,
	type CSSProperties,
} from 'react'

function truncateSingleParagraph(element: HTMLElement, lines: number | null) {
	const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight)

	const childHeight = element.clientHeight

	// The below is an alternative to lineClamp that creates more consistency between Safari and Chrome
	element.style.display = 'block'
	element.style.overflow = 'hidden'
	element.style.maxHeight =
		lines == null ? '' : (lineHeight * lines).toString() + 'px'

	// Use the below implementation in case we find any problems with the maxHeight approach above
	// element.style.display = '-webkit-box'
	// element.style.webkitBoxOrient = 'vertical'
	// element.style.overflow = 'hidden'
	// element.style.webkitLineClamp = lines == null ? '' : lines.toString()

	return lines !== null && childHeight / lineHeight > lines
}

/*
	This function truncates an element to the specific number of lines, and adds an ellipsis
	below the element if it is truncated.

	This works like -webkit-line-clamp, but for *multi-paragraph* text. -webkit-line-clamp only works
	for an element with a single paragraph of text/inline elements. If it contains multiple block elements
	like paragraphs or divs with spaces between them, it doesn't work in Safari. 

	Simply setting max-height can't be used to cut off at an exact number of lines. First,
	the inner divs may have varying line heights, and they may have gaps between them. To avoid cutting
	off in the middle of a line, a more complex calculation is necessary. 

	Also, for multiple paragraph text, the space between paragraphs adds complexity. If the first paragraph
	is two lines, and you cut of after three lines, then you will have an unnecessary blank line before the
	ellipsis. It looks cleaner to cut off after two lines in this case.

	Some related discussions about truncating multi-paragraph text:
			https://codepen.io/jimratliff/pen/BaBzzbq


	An alternative approach may be to set a max-height and using a fade, as described here: 
		https://stackoverflow.com/a/66024788
	This would still require Javascript to add an ellipsis or "read more" link when text has been truncated, and leaves
	the problem of blank lines after a paragraph.

	Currently, this function assumes that any inner elements are themselves "paragraphs" whose height
	in lines can be calculated.

	Considerations of functionality to preserves when refactoring or modifying
	- Respects formatting of content when there are mulitple block elements
	- Work when resizing the window
	- Doesn't cut off in the middle of a line
	- Doesn't cut off after blank line between paragraphs
	- Works consistently for safari and chrome
*/

function truncateMultiParagraphDiv(element: HTMLElement, lines: number) {
	const contentDiv = element.firstChild as HTMLElement

	if (!contentDiv.children) {
		return truncateSingleParagraph(contentDiv, lines)
	}

	const children: HTMLCollection = contentDiv.children!
	let n = children.length

	// This function will re-run when the window is resized. So one of the children may already have been
	// truncated. The block below resets all the children (so they are all visible and untruncated).
	for (let i = 0; i < n; i++) {
		let child = children[i]! as HTMLElement
		truncateSingleParagraph(child, null)
	}

	// Calculate the maximum height in pixils
	const elementTop = contentDiv.offsetTop
	const lineHeight = parseFloat(window.getComputedStyle(contentDiv).lineHeight)
	const maxHeight = lineHeight * lines

	let isTruncated = false
	if (contentDiv.clientHeight >= maxHeight) {
		if (n == 1) {
			// If there is only one inner div, it's easy! Just truncate it.
			const child = children[0]! as HTMLElement
			return truncateSingleParagraph(child, lines)
		} else {
			for (let i = 0; i < n; i++) {
				let child = children[i]! as HTMLElement

				let relativeTop = child.offsetTop - elementTop
				let relativeBottom = child.offsetTop - elementTop + child.clientHeight

				// If the element doesn't fit within maxHeight
				if (relativeBottom >= maxHeight) {
					// And if the top of the element does fit
					if (relativeTop < maxHeight) {
						// Then truncate this paragraph
						const linesRemaining = Math.floor(
							(maxHeight - relativeTop) / lineHeight,
						)
						if (linesRemaining == 0) {
							child.style.display = 'none'
						} else {
							truncateSingleParagraph(child, linesRemaining)
						}
					} else {
						// Otherwise hide this (and all subsequent) paragraphs
						child.style.display = 'none'
					}
					isTruncated = true
				}
			}
		}
	}

	return isTruncated
}

export const Truncate: React.FC<{
	children: ReactNode
	lines?: number // Number of lines after which to truncate
}> = ({ children, lines }) => {
	const [isTruncated, setIsTruncated] = useState(false)
	const postContentRef = useRef(null)

	/* Show or hide the ellipsis and readMoreLink based on the
          content of the DOM: specifically, whether or not the post content div
          is being cut off or not. The code below updates the state correctly
          when the browser window is resized.*/
	useEffect(() => {
		function truncate() {
			if (lines === undefined) {
				return
			}

			var element: HTMLElement = postContentRef.current!

			const truncated = truncateMultiParagraphDiv(element, lines)
			if (truncated) {
				setIsTruncated(true)
			} else {
				setIsTruncated(false)
			}
		}
		window.addEventListener('resize', truncate)
		truncate()
		return () => window.removeEventListener('resize', truncate)
	}, [lines])

	return (
		<>
			<div ref={postContentRef}>{children}</div>
			{isTruncated && <div className="ellipsis">...</div>}
		</>
	)
}
