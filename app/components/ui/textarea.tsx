import * as React from 'react'
import TextareaAutosize, {
	type TextareaAutosizeProps,
} from 'react-textarea-autosize'

import { cn } from '#app/utils/misc.tsx'

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
	({ className, ...props }, ref) => {
		return (
			<TextareaAutosize
				className={cn(
					'flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-input-invalid',
					className,
				)}
				ref={ref}
				{...props}
			/>
		)
	},
)
Textarea.displayName = 'Textarea'

export { Textarea }
