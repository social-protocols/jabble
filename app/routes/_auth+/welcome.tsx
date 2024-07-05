import { requireAnonymous } from "#app/utils/auth.server.ts";
import { Link } from "@remix-run/react";
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { StatusButton } from "#app/components/ui/status-button.tsx";

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request)
	return json({})
}

export default function WelcomeRoute() {
	return (
		<div className="pt-15 container flex flex-col justify-center pb-32 md:pt-20">
			<div className="text-center space-y-5 sm:space-y-10  mb-[16px] md:mb-[64px]">
				<h1 className="text-xl font-bold md:text-h1">Welcome to Jabble!</h1>
				<p className="text-body-sm text-muted-foreground">
					We are building a new place to have constructive discourse online.
				</p>
				<p className="text-body-sm text-muted-foreground font-bold">
					You are among the first people to try it!
				</p>
				<p className="text-body-sm text-muted-foreground">
					This platform is a work in progress and we'd love to hear your feedback! 🛠️
				</p>
			</div>
			<div className="mx-auto mt-10 min-w-[268px] max-w-sm">
				<StatusButton
					className="w-full"
					status={'idle'}
				>
					<Link
						className="w-full"
						to="/signup"
					>
						Get started! 🚀
					</Link>
				</StatusButton>
			</div>
		</div>
	)
}
