export const DISPLAY_NAMES: Record<string, string> = {
	// Full names (matching DB exactly)
	"মার্গারেট ধূনী": "Margaret Dhuni",
	"জয়শ্রী দেউড়ী": "Joysree Deuri",
	"মোরশেদা আক্তার": "Morsheda Aktar",
	"সুপ্রিয়া বিশ্বাস": "Supriya Bishwash",
	"অঞ্জলী শিকদার": "Anjali Shikdar",
	"জহুরা খাতুন": "Johura Khatun",
	"গীতা বসাক": "Gita Basak",
	"বিলকিস বানু": "Bilkis Banu",
	"নাছরিন আক্তার": "Nasrin Aktar",
	"ডলি আকতার": "Dolly Aktar",
	"সাফিয়া সুলতানা": "Safiya Sultana",
	"মোছাঃ শিরীন সুলতানা": "Shirin Sultana",
	"সালমা আক্তার": "Salma Aktar",
	"মনি আক্তার": "Moni Aktar",
	"মালেকা খাতুন": "Maleka Khatun",
	"জেসমিন খাঁন": "Jesmin Khan",
	"সেলিনা আক্তার": "Selina Aktar",
	"সেলিনা আক্তার (2)": "Selina Aktar 2",
	"তাহেরা কোহিনুর": "Tahera Kohinur",
	"খালেদা আক্তার": "Khaleda Aktar",
	"ফাতেমা বেগম": "Fatema Begam",
	"সাদিয়া আফরিন পলি": "Sadia Afrin Poly",
	"তাসলিমা জান্নাত": "Taslima Jannat",
	"মাধুরী রানী কর্মকার": "Madhuri Rani Karmakar",
	"মোছাঃ মৌসুমী আক্তার": "Mousumi Aktar",
	"দিলরোবা আক্তার": "Dilroba Aktar",
	"তহমিনা পারভীন": "Tahmina Parvin",
	নাসরীন: "Nasrin",
	"ইয়াসমিন সুলতানা": "Yasmin Sultana",
	"রানী আক্তার মৌ": "Rani Aktar Mau",
	"মোছাঃ আন্না খাতুন": "Anna Khatun",
	"হালিমা আক্তার": "Halima Aktar",
	"মোছাঃ রাহিমা": "Rahima",
	"মমতাজ জাহান": "Momtaj Jahan",
	"শ্রাবণী গৃহ": "Shraboni Griho",

	মার্গারেট: "Margaret",
	জয়শ্রী: "Joysree",
	জয়শ্রী: "Joysree",
	মোর্শেদা: "Morsheda",
	মোরশেদা: "Morsheda",
	সুপ্রিয়া: "Supriya",
	সুপ্রিয়া: "Supriya",
	অঞ্জলি: "Anjali",
	অঞ্জলী: "Anjali",
	জহোরা: "Johora",
	জহুরা: "Johura",
	গীতা: "Gita",
	বিলকিস: "Bilkis",
	নাসরিন: "Nasrin",
	নাছরিন: "Nasrin",
	ডলি: "Dolly",
	সাফিয়া: "Safiya",
	সাফিয়া: "Safiya",
	শিরিন: "Shirin",
	শিরীন: "Shirin",
	সালমা: "Salma",
	মনি: "Moni",
	মালেকা: "Maleka",
	সাদিয়া: "Sadia",
	সাদিয়া: "Sadia",
	তাসলিমা: "Taslima",
	খালেদা: "Khaleda",
	তাহমিনা: "Tahmina",
	তহমিনা: "Tahmina",
	তাহেরা: "Tahera",
	ইয়াসমিন: "Yasmin",
	ইয়াসমিন: "Yasmin",
	জেসমিন: "Jesmin",
	আন্না: "Anna",
	মৌ: "Mau",
	রানী: "Rani",
	মমতাজ: "Momtaj",
	শ্রাবণী: "Shraboni",
	মৌসুমী: "Mousumi",
	মাধুরী: "Madhuri",
	সুবর্ণা: "Suborna",
	হালিমা: "Halima",
	ফাতেমা: "Fatema",
	দিলরোবা: "Dilroba",
	রাহিমা: "Rahima",
};

