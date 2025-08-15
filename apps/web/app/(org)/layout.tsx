import type { PropsWithChildren } from "react";

export const revalidate = 0;

export default function Layout(props: PropsWithChildren) {
	return (
		<>
			{props.children}
		</>
	);
}
