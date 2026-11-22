import dictionary from '../data/dictionary.json';

export const LENGTHS = [4, 5, 6, 7, 8] as const;
export type WordLength = (typeof LENGTHS)[number];
const validWords = new Set(dictionary);

// Familiar answers; the larger dictionary is used only to validate guesses.
export const answers: Record<WordLength, string[]> = {
  4: 'arch bake beam bear bell bird blue boat book bowl calm camp card cave clay coat cold come cook crab dawn deer desk door draw drum duck dusk earn easy echo face farm fern fire fish flag flow foam frog game gate gift glow gold grow hair hand haze hill home hope jump keep kind kite lake lamp leaf lime lion love luck moon moss nest nice note palm park path pear pine pink play plum pond rain read reef rice ring rise road rock roof rose safe sail salt sand seed ship shoe shop sing snow soap soft soil song star stay stem step stop tale tall team tent tide time tiny tone town tree true tune turn twin vase vine warm wave well west wild wind wing wish wolf wood work yard zero'.split(' '),
  5: 'apple beach berry bloom bread brick brush cabin candy chair charm chase chess cloud coral crane cream dance dream drink earth empty fairy field flame float flour focus fresh fruit ghost glass globe grape grass green happy heart honey horse house jelly juice knife lemon light lucky magic maple melon metal money music night ocean olive paint paper peach pearl piano piece plant plate point power pride queen quiet radio river robin round royal salad scale scene shade shape share sharp sheep shell shine shirt shore skate skill sleep smile smoke snake solar sound space spark spice spoon sport stage stair stand steam steel stone storm story sugar sunny sweet table teach thank thing tiger toast today touch tower train treat trees tulip under unity value video visit voice water whale wheat wheel white whole woman world write young zebra'.split(' '),
  6: 'animal autumn banana basket beauty better bottle branch breeze bridge bright bubble butter camera candle carrot castle cherry circle coffee cookie cotton cousin desert dinner doctor dragon drawer flower forest frozen garden gentle golden guitar hammer harbor helmet honest island jungle kitten ladder laptop latter letter little lively marble market meadow memory mirror monkey mother napkin nature orange palace pencil people pepper planet pocket potato purple rabbit random ribbon rocket school screen search season secret shadow silver simple smooth soccer spring square stable stream street strong summer sunset supply temple tender tennis thread ticket timber tomato travel turtle valley velvet violet vision walnut window winner winter wonder yellow'.split(' '),
  7: 'airport balance balloon bedroom blanket blossom brother cabbage captain careful central chapter chicken chimney clothes coconut compass concert country crystal curious curtain dolphin drawing evening feather feeling fiction fitness freedom giraffe glacier glitter grammar habitat harvest healthy holiday journey kitchen lantern library machine mailbox measure morning mystery natural orchard outside pancake partner patient pattern penguin perfect picture plastic popcorn present pretend promise pumpkin rainbow reading respect sailing science seaside shelter silence sparkle special spinach stadium station strange student sunrise teacher theater thought thunder tonight tractor trouble village visitor weather welcome whisper whistle wildest'.split(' '),
  8: 'absolute airplane alphabet backpack bathroom birthday bluebird bracelet broccoli building calendar campfire cheerful children cinnamon colorful computer crackers creative cupboard daughter daylight discover distance elephant everyday favorite festival football fountain friendly gardener goldfish grateful hospital keyboard laughter learning lemonade mountain mushroom notebook painting peaceful platform pleasant practice princess question sandwich scissors seashore shoulder snowball squirrel starfish sunlight sunshine surprise swimming teamwork teaspoon tomorrow treasure triangle tropical umbrella universe vacation valuable woodland'.split(' '),
};

Object.values(answers).flat().forEach(word => validWords.add(word));
export function isWord(word: string): boolean {
  return validWords.has(word.toLowerCase());
}
export function chooseWord(length: WordLength, previous?: string): string {
  const pool = answers[length].filter(word => word !== previous?.toLowerCase());
  return pool[Math.floor(Math.random() * pool.length)].toUpperCase();
}
