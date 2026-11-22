import type { Gender } from "@/lib/types";

/**
 * Best-effort gender guess from a Pakistani first name, used only to pick a
 * default avatar. Every guess is marked as such and can be changed on the
 * review screen; unknown names stay null (neutral avatar).
 */
export const FEMALE_NAMES = new Set(
  `aasia abeera afia afifa afreen afshan aiman aimen aina aisha alina aleena aliha alishba alizah aliya amal amna anam anisa aqsa areeka areeqa asena ashbala asma asmavia ayesha ayeesha bakht balqees bibi bushra diya dua dure eisha elyeen faiza faryal fatima fatma fazila fiza gul gulalay gulalia habiba hadeesa hafiza hafsa haleema hamna haneefa hajira haseeba haseena haya hiba hifsa hijab hina hira hoor humaira huryal husna husan iffat ifra ifrah iman iqra javeria jawairiya jawairyah jawaria javeria kainat kalsoom kashaf kashmala khadija khawla khadija khudija khushboo komal laiba lubaba lubna madeeha madiha mahin mahnoor maham mah maheen mahrukh maira malaika maleeha manahil manail marjan maria mariam marwa marwah maryam mehak mehreen mehwish memoona minahil mishal momina mousara mubashira muazzma muneeba muneeza munazza muntaha muskan nabila naila najla nasira nayab nehal nida nimra nooria norren nuzhat omaima omama omme parishta qaswa rabia raheela ramsha rayian rida rihab ruqiya romaisa romansa ruqiya saba sabah sadaf sahina saira salma salwa sama saman sameera sana sania sapna sara sawaira sawera sehrish shabnam shahana shamal shanezuhra shehla shukariya sidra simra sitara sobia spogmay sumbal summaya summia summiya sumayya sunaina syeda tabassum tajala tania tasneem umaima umm umme unzurna urooba ushna uzra wajeeha warda wareesha warisha yanfa yashfa yamima yusra zainab zara zareesha zarqawi zubaida`.split(
    /\s+/,
  ),
);

export const MALE_NAMES = new Set(
  `aamir aazaz abbas abdul abdurahman abdullah abdulwahab abdur abid abu abubakar abubaker adil afaq afzaal ahmad ahmed aisad aizaz ali aman amir asheer amjad anees aqil aqif arif asad asim atif awais ayub bakhshish bashir bilal danish didar essa fahad faisal faiz faizan farhan farman faris farooq fazal fazl ghayour hamad hamid hammad hamz hamza haris haroon hasnain hassan hashim haider hidayat hubaib humam hussain ibrahim ihsan ihtisham ikram imran inam inamullah isa ishaq israr jahangir javid junaid kaleem kaleemullah kamal kamran kashif khalid khizar khizer luqman maaz mahmood majid malik mamoon maaz mazhar mohammad mohammed mohsin mubah mubashir mudassir muhammad muzamil nageeb mustafa murtaza naqeeb nauman nihad nisar nizam noman omer osama owais pir qasim rashid rehan raheel rizwan saad safi safiullah sahil saeed saeedullah sajid salman sanan sanaullah saqib sayam shah shahabuddin shahid shahzeb shayan shehram sikandar sohail sudais sufyan suleman syed tahir talha tariq tasbeeh ubaid umair umar umer usama uzair wahab wajahat wajid waleed wali waqar wasif yasir yaseen yousaf younas sajjad wafi zahoor faqeer zabihullah zahid zaib zain zayan zeeshan zia zubair`.split(
    /\s+/,
  ),
);

export function guessGender(fullName: string): Gender | null {
  const tokens = fullName.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const first = tokens[0];
  if (!first) return null;

  // "Noor ul Huda" (f) vs "Noor ul Islam" (m)
  if (first === "noor" || first === "nooh") {
    const rest = tokens.slice(1).join(" ");
    if (/\b(huda|ain|arsh|absar|saba|jehan)\b/.test(rest)) return "female";
    if (/\b(islam|ullah|muhammad|khan|ahmad|zaman)\b/.test(rest)) return "male";
    return null;
  }
  if (tokens.includes("bibi") || tokens.includes("begum") || tokens.includes("bano") || first === "syeda") return "female";
  if (FEMALE_NAMES.has(first)) return "female";
  if (MALE_NAMES.has(first)) return "male";
  if (/(ullah|uddin|ud din)$/.test(first)) return "male";
  return null;
}
