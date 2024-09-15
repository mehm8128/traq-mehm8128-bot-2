import { Api } from "traq-bot-ts"

const api = new Api({
	baseApiParams: { headers: { Authorization: `Bearer ${process.env.TOKEN}` } }
})

const delay = (n: number) =>
	new Promise(resolve => setTimeout(resolve, n * 1000))

const toGrass = (num: number) => {
	if (num === 0) {
		return ":0xebedf0:"
	}
	if (1 <= num && num < 5) {
		return ":0x9be9a8:"
	}
	if (5 <= num && num < 15) {
		return ":0x40c463:"
	}
	if (15 <= num && num < 30) {
		return ":0x30a14e:"
	}
	if (30 <= num) {
		return ":0x216e39:"
	}
	return ":null:"
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
	const usernameArr = plainText.match(/user:([a-zA-Z0-9-_]*)/)

	let since: string | null = null
	let until: string | null = null
	let username: string | null = null
	let borderDate = new Date()
	let youbi = 0
	let mode = 0
	if (sinceArr === null && untilArr === null) {
		//1:sinceを指定, -1:untilを指定
		borderDate = new Date()
		youbi = borderDate.getDay()
		mode = -1
	} else if (sinceArr !== null && untilArr === null) {
		since = sinceArr[1]
		borderDate = new Date(
			`${since.slice(0, 4)}-${Number(since.slice(5, 7)).toString().padStart(2, "0")}-${since.slice(8)}`
		)
		youbi = borderDate.getDay()
		mode = 1
	} else if (sinceArr === null && untilArr !== null) {
		until = untilArr[1]
		borderDate = new Date(
			`${until.slice(0, 4)}-${Number(until.slice(5, 7)).toString().padStart(2, "0")}-${until.slice(8)}`
		)
		youbi = borderDate.getDay()
		mode = -1
	} else if (sinceArr !== null && untilArr !== null) {
		await api.channels.postMessage(channelId, {
			content: "sinceとuntilをどちらも指定することはできません",
			embed: true
		})
		return
	}

	if (usernameArr === null) {
		username = postedUsername
	} else {
		username = usernameArr[1]
	}

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

		await delay(0.1)
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
	await delay(1)
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
	const userId = plainText.split(" ")[2]
	const url = `https://atcoder.jp/users/${userId}/history/json`
	const res = await fetch(url)
	const data = await res.json()
  const result: AtCoderResult = data.toReversed()[0]
	await api.channels.postMessage(channelId, {
		content: `前回参加した${result.ContestName}の結果はパフォーマンスは${result.Performance}で、レートが${result.OldRating}からに${result.NewRating}に変化しました！`
	})
}
