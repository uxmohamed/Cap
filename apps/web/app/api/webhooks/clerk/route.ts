import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@cap/database';
import { users } from '@cap/database/schema';
import { eq } from 'drizzle-orm';
import { serverEnv } from '@cap/env';

export async function POST(req: Request) {
	const WEBHOOK_SECRET = serverEnv().CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
	}

	// Get the headers
	const headerPayload = headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response('Error occured -- no svix headers', {
			status: 400
		});
	}

	// Get the body
	const payload = await req.json();
	const body = JSON.stringify(payload);

	// Create a new Svix instance with your secret.
	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	// Verify the payload with the headers
	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error('Error verifying webhook:', err);
		return new Response('Error occured', {
			status: 400
		});
	}

	// Get the ID and type
	const { id } = evt.data;
	const eventType = evt.type;

	console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
	console.log('Webhook body:', body);

	// Handle the webhook
	switch (eventType) {
		case 'user.created':
			const user = evt.data;
			
			// Create user in database with all required fields
			try {
				await db().insert(users).values({
					id: user.id,
					email: user.email_addresses[0]?.email_address || "",
					emailVerified: user.email_addresses[0]?.verification?.status === "verified" ? new Date() : null,
					name: user.first_name || "",
					lastName: user.last_name || "",
					image: user.image_url || "",
					activeOrganizationId: "",
					stripeCustomerId: null,
					stripeSubscriptionId: null,
					stripeSubscriptionStatus: null,
					thirdPartyStripeSubscriptionId: null,
					inviteQuota: 0,
				});
				console.log(`User created in database: ${user.id}`);
			} catch (error) {
				console.error('Error creating user in database:', error);
			}
			break;
			
		case 'user.updated':
			const updatedUser = evt.data;
			
			// Update user in database
			try {
				await db()
					.update(users)
					.set({
						email: updatedUser.email_addresses[0]?.email_address || "",
						emailVerified: updatedUser.email_addresses[0]?.verification?.status === "verified" ? new Date() : null,
						name: updatedUser.first_name || "",
						lastName: updatedUser.last_name || "",
						image: updatedUser.image_url || "",
					})
					.where(eq(users.id, updatedUser.id));
				console.log(`User updated in database: ${updatedUser.id}`);
			} catch (error) {
				console.error('Error updating user in database:', error);
			}
			break;
			
		case 'user.deleted':
			const deletedUser = evt.data;
			
			// Delete user from database
			try {
				await db()
					.delete(users)
					.where(eq(users.id, deletedUser.id));
				console.log(`User deleted from database: ${deletedUser.id}`);
			} catch (error) {
				console.error('Error deleting user from database:', error);
			}
			break;
			
		default:
			console.log(`Unhandled event type: ${eventType}`);
	}

	return new Response('', { status: 200 });
}
