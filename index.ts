import { Client } from "traq-bot-ts"
import { atcoder, w } from "./commands"

const client = new Client({ token: process.env.TOKEN })

client.on("MESSAGE_CREATED", async ({ body }) => {
	if (body.message.plainText.includes("草")) {
		await w(body.message)
	} else if (/atcoder/i.test(body.message.plainText)) {
		await atcoder(body.message)
	}
})

client.listen(() => {
	console.log("Listening...")
})
