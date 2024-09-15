import { Client } from "traq-bot-ts"
import { atcoder, w } from "./commands"
import { match, P } from "ts-pattern"

const client = new Client({ token: process.env.TOKEN })

client.on("MESSAGE_CREATED", async ({ body }) => {
	match(body.message.plainText)
		.with(P.string.regex(/草/), () => w(body.message))
		.with(P.string.regex(/atcoder/i), () => atcoder(body.message))
		.otherwise(() => {})
})

client.listen(() => {
	console.log("Listening...")
})
