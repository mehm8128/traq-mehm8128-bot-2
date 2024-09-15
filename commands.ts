import { Api } from "traq-bot-ts"
import { match, P } from "ts-pattern"

const api = new Api({
	baseApiParams: { headers: { Authorization: `Bearer ${process.env.TOKEN}` } }
})

const delay = (n: number) =>
	new Promise(resolve => setTimeout(resolve, n * 1000))

const toGrass = (num: number) =>
	match(num)
		.with(0, () => ":0xebedf0:")
		.with(P.number.between(1, 4), () => ":0x9be9a8:")
		.with(P.number.between(5, 14), () => ":0x40c463:")
		.with(P.number.between(15, 29), () => ":0x30a14e:")
		.with(P.number.gte(30), () => ":0x216e39:")
		.otherwise(() => ":null:")

interface WSeed {
	borderDate: Date
	youbi: number
	/** 1: sinceを指定, -1: untilを指定 */
	mode: number
}

export const w = async ({
	user: { name: postedUsername },
	plainText,
	channelId
}: {
	user: { name: string }
	plainText: string
	channelId: string
}) => {
	const sinceArr = plainText.match(/since:(\d{4}-\d{2}-\d{2})/)
	const untilArr = plainText.match(/until:(\d{4}-\d{2}-\d{2})/)
	const usernameArr = plainText.match(/user:([a-zA-Z0-9-_]+)/)

	const username = match(usernameArr)
		.with(null, () => postedUsername)
		.with(P.nonNullable, ([x]) => x[1])
		.exhaustive()

	const wSeed: WSeed | undefined = await match([sinceArr, untilArr])
		.with([null, null], () => {
			const borderDate = new Date()
			const youbi = borderDate.getDay()
			const mode = -1
			return { borderDate, youbi, mode }
		})
		.with([P.nonNullable, null], ([x, _]) => {
			const since = x[1]
			const borderDate = new Date(
				`${since.slice(0, 4)}-${Number(since.slice(5, 7)).toString().padStart(2, "0")}-${since.slice(8)}`
			)
			const youbi = borderDate.getDay()
			const mode = 1
			return { borderDate, youbi, mode }
		})
		.with([null, P.nonNullable], ([_, y]) => {
			const until = y[1]
			const borderDate = new Date(
				`${until.slice(0, 4)}-${Number(until.slice(5, 7)).toString().padStart(2, "0")}-${until.slice(8)}`
			)
			const youbi = borderDate.getDay()
			const mode = -1
			return { borderDate, youbi, mode }
		})
		.with([P.nonNullable, P.nonNullable], async () => {
			await api.channels.postMessage(channelId, {
				content: "sinceとuntilをどちらも指定することはできません",
				embed: true
			})
			return undefined
		})
		.exhaustive()

	if (!wSeed) return
	let { borderDate, youbi, mode } = wSeed

	const { data } = await api.users.getUsers({ name: username })
	if (data.length === 0) {
		await api.channels.postMessage(channelId, {
			content: "ユーザーが見つかりませんでした",
			embed: true
		})
		return
	}
	const userUuid = data[0].id

	const numbers = []
	const indecies = Array(28)
		.fill(0)
		.map((_, i) => i)
	for (const _ of indecies) {
		const year = borderDate.getFullYear()
		const month = (borderDate.getMonth() + 1).toString().padStart(2, "0")
		const date = borderDate.getDate().toString().padStart(2, "0")
		const nextBorderDate = new Date(`${year}-${month}-${date}`)
		nextBorderDate.setDate(nextBorderDate.getDate() + 1)
		const nextYear = nextBorderDate.getFullYear()
		const nextMonth = (nextBorderDate.getMonth() + 1)
			.toString()
			.padStart(2, "0")
		const nextDate = nextBorderDate.getDate().toString().padStart(2, "0")
		borderDate.setDate(borderDate.getDate() + mode)

		const { data } = await api.messages.searchMessages({
			word: "",
			after: `${year}-${month}-${date}T00:00:00.000Z`,
			before: `${nextYear}-${nextMonth}-${nextDate}T00:00:00.000Z`,
			from: userUuid,
			limit: 1,
			offset: 0,
			sort: "createdAt"
		})
		numbers.push(data.totalHits)

		await delay(0.2)
	}

	if (mode === -1) {
		numbers.reverse()
	} else {
		youbi -= 1
	}

	let responseMessage = ""
	let currentIndex = 0
	const w = Array(5)
		.fill(0)
		.map(() => Array(7).fill(""))

	for (let i = 0; i < youbi + 1; i++) {
		w[0][i] = ":null:"
	}
	for (let i = youbi + 1; i < 7; i++) {
		w[0][i] = toGrass(numbers[currentIndex])
		currentIndex++
	}
	for (let i = 1; i < 4; i++) {
		for (let j = 0; j < 7; j++) {
			w[i][j] = toGrass(numbers[currentIndex])
			currentIndex++
		}
	}
	for (let i = 0; i < youbi + 1; i++) {
		w[4][i] = toGrass(numbers[currentIndex])
		currentIndex++
	}
	for (let i = youbi + 1; i < 7; i++) {
		w[4][i] = ":null:"
	}
	responseMessage +=
		":day0_sunday: :day1_monday: :day2_tuesday: :day3_wednesday: :day4_thursday: :day5_friday: :day6_saturday:"
	responseMessage += "\n"
	for (let i = 0; i < 5; i++) {
		for (let j = 0; j < 7; j++) {
			responseMessage += ` ${w[i][j]}`
		}
		responseMessage += "\n"
	}

	await api.channels.postMessage(channelId, {
		content: responseMessage,
		embed: true
	})
}

interface AtCoderResult {
	ContestName: string
	Performance: number
	OldRating: number
	NewRating: number
}
export const atcoder = async ({
	channelId,
	plainText
}: {
	channelId: string
	plainText: string
}) => {
	const userId = plainText.match(/atcoder (.+)/i)?.[1]
	if (!userId) {
		await api.channels.postMessage(channelId, {
			content: "ユーザーIDを指定してください",
			embed: true
		})
		return
	}
	const url = `https://atcoder.jp/users/${userId}/history/json`
	const res = await fetch(url)
	const data = await res.json()
	const result: AtCoderResult = data.toReversed()[0]
	await api.channels.postMessage(channelId, {
		content: `前回参加した${result.ContestName}の結果はパフォーマンスは${result.Performance}で、レートが${result.OldRating}からに${result.NewRating}に変化しました！`
	})
}
