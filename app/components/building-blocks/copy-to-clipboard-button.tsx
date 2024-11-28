import { toast } from 'sonner'
import { Icon } from '../ui/icon.tsx'

export function CopyToClipboardButton({ url }: { url: string }) {
	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(url)
			toast('Copied URL to clipboard')
		} catch (err) {
			console.error('Failed to copy:', err)
		}
	}

	return (
		<button onClick={copyToClipboard}>
			<Icon name="copy">Copy URL to Clipboard</Icon>
		</button>
	)
}
