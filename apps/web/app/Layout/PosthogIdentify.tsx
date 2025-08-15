"use client";

import { Suspense, useEffect } from "react";
import {
	identifyUser,
	initAnonymousUser,
	trackEvent,
} from "../utils/analytics";
import { useUser } from "@clerk/nextjs";

export function PosthogIdentify() {
	return (
		<Suspense>
			<Inner />
		</Suspense>
	);
}

function Inner() {
	const { user, isSignedIn } = useUser();

	useEffect(() => {
		if (!isSignedIn || !user) {
			initAnonymousUser();
			return;
		} else {
			// Track if this is the first time a user is being identified
			const isNewUser = !localStorage.getItem("user_identified");

			identifyUser(user.id);

			if (isNewUser) {
				localStorage.setItem("user_identified", "true");
				trackEvent("user_signed_up");
			}

			trackEvent("user_signed_in");
		}
	}, [user, isSignedIn]);

	return null;
}
