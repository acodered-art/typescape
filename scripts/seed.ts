import { PrismaClient, Prisma } from "@prisma/client";
import { TYPING_SYSTEMS } from "../src/lib/typing-systems";

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: "Anime & Manga",
    slug: "anime-manga",
    description: "Characters from Japanese animation and comics",
    children: [
      { name: "Naruto", slug: "naruto" },
      { name: "Demon Slayer", slug: "demon-slayer" },
      { name: "Attack on Titan", slug: "attack-on-titan" },
      { name: "One Piece", slug: "one-piece" },
      { name: "Dragon Ball", slug: "dragon-ball" },
      { name: "Death Note", slug: "death-note" },
      { name: "Fullmetal Alchemist", slug: "fullmetal-alchemist" },
      { name: "Hunter × Hunter", slug: "hunter-x-hunter" },
      { name: "Jujutsu Kaisen", slug: "jujutsu-kaisen" },
      { name: "Chainsaw Man", slug: "chainsaw-man" },
      { name: "Neon Genesis Evangelion", slug: "evangelion" },
      { name: "Cowboy Bebop", slug: "cowboy-bebop" },
      { name: "Steins;Gate", slug: "steins-gate" },
      { name: "JoJo's Bizarre Adventure", slug: "jojo" },
    ],
  },
  {
    name: "Movies & TV",
    slug: "movies-tv",
    description: "Characters from film and television",
    children: [
      { name: "Breaking Bad", slug: "breaking-bad" },
      { name: "Game of Thrones", slug: "game-of-thrones" },
      { name: "The Office", slug: "the-office" },
      { name: "Stranger Things", slug: "stranger-things" },
      { name: "Star Wars", slug: "star-wars" },
      { name: "Marvel Cinematic Universe", slug: "marvel" },
      { name: "DC Universe", slug: "dc" },
      { name: "The Lord of the Rings", slug: "lord-of-the-rings" },
      { name: "Harry Potter", slug: "harry-potter" },
    ],
  },
  {
    name: "Video Games",
    slug: "video-games",
    description: "Characters from video games",
    children: [
      { name: "Final Fantasy", slug: "final-fantasy" },
      { name: "The Legend of Zelda", slug: "zelda" },
      { name: "Elder Scrolls", slug: "elder-scrolls" },
      { name: "Mass Effect", slug: "mass-effect" },
      { name: "Persona", slug: "persona" },
      { name: "Dark Souls", slug: "dark-souls" },
      { name: "Cyberpunk 2077", slug: "cyberpunk-2077" },
    ],
  },
  {
    name: "Celebrities",
    slug: "celebrities",
    description: "Real-world public figures and celebrities",
    children: [
      { name: "Musicians", slug: "musicians" },
      { name: "Actors", slug: "actors" },
      { name: "Influencers", slug: "influencers" },
      { name: "Historical Figures", slug: "historical-figures" },
      { name: "Scientists", slug: "scientists" },
    ],
  },
  {
    name: "Books & Comics",
    slug: "books-comics",
    description: "Characters from literature, comics, and graphic novels",
    children: [
      { name: "Classic Literature", slug: "classic-literature" },
      { name: "Western Comics", slug: "western-comics" },
      { name: "Light Novels", slug: "light-novels" },
    ],
  },
];

