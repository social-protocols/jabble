import { useNavigate } from '@remix-run/react'
import { useEffect } from 'react'

export default function ClaimExtraction() {
	const navigate = useNavigate()

	useEffect(() => {
		navigate('/polls')
	}, [])

	return (<></>)
}
