/**
 * The Trait Almanac catalogue. Every visible thing a chicken can be is a
 * trait tag; hatching (or acquiring) a chicken with that tag discovers it.
 */
export type TraitCategory = 'colour' | 'pattern' | 'feathers' | 'head' | 'body' | 'legs' | 'egg' | 'personality' | 'utility' | 'combo';
export type TraitRarity = 'common' | 'uncommon' | 'rare' | 'exotic' | 'legendary';

export interface TraitDef {
  id: string;
  name: string;
  emoji: string;
  category: TraitCategory;
  rarity: TraitRarity;
  /** Field-guide flavour text. */
  description: string;
  /** Hint for the almanac about how it tends to be inherited. */
  hint: string;
  /** Show this trait on the compact chicken card. Default true for anything above common. */
  notable?: boolean;
}

const T = (
  id: string,
  name: string,
  emoji: string,
  category: TraitCategory,
  rarity: TraitRarity,
  description: string,
  hint: string,
  notable?: boolean,
): TraitDef => ({ id, name, emoji, category, rarity, description, hint, notable });

export const TRAITS: TraitDef[] = [
  // ---- colour --------------------------------------------------------------
  T('col.black', 'Black Feathers', '⚫', 'colour', 'common', 'Solid, serious, and secretly a little iridescent in the right light.', 'Dominant. One black parent is usually enough.'),
  T('col.white', 'White Feathers', '⚪', 'colour', 'common', 'Pristine. Hides whatever colours the genes are quietly carrying underneath.', 'Two different routes: a dominant white that shows with one copy, and a recessive white that needs two. White × white can surprise you.'),
  T('col.gold', 'Gold Feathers', '🟠', 'colour', 'common', 'Warm, farmyard gold. The wild-type look of a barnyard bird.', 'Gold is recessive to silver.'),
  T('col.red', 'Mahogany Red', '🟥', 'colour', 'common', 'Deep, glossy red-brown. Looks expensive.', 'A dominant deepening of gold.'),
  T('col.buff', 'Buff Feathers', '🟡', 'colour', 'common', 'Soft, even buff, like a very handsome biscuit.', 'A dominant dilution of gold.'),
  T('col.cream', 'Cream Feathers', '🍦', 'colour', 'uncommon', 'Pale cream, the colour of a good custard.', 'Silver on a wheaten base, or a lavender chicken that would otherwise be silver.'),
  T('col.silver', 'Silver Feathers', '🩶', 'colour', 'common', 'Cool silver-white with darker trim.', 'Silver is dominant over gold.'),
  T('col.partridge', 'Partridge', '🟤', 'colour', 'common', 'Warm brown with darker stippling, built for hiding in hedgerows.', 'The partridge base colour is recessive to black.'),
  T('col.wheaten', 'Wheaten', '🌾', 'colour', 'common', 'Pale wheat-coloured body with a darker tail.', 'The wheaten base colour is recessive to black but dominant over partridge.'),
  T('col.blue', 'Blue Feathers', '🔵', 'colour', 'uncommon', 'Slate blue-grey, each feather softly outlined. Never breeds true, and that is the fun of it.', 'One copy of blue dilution turns black into blue. Blue × blue gives black, blue and splash chicks.'),
  T('col.splash', 'Splash', '💦', 'colour', 'rare', 'Pale white-grey splattered with blue-grey flecks, like a painter\'s drop cloth.', 'Two copies of blue dilution. Splash × black gives all blue chicks.'),
  T('col.lavender', 'Lavender', '💜', 'colour', 'rare', 'A soft, even, dusty lilac-grey. Impossibly pretty.', 'Recessive. Both parents must carry it, and carriers look completely normal.'),
  T('col.chocolate', 'Chocolate Feathers', '🍫', 'colour', 'exotic', 'Rich, dark cocoa brown where black would be.', 'Recessive and vanishingly rare. It shows up as a mutation, and then has to be bred back to itself.'),
  T('col.straw', 'Straw', '🌾', 'colour', 'uncommon', 'Pale straw-yellow, what gold becomes when lavender gets hold of it.', 'Lavender acting on gold feathers.'),
  T('col.dun', 'Dun', '🪨', 'colour', 'uncommon', 'Muted blue-brown, like a partridge who walked through fog.', 'Blue dilution on a partridge base.'),
  T('col.sheen', 'Beetle Sheen', '🪲', 'colour', 'uncommon', 'Black feathers that flash emerald green in sunlight.', 'Dominant, but only visible on black feathers.'),
  T('col.leaky', 'Leaky White', '🫗', 'colour', 'rare', 'White, mostly. A few stray black flecks leaked through.', 'A single copy of dominant white sometimes lets a little colour through.'),
  // ---- pattern -------------------------------------------------------------
  T('pat.barred', 'Barred', '🦓', 'pattern', 'common', 'Crisp alternating dark and light bars across every feather.', 'Dominant. One barred parent gives about half barred chicks.'),
  T('pat.columbian', 'Columbian', '🧣', 'pattern', 'common', 'Pale body with a dark neck-lace and tail. Very formal.', 'Dominant pattern; pushes colour to the neck and tail.'),
  T('pat.laced', 'Laced', '🪡', 'pattern', 'uncommon', 'Every feather neatly edged in a darker colour, like scalloped armour.', 'Dominant over pencilled, spangled and plain feathers.'),
  T('pat.pencilled', 'Pencilled', '✏️', 'pattern', 'uncommon', 'Fine concentric lines drawn on each feather by a very patient artist.', 'Dominant over spangled and plain, recessive to laced.'),
  T('pat.spangled', 'Spangled', '✨', 'pattern', 'uncommon', 'A dark spangle at the tip of every feather. Polka dots, but classy.', 'Dominant over plain, recessive to the other patterns.'),
  T('pat.mottled', 'Mottled', '🔘', 'pattern', 'uncommon', 'White tips scattered over dark feathers, and more of them every year.', 'Recessive. Both parents must carry it.'),
  T('pat.crele', 'Crele', '🌗', 'combo', 'rare', 'Barring laid over a gold duckwing base: stripes in two colours at once.', 'Barred plus a gold duckwing base colour.'),
  T('pat.cuckoo', 'Cuckoo', '🪶', 'combo', 'uncommon', 'Soft, blurry barring on black. The rustic cousin of crisp barring.', 'Barred plus a black base.'),
  T('pat.blueLaced', 'Blue Laced', '💙', 'combo', 'rare', 'Lacing drawn in blue-grey instead of black. Breathtaking.', 'Laced pattern plus one copy of blue dilution.'),
  T('pat.milleFleur', 'Mille Fleur', '🌸', 'combo', 'rare', '“A thousand flowers”: buff feathers with black spangles tipped in white.', 'Mottled plus columbian plus a buff base. A three-way combination.'),
  T('pat.porcelain', 'Porcelain', '🫖', 'combo', 'exotic', 'Mille fleur in pastel: straw and lavender tipped in white. Looks painted on china.', 'Mille fleur plus lavender. Four genes agreeing at once.'),
  T('pat.barredColumbian', 'Barred Collar', '🧣', 'combo', 'uncommon', 'A white body with barred neck-lace and tail.', 'Barring plus columbian.'),
  // ---- feathers ------------------------------------------------------------
  T('fea.silkie', 'Silkie Feathers', '☁️', 'feathers', 'rare', 'Feathers with no hooks, so the whole bird is fur. Cannot fly. Does not care.', 'Recessive. Two normal-looking carriers can hatch a silkie.'),
  T('fea.frizzle', 'Frizzle', '🌀', 'feathers', 'uncommon', 'Every feather curls outward, like the chicken has been mildly electrocuted.', 'One copy shows. Frizzle × frizzle can make a frazzle.'),
  T('fea.frazzle', 'Frazzle', '⚡', 'feathers', 'rare', 'Two doses of frizzle. Sparse, brittle, wildly curled. A commitment.', 'Two copies of frizzle.'),
  T('fea.sizzle', 'Sizzle', '🔥', 'feathers', 'exotic', 'Silkie fluff AND frizzle curl. A cloud that has been through a storm.', 'Silkie feathering plus frizzle.'),
  T('fea.sleek', 'Sleek', '🏹', 'feathers', 'common', 'Tight, hard feathering. Aerodynamic, allegedly.', 'No fluff genes at all.'),
  T('fea.fluffy', 'Fluffy', '🧸', 'feathers', 'common', 'Abundant soft feathering. Looks bigger than it is.', 'Three fluff genes out of four.'),
  T('fea.cloud', 'Cloud Body', '☁️', 'feathers', 'uncommon', 'So much fluff the legs are a rumour.', 'All four fluff genes. Breed two fluffy birds.'),
  T('fea.nakedNeck', 'Naked Neck', '🦃', 'feathers', 'rare', 'No feathers on the neck at all. Turkey-adjacent. Unbothered.', 'Two copies of the naked neck gene.'),
  T('fea.bowtie', 'Bow Tie', '🎀', 'feathers', 'uncommon', 'A bare neck with a single tuft of feathers at the front, like formalwear.', 'One copy of the naked neck gene.'),
  // ---- head ----------------------------------------------------------------
  T('head.crest', 'Crest', '👒', 'head', 'uncommon', 'A tidy topknot of feathers.', 'Dominant. One crested parent gives crested chicks.'),
  T('head.bigCrest', 'Big Crest', '🎩', 'head', 'rare', 'A crest so full it gets in the way of seeing.', 'Two crest genes plus a crest-size gene.'),
  T('head.giantCrest', 'Giant Crest', '👑', 'head', 'exotic', 'A crest the size of the head it sits on. Vision is optional.', 'Two crest genes and two crest-size genes.'),
  T('head.beard', 'Beard & Muffs', '🧔', 'head', 'uncommon', 'Fluffy cheeks and a beard. Looks wise.', 'Dominant.'),
  T('head.single', 'Single Comb', '🔺', 'head', 'common', 'The classic upright, toothed comb.', 'Shows when there is no pea, rose or duplex gene.'),
  T('head.rose', 'Rose Comb', '🌹', 'head', 'common', 'A low, bumpy comb ending in a spike.', 'Dominant over single.'),
  T('head.pea', 'Pea Comb', '🫛', 'head', 'common', 'Three small ridges, close to the head. Frost-proof.', 'Dominant over single.'),
  T('head.walnut', 'Walnut Comb', '🌰', 'head', 'uncommon', 'A lumpy, walnut-shaped comb.', 'Pea gene plus rose gene together.'),
  T('head.vshaped', 'V-Comb', '😈', 'head', 'rare', 'Two little horns instead of a comb.', 'Duplex gene on an otherwise single comb.'),
  T('head.buttercup', 'Buttercup Comb', '🏆', 'head', 'rare', 'A cup-shaped crown of a comb.', 'Duplex gene plus rose gene.'),
  T('head.strawberry', 'Strawberry Comb', '🍓', 'head', 'rare', 'A small, knobbly comb set well forward.', 'Duplex gene plus pea gene.'),
  T('head.earTufts', 'Ear Tufts', '🧝', 'head', 'rare', 'Feathers sprouting sideways from the ears. Elfin.', 'Dominant, and rare outside a few breeds.'),
  // ---- body ----------------------------------------------------------------
  T('body.bantam', 'Bantam', '🐥', 'body', 'uncommon', 'Pocket-sized. Everything about it is small except the attitude.', 'No large-size genes at all.'),
  T('body.small', 'Small', '🐣', 'body', 'common', 'A compact bird.', 'One or two large-size genes.'),
  T('body.medium', 'Medium', '🐔', 'body', 'common', 'A standard, sensible chicken size.', 'Three large-size genes.'),
  T('body.large', 'Large', '🐓', 'body', 'common', 'A substantial bird.', 'Four large-size genes.'),
  T('body.giant', 'Giant', '🦕', 'body', 'uncommon', 'Very large. Looms.', 'Five large-size genes.'),
  T('body.colossal', 'Absolute Unit', '🏔️', 'body', 'exotic', 'The largest a chicken can be. Blocks doorways.', 'All six large-size genes. Breed two giants.'),
  T('body.upright', 'Upright', '🧍', 'body', 'uncommon', 'Tall, vertical, gamefowl posture. Always looks like it is about to say something.', 'Blended: two upright posture genes, or one plus standard.'),
  T('body.round', 'Round', '⚪', 'body', 'common', 'A soft, rounded outline.', 'Blended: two round posture genes, or one plus standard.'),
  T('body.flowingTail', 'Flowing Tail', '🎐', 'body', 'rare', 'Long, sweeping tail feathers that trail behind.', 'Recessive. Both parents must carry the long-tail gene.'),
  T('body.endlessTail', 'Endless Tail', '🐉', 'body', 'legendary', 'A tail that never stops growing. Needs its own room.', 'Long tail plus a recessive never-moult gene. Extraordinarily rare.'),
  T('body.squirrel', 'Squirrel Tail', '🐿️', 'body', 'uncommon', 'Tail held straight up, almost touching the head.', 'Dominant.'),
  T('body.cushion', 'Cushion Tail', '🛋️', 'body', 'uncommon', 'Tail lost somewhere in a mound of fluff.', 'A round body plus fluffy feathering.'),
  T('body.rumpless', 'Rumpless', '🚫', 'body', 'rare', 'No tail. No tailbone, even. Just stops.', 'Dominant.'),
  // ---- legs ----------------------------------------------------------------
  T('leg.feathered', 'Feathered Feet', '🪶', 'legs', 'uncommon', 'Feathers down the shanks and toes. Slippers.', 'Additive: more leg-feather genes means heavier feathering.'),
  T('leg.boots', 'Full Boots', '👢', 'legs', 'rare', 'Heavy feathering right down to the toes. Proper boots.', 'Three or four leg-feather genes.'),
  T('leg.vulture', 'Vulture Hocks', '🦅', 'legs', 'rare', 'Stiff feathers jutting backward from the hocks.', 'Recessive, and only visible on feathered legs.'),
  T('leg.fiveToes', 'Five Toes', '🖐️', 'legs', 'uncommon', 'An extra toe on each foot. Nobody knows why. It helps with nothing.', 'Dominant.'),
  T('leg.yellow', 'Yellow Legs', '🟡', 'legs', 'common', 'Bright yellow shanks.', 'Yellow skin is recessive to white skin.'),
  T('leg.white', 'Pink Legs', '🩷', 'legs', 'common', 'Pale pinkish-white shanks.', 'White skin, no dark pigment.'),
  T('leg.slate', 'Slate Legs', '🩶', 'legs', 'common', 'Blue-grey shanks.', 'White skin plus dark leg pigment (recessive).'),
  T('leg.willow', 'Willow Legs', '🟢', 'legs', 'uncommon', 'Greenish shanks. Yellow and dark pigment layered.', 'Yellow skin plus dark leg pigment.'),
  T('leg.black', 'Black Skin', '🖤', 'legs', 'rare', 'Black skin, black legs, black comb. Black everything.', 'Dominant. One copy is enough.'),
  T('combo.void', 'The Void', '🕳️', 'combo', 'legendary', 'Black feathers, black skin, black legs, black comb. A chicken-shaped absence.', 'Black skin plus black feathers with beetle sheen plus dark legs.'),
  T('combo.curlyBoots', 'Curly Boots', '🥾', 'combo', 'rare', 'Frizzled feathers all the way down to the toes.', 'Frizzle plus feathered feet.'),
  T('combo.fullRegalia', 'Full Regalia', '🎭', 'combo', 'rare', 'Crest, beard AND muffs. Nothing of the face remains.', 'Crest plus beard.'),
  T('combo.dandy', 'Dandy', '🎩', 'combo', 'exotic', 'Crest, beard, feathered feet, five toes. Every accessory at once.', 'Crest, beard, feathered feet and five toes together.'),
  T('combo.pocket', 'Pocket Rocket', '🚀', 'combo', 'rare', 'A bantam with upright posture and a squirrel tail. Tiny and furious.', 'Bantam size plus upright posture plus squirrel tail.'),
  // ---- eggs ----------------------------------------------------------------
  T('egg.white', 'White Eggs', '🥚', 'egg', 'common', 'Clean white shells.', 'No brown genes and no blue gene.'),
  T('egg.cream', 'Cream Eggs', '🥚', 'egg', 'common', 'Faintly warm off-white.', 'One brown gene.'),
  T('egg.tinted', 'Tinted Eggs', '🥚', 'egg', 'common', 'Pale beige.', 'Two brown genes.'),
  T('egg.brown', 'Brown Eggs', '🟤', 'egg', 'common', 'Proper brown eggs.', 'Three or four brown genes.'),
  T('egg.darkBrown', 'Dark Brown Eggs', '🟫', 'egg', 'uncommon', 'Deep terracotta-brown shells.', 'Five brown genes.'),
  T('egg.chocolate', 'Chocolate Eggs', '🍫', 'egg', 'rare', 'Shells so dark they look painted.', 'All six brown genes.'),
  T('egg.blue', 'Blue Eggs', '🩵', 'egg', 'uncommon', 'Sky-blue shells, blue all the way through.', 'Dominant blue-egg gene with little or no brown.'),
  T('egg.green', 'Green Eggs', '🟢', 'egg', 'rare', 'Sage-green shells.', 'Blue-egg gene plus a couple of brown genes.'),
  T('egg.olive', 'Olive Eggs', '🫒', 'egg', 'exotic', 'Deep olive-green shells. The dream.', 'Blue-egg gene plus lots of brown genes. Try a blue-egg layer with a dark-brown-egg layer.'),
  T('egg.plum', 'Plum Eggs', '🍇', 'egg', 'legendary', 'A purplish-pink bloom over the shell.', 'A recessive bloom gene, two copies, on a brown-ish egg. Extremely rare.'),
  T('egg.speckled', 'Speckled Eggs', '🫘', 'egg', 'uncommon', 'Shells freckled with darker spots.', 'Recessive. Both parents must carry it.'),
  T('egg.tiny', 'Tiny Eggs', '🫧', 'egg', 'uncommon', 'Quail-sized. Adorable. Impractical.', 'Small birds lay small eggs.'),
  T('egg.jumbo', 'Jumbo Eggs', '🏈', 'egg', 'rare', 'Absurdly large eggs.', 'Big birds plus two large-egg genes.'),
  T('egg.prolific', 'Prolific Layer', '🧺', 'egg', 'uncommon', 'An egg nearly every day.', 'Blended from both parents\' laying genes.'),
  T('egg.occasional', 'Occasional Layer', '🗓️', 'egg', 'common', 'Lays when the mood strikes.', 'Blended from both parents\' laying genes.'),
  // ---- personality ---------------------------------------------------------
  T('per.calm', 'Calm', '🧘', 'personality', 'common', 'Unflappable.', 'Personality genes blend, with occasional surprises.'),
  T('per.curious', 'Curious', '🔍', 'personality', 'common', 'Investigates everything, including things that are not for chickens.', 'Personality genes blend, with occasional surprises.'),
  T('per.energetic', 'Energetic', '⚡', 'personality', 'common', 'Never stops. Not once.', 'Personality genes blend, with occasional surprises.'),
  T('per.friendly', 'Friendly', '🤝', 'personality', 'common', 'Will sit on you.', 'Personality genes blend, with occasional surprises.'),
  T('per.social', 'Social', '👯', 'personality', 'common', 'Prefers a crowd.', 'Personality genes blend, with occasional surprises.'),
  T('per.aloof', 'Aloof', '🕶️', 'personality', 'common', 'Has better things to do.', 'Personality genes blend, with occasional surprises.'),
  T('per.stubborn', 'Stubborn', '🪨', 'personality', 'common', 'Will not be moved. Literally.', 'Personality genes blend, with occasional surprises.'),
  T('per.dramatic', 'Dramatic', '🎭', 'personality', 'uncommon', 'Every event is a crisis, every crisis is an opera.', 'Flair shows up unpredictably.'),
  T('per.judgmental', 'Judgmental', '🧐', 'personality', 'uncommon', 'Watches you. Disapproves.', 'Flair shows up unpredictably.'),
  T('per.dignified', 'Dignified', '🎖️', 'personality', 'uncommon', 'Carries itself like minor royalty.', 'Flair shows up unpredictably.'),
  // ---- utility -------------------------------------------------------------
  T('util.coldHardy', 'Winter Coat', '❄️', 'utility', 'uncommon', 'Small comb, good feathering, sturdy body: laughs at frost.', 'A pea, rose or walnut comb plus decent fluff and size.'),
  T('util.heatTolerant', 'Sun Lover', '☀️', 'utility', 'uncommon', 'Bare neck or sleek feathers: shrugs off heat.', 'Naked neck, or sleek feathers with a single comb.'),
  T('util.fastGrower', 'Fast Grower', '📈', 'utility', 'common', 'Reaches full size in no time.', 'Two fast-growth genes.'),
  T('util.slowGrower', 'Slow Grower', '🐢', 'utility', 'common', 'Takes its time. Worth the wait.', 'Two slow-growth genes.'),
];

export const TRAIT_BY_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export const RARITY_ORDER: TraitRarity[] = ['common', 'uncommon', 'rare', 'exotic', 'legendary'];

export const RARITY_WEIGHT: Record<TraitRarity, number> = { common: 0, uncommon: 1, rare: 3, exotic: 6, legendary: 12 };

export function traitDef(id: string): TraitDef {
  const t = TRAIT_BY_ID[id];
  if (!t) throw new Error(`Unknown trait ${id}`);
  return t;
}
