import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const { data, error } = await supabase.from("todos").select("id,title");
	if (error) {
		return <pre className="text-red-500">{String(error.message)}</pre>;
	}

	return (
		<ul className="p-6 list-disc">
			{data?.map((t) => (
				<li key={t.id}>{t.title}</li>
			))}
		</ul>
	);
}