const SEED_PROFILES = [
  {
    name: "Naruto Uzumaki",
    slug: "naruto-uzumaki",
    description: "The hyperactive ninja who dreams of becoming Hokage",
    categorySlug: "naruto",
    bio: "Naruto Uzumaki is the main protagonist of the Naruto series. A loud, energetic orphan who was shunned by his village for housing the Nine-Tailed Fox demon, he eventually earns their respect through sheer determination and becomes the Seventh Hokage.",
    typings: [
      { systemSlug: "mbti", typeValue: "ENFP", details: { functionStack: "Ne-Fi-Te-Si" } },
      { systemSlug: "enneagram", typeValue: "7", details: { wing: "w8" } },
    ],
  },
  {
    name: "Sasuke Uchiha",
    slug: "sasuke-uchiha",
    description: "The last surviving member of the Uchiha clan, driven by vengeance",
    categorySlug: "naruto",
    bio: "Sasuke Uchiha is the deuteragonist of the Naruto series. The last survivor of the elite Uchiha clan, he dedicates his life to avenging his clan by killing his brother Itachi. His path is defined by revenge, redemption, and ultimately, reconciliation.",
    typings: [
      { systemSlug: "mbti", typeValue: "INTJ", details: { functionStack: "Ni-Te-Fi-Se" } },
      { systemSlug: "enneagram", typeValue: "5", details: { wing: "w4" } },
    ],
  },
  {
    name: "Light Yagami",
    slug: "light-yagami",
    description: "A brilliant student who becomes the god of a new world",
    categorySlug: "death-note",
    bio: "Light Yagami is the main protagonist of Death Note. A genius high school student who discovers a Death Note that kills anyone whose name is written in it. Under the alias 'Kira', he sets out to create a utopia free of crime, becoming increasingly tyrannical and god-complexed.",
    typings: [
      { systemSlug: "mbti", typeValue: "ENTJ", details: { functionStack: "Te-Ni-Se-Fi" } },
      { systemSlug: "enneagram", typeValue: "3", details: { wing: "w4" } },
    ],
  },
  {
    name: "L Lawliet",
    slug: "l-lawliet",
    description: "The world's greatest detective, eccentric and brilliant",
    categorySlug: "death-note",
    bio: "L is the deuteragonist of Death Note. An eccentric, barefoot genius who sits in a characteristic crouch, L is the world's greatest detective. He takes on the Kira case using deduction, misdirection, and unorthodox methods.",
    typings: [
      { systemSlug: "mbti", typeValue: "INTP", details: { functionStack: "Ti-Ne-Si-Fe" } },
      { systemSlug: "enneagram", typeValue: "5", details: { wing: "w4" } },
    ],
  },
  {
    name: "Shinji Ikari",
    slug: "shinji-ikari",
    description: "A reluctant Eva pilot struggling with self-worth and connection",
    categorySlug: "evangelion",
    bio: "Shinji Ikari is the main protagonist of Neon Genesis Evangelion. A deeply insecure and withdrawn teenager who is forced to pilot the Eva Unit-01 against Angels. His psychological journey explores depression, fear of intimacy, and the Hedgehog's Dilemma.",
    typings: [
      { systemSlug: "mbti", typeValue: "INFP", details: { functionStack: "Fi-Ne-Si-Te" } },
      { systemSlug: "enneagram", typeValue: "9", details: { wing: "w1" } },
    ],
  },
  {
    name: "Spike Spiegel",
    slug: "spike-spiegel",
    description: "A bounty hunter with a past he can't escape",
    categorySlug: "cowboy-bebop",
    bio: "Spike Spiegel is the main protagonist of Cowboy Bebop. A former member of the Red Dragon Syndicate turned bounty hunter. Laid-back, skilled in martial arts, and haunted by his past with Julia and Vicious.",
    typings: [
      { systemSlug: "mbti", typeValue: "ISTP", details: { functionStack: "Ti-Se-Ni-Fe" } },
      { systemSlug: "enneagram", typeValue: "8", details: { wing: "w7" } },
    ],
  },
  {
    name: "Walter White",
    slug: "walter-white",
    description: "A chemistry teacher turned meth kingpin",
    categorySlug: "breaking-bad",
    bio: "Walter White is the main protagonist of Breaking Bad. A brilliant but overqualified high school chemistry teacher who, after being diagnosed with terminal lung cancer, turns to cooking methamphetamine to secure his family's future. His transformation into 'Heisenberg' is a study in pride, power, and moral decay.",
    typings: [
      { systemSlug: "mbti", typeValue: "INTJ", details: { functionStack: "Ni-Te-Fi-Se" } },
      { systemSlug: "enneagram", typeValue: "5", details: { wing: "w6" } },
    ],
  },
  {
    name: "Tony Stark",
    slug: "tony-stark",
    description: "Genius billionaire inventor and armored superhero",
    categorySlug: "marvel",
    bio: "Tony Stark is Iron Man — a brilliant engineer, billionaire industrialist, and genius inventor. After being kidnapped by terrorists, he builds the Iron Man suit and becomes a superhero. Known for his charisma, arrogance, and ultimately his sacrifice for the greater good.",
    typings: [
      { systemSlug: "mbti", typeValue: "ENTP", details: { functionStack: "Ne-Ti-Fe-Si" } },
      { systemSlug: "enneagram", typeValue: "7", details: { wing: "w8" } },
    ],
  },
  {
    name: "Goku",
    slug: "goku",
    description: "The Saiyan warrior who never stops pushing his limits",
    categorySlug: "dragon-ball",
    bio: "Goku is the main protagonist of Dragon Ball. A Saiyan sent to Earth as a baby who grows up to become its greatest defender. Pure-hearted, endlessly optimistic, and driven by an insatiable desire to become stronger and fight worthy opponents.",
    typings: [
      { systemSlug: "mbti", typeValue: "ENFP", details: { functionStack: "Ne-Fi-Te-Si" } },
      { systemSlug: "enneagram", typeValue: "7", details: { wing: "w8" } },
    ],
  },
  {
    name: "Harry Potter",
    slug: "harry-potter",
    description: "The Boy Who Lived, destined to defeat Voldemort",
    categorySlug: "harry-potter",
    bio: "Harry Potter is the main protagonist of J.K. Rowling's series. An orphan who discovers he is a wizard and enrols at Hogwarts School of Witchcraft and Wizardry. Known for his courage, loyalty, and his scar — the mark of his connection to Lord Voldemort.",
    typings: [
      { systemSlug: "mbti", typeValue: "ISFP", details: { functionStack: "Fi-Se-Ni-Te" } },
      { systemSlug: "enneagram", typeValue: "9", details: { wing: "w1" } },
    ],
  },
  {
    name: "Hermione Granger",
    slug: "hermione-granger",
    description: "The brightest witch of her age, muggle-born scholar and activist",
    categorySlug: "harry-potter",
    bio: "Hermione Granger is one of the three main protagonists of the Harry Potter series. A brilliant, studious witch born to Muggle parents, whose intellect and determination often save the day. Becomes Minister for Magic after the war.",
    typings: [
      { systemSlug: "mbti", typeValue: "ESTJ", details: { functionStack: "Te-Si-Ne-Fi" } },
      { systemSlug: "enneagram", typeValue: "1", details: { wing: "w2" } },
    ],
  },
  {
    name: "Frodo Baggins",
    slug: "frodo-baggins",
    description: "The humble hobbit who bore the One Ring to Mordor",
    categorySlug: "lord-of-the-rings",
    bio: "Frodo Baggins is the main protagonist of The Lord of the Rings. A quiet, kind-hearted hobbit from the Shire who inherits the One Ring and must journey across Middle-earth to destroy it in the fires of Mount Doom.",
    typings: [
      { systemSlug: "mbti", typeValue: "INFP", details: { functionStack: "Fi-Ne-Si-Te" } },
      { systemSlug: "enneagram", typeValue: "9", details: { wing: "w1" } },
    ],
  },
  {
    name: "Daenerys Targaryen",
    slug: "daenerys-targaryen",
    description: "The Mother of Dragons, breaker of chains, rightful heir to the Iron Throne",
    categorySlug: "game-of-thrones",
    bio: "Daenerys Targaryen is one of the main protagonists of Game of Thrones. The last surviving member of the Targaryen dynasty, exiled to Essos. She rises from being sold into marriage to becoming the Mother of Dragons, liberating cities and amassing power to reclaim the Iron Throne.",
    typings: [
      { systemSlug: "mbti", typeValue: "ENFJ", details: { functionStack: "Fe-Ni-Se-Ti" } },
      { systemSlug: "enneagram", typeValue: "8", details: { wing: "w7" } },
    ],
  },
  {
    name: "Eren Yeager",
    slug: "eren-yeager",
    description: "A boy who swore to destroy every last Titan",
    categorySlug: "attack-on-titan",
    bio: "Eren Yeager is the main protagonist of Attack on Titan. Driven by rage after witnessing his mother's death at the hands of Titans, he joins the Survey Corps. His journey from vengeance to radical freedom reveals the terrible cost of breaking the cage.",
    typings: [
      { systemSlug: "mbti", typeValue: "ISTP", details: { functionStack: "Ti-Se-Ni-Fe" } },
      { systemSlug: "enneagram", typeValue: "8", details: { wing: "w7" } },
    ],
  },
  {
    name: "Rick Sanchez",
    slug: "rick-sanchez",
    description: null,
    categorySlug: "movies-tv",
    bio: "Rick Sanchez is the main protagonist of Rick and Morty. A brilliant but alcoholic scientist who drags his timid grandson Morty on interdimensional adventures. His intelligence is matched only by his emptiness and inability to connect meaningfully.",
    typings: [
      { systemSlug: "mbti", typeValue: "INTP", details: { functionStack: "Ti-Ne-Si-Fe" } },
      { systemSlug: "enneagram", typeValue: "5", details: { wing: "w4" } },
    ],
  },
  {
    name: "Cloud Strife",
    slug: "cloud-strife",
    description: "A former SOLDIER mercenary with a fragmented past",
    categorySlug: "final-fantasy",
    bio: "Cloud Strife is the main protagonist of Final Fantasy VII. A stoic and aloof mercenary who claims to be a former member of SOLDIER. Beneath his cool exterior lies a broken past of false memories, suppressed trauma, and a journey toward accepting his true self.",
    typings: [
      { systemSlug: "mbti", typeValue: "ISTP", details: { functionStack: "Ti-Se-Ni-Fe" } },
      { systemSlug: "enneagram", typeValue: "9", details: { wing: "w8" } },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding TypeScape...");

  // Clear existing
  await prisma.vote.deleteMany();
  await prisma.profileTyping.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.moderationItem.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.category.deleteMany();
  await prisma.typingSystem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Seed typing systems
  for (const system of TYPING_SYSTEMS) {
    await prisma.typingSystem.create({
      data: {
        name: system.name,
        slug: system.slug,
        description: system.description,
        config: system as Prisma.InputJsonValue,
        sortOrder: TYPING_SYSTEMS.findIndex((s) => s.slug === system.slug),
      },
    });
  }
  console.log(`✓ ${TYPING_SYSTEMS.length} typing systems`);

  // Seed categories
  const categoryMap = new Map<string, string>();
  for (const parent of CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        name: parent.name,
        slug: parent.slug,
        description: parent.description || null,
      },
    });
    categoryMap.set(parent.slug, created.id);
    for (const child of parent.children) {
      const childCreated = await prisma.category.create({
        data: {
          name: child.name,
          slug: `${parent.slug}/${child.slug}`,
          parentId: created.id,
        },
      });
      categoryMap.set(child.slug, childCreated.id);
    }
  }
  console.log(`✓ ${categoryMap.size} categories`);

  // Get system IDs
  const systems = await prisma.typingSystem.findMany();
  const systemMap = new Map(systems.map((s) => [s.slug, s.id]));

  // Seed profiles with typings
  for (const pdata of SEED_PROFILES) {
    const categoryId = categoryMap.get(pdata.categorySlug);
    const profile = await prisma.profile.create({
      data: {
        name: pdata.name,
        slug: pdata.slug,
        description: pdata.description || null,
        categoryId: categoryId || null,
        bio: pdata.bio || null,
        viewCount: Math.floor(Math.random() * 1000),
      },
    });

    for (const t of pdata.typings) {
      const systemId = systemMap.get(t.systemSlug);
      if (systemId) {
        await prisma.profileTyping.create({
          data: {
            profileId: profile.id,
            typingSystemId: systemId,
            typeValue: t.typeValue,
            details: t.details || undefined,
            isCommunity: true,
          },
        });
      }
    }
  }
  console.log(`✓ ${SEED_PROFILES.length} profiles with typings`);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());