export const PHONETIC_MAP: Record<string, string[]> = {
	// Margaret Dhuni
	margaret: ["মার্গারেট ধূনী", "মার্গারেট"],
	margarete: ["মার্গারেট ধূনী", "মার্গারেট"],
	"margaret dhuni": ["মার্গারেট ধূনী"],

	// Joysree Deuri
	joy: ["জয়শ্রী দেউড়ী", "জয়শ্রী"],
	joysree: ["জয়শ্রী দেউড়ী", "জয়শ্রী"],
	joyshree: ["জয়শ্রী দেউড়ী", "জয়শ্রী"],
	jayshree: ["জয়শ্রী দেউড়ী", "জয়শ্রী"],
	joyosree: ["জয়শ্রী দেউড়ী"],
	joyoshree: ["জয়শ্রী দেউড়ী"],
	joyonti: ["জয়শ্রী দেউড়ী"],
	"enjoy three": ["জয়শ্রী দেউড়ী"],
	"enjoy tree": ["জয়শ্রী দেউড়ী"],
	"enjoin three": ["জয়শ্রী দেউড়ী"],
	"in joy three": ["জয়শ্রী দেউড়ী"],
	"joysree deuri": ["জয়শ্রী দেউড়ী"],

	// Morsheda Aktar
	morsheda: ["মোরশেদা আক্তার", "মোরশেদা"],
	mursheda: ["মোরশেদা আক্তার", "মোরশেদা"],
	"morsheda aktar": ["মোরশেদা আক্তার"],

	// Supriya Bishwash
	supriya: ["সুপ্রিয়া বিশ্বাস", "সুপ্রিয়া"],
	suprova: ["সুপ্রিয়া বিশ্বাস"],
	"supriya bishwash": ["সুপ্রিয়া বিশ্বাস"],

	// Anjali Shikdar
	anjali: ["অঞ্জলী শিকদার", "অঞ্জলী"],
	anjoli: ["অঞ্জলী শিকদার"],
	"anjali shikdar": ["অঞ্জলী শিকদার"],

	// Johura Khatun
	johora: ["জহুরা খাতুন", "জহুরা"],
	zohora: ["জহুরা খাতুন"],
	"johura khatun": ["জহুরা খাতুন"],

	// Gita Basak
	gita: ["গীতা বসাক", "গীতা"],
	geeta: ["গীতা বসাক"],
	guitar: ["গীতা বসাক"],
	"gita basak": ["গীতা বসাক"],

	// Bilkis Banu
	bilkis: ["বিলকিস বানু", "বিলকিস"],
	bilquis: ["বিলকিস বানু"],
	"bilkis banu": ["বিলকিস বানু"],

	// Nasrin Aktar (nurse_9) + Nasrin (nurse_28)
	nasrin: ["নাছরিন আক্তার", "নাসরীন", "নাছরিন", "নাসরিন"],
	nasreen: ["নাছরিন আক্তার", "নাসরীন", "নাছরিন"],
	"nasrin aktar": ["নাছরিন আক্তার"],
	"nasrin 2": ["নাসরীন"],
	"nasrin two": ["নাসরীন"],

	// Dolly Aktar
	dolly: ["ডলি আকতার", "ডলি"],
	doli: ["ডলি আকতার"],
	"dolly aktar": ["ডলি আকতার"],

	// Safiya Sultana
	safiya: ["সাফিয়া সুলতানা", "সাফিয়া"],
	safia: ["সাফিয়া সুলতানা"],
	sofia: ["সাফিয়া সুলতানা"],
	"safiya sultana": ["সাফিয়া সুলতানা"],

	// Shirin Sultana
	shirin: ["মোছাঃ শিরীন সুলতানা", "শিরীন"],
	shireen: ["মোছাঃ শিরীন সুলতানা"],
	"shirin sultana": ["মোছাঃ শিরীন সুলতানা"],

	// Salma Aktar
	salma: ["সালমা আক্তার", "সালমা"],
	"salma aktar": ["সালমা আক্তার"],

	// Moni Aktar
	moni: ["মনি আক্তার", "মনি"],
	"moni aktar": ["মনি আক্তার"],

	// Maleka Khatun
	maleka: ["মালেকা খাতুন", "মালেকা"],
	"maleka khatun": ["মালেকা খাতুন"],

	// Jesmin Khan + Yasmin Sultana
	yasmin: ["জেসমিন খাঁন", "ইয়াসমিন সুলতানা", "ইয়াসমিন", "জেসমিন"],
	jasmine: ["জেসমিন খাঁন", "ইয়াসমিন সুলতানা"],
	jashmin: ["জেসমিন খাঁন"],
	"jesmin khan": ["জেসমিন খাঁন"],
	"yasmin sultana": ["ইয়াসমিন সুলতানা"],

	// Selina Aktar (nurse_17 + nurse_26)
	selina: ["সেলিনা আক্তার", "সেলিনা আক্তার (2)", "সেলিনা"],
	salina: ["সেলিনা আক্তার", "সেলিনা আক্তার (2)"],
	"selina 2": ["সেলিনা আক্তার (2)"],
	"selina two": ["সেলিনা আক্তার (2)"],
	"selina aktar": ["সেলিনা আক্তার"],

	// Tahera Kohinur
	tahera: ["তাহেরা কোহিনুর", "তাহেরা"],
	"tahera kohinur": ["তাহেরা কোহিনুর"],

	// Khaleda Aktar
	khaleda: ["খালেদা আক্তার", "খালেদা"],
	"khaleda aktar": ["খালেদা আক্তার"],

	// Fatema Begam
	fatema: ["ফাতেমা বেগম", "ফাতেমা"],
	fatima: ["ফাতেমা বেগম"],
	"fatema begam": ["ফাতেমা বেগম"],

	// Sadia Afrin Poly
	sadia: ["সাদিয়া আফরিন পলি", "সাদিয়া"],
	"sadia afrin poly": ["সাদিয়া আফরিন পলি"],

	// Taslima Jannat
	taslima: ["তাসলিমা জান্নাত", "তাসলিমা"],
	"taslima jannat": ["তাসলিমা জান্নাত"],

	// Madhuri Rani Karmakar
	madhuri: ["মাধুরী রানী কর্মকার", "মাধুরী"],
	madhuree: ["মাধুরী রানী কর্মকার"],
	"madhuri karmakar": ["মাধুরী রানী কর্মকার"],

	// Mousumi Aktar
	mousumi: ["মোছাঃ মৌসুমী আক্তার", "মৌসুমী"],
	mausumi: ["মোছাঃ মৌসুমী আক্তার"],
	"mousumi aktar": ["মোছাঃ মৌসুমী আক্তার"],

	// Dilroba Aktar
	dilroba: ["দিলরোবা আক্তার", "দিলরোবা"],
	"dilroba aktar": ["দিলরোবা আক্তার"],

	// Tahmina Parvin
	tahmina: ["তহমিনা পারভীন", "তহমিনা"],
	"tahmina parvin": ["তহমিনা পারভীন"],

	// Rani Aktar Mau
	mou: ["রানী আক্তার মৌ", "মৌ"],
	mau: ["রানী আক্তার মৌ"],
	rani: ["রানী আক্তার মৌ", "রানী"],
	"rani aktar mau": ["রানী আক্তার মৌ"],

	// Anna Khatun
	ana: ["মোছাঃ আন্না খাতুন", "আন্না"],
	anna: ["মোছাঃ আন্না খাতুন", "আন্না"],
	"anna khatun": ["মোছাঃ আন্না খাতুন"],

	// Halima Aktar
	halima: ["হালিমা আক্তার", "হালিমা"],
	"halima aktar": ["হালিমা আক্তার"],

	// Rahima
	rahima: ["মোছাঃ রাহিমা", "রাহিমা"],

	// Momtaj Jahan
	momtaj: ["মমতাজ জাহান", "মমতাজ"],
	momtaz: ["মমতাজ জাহান"],
	"momtaj jahan": ["মমতাজ জাহান"],

	// Shraboni Griho
	shraboni: ["শ্রাবণী গৃহ", "শ্রাবণী"],
	sraboni: ["শ্রাবণী গৃহ"],
	"shraboni griho": ["শ্রাবণী গৃহ"],

	// Suborna
	suborna: ["সুবর্ণা"],
	subarna: ["সুবর্ণা"],
};
