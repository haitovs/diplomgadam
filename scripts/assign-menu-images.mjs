import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'menu-items.json');

// Curated Unsplash images. Each list rotates so duplicate item names get visual variety.
const POOLS = {
  // Steaks, grilled meats, mains
  steak: [
    'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
    'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800&q=80',
  ],
  pilaf: [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80',
    'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=800&q=80',
  ],
  manty: [
    'https://images.unsplash.com/photo-1625938145744-533e82c4eb35?w=800&q=80',
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80',
  ],
  kebab: [
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=80',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80',
    'https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=800&q=80',
  ],
  fish: [
    'https://images.unsplash.com/photo-1535140728325-a4d3707eee94?w=800&q=80',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80',
  ],
  shrimp: [
    'https://images.unsplash.com/photo-1625944525200-4d4f1d29c9c1?w=800&q=80',
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&q=80',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
    'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80',
  ],
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80',
  ],
  sandwich: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80',
    'https://images.unsplash.com/photo-1539252554935-80c8cb1fb0d5?w=800&q=80',
  ],
  // Soups
  soup: [
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
    'https://images.unsplash.com/photo-1547308283-b75f6a9a3296?w=800&q=80',
    'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=800&q=80',
  ],
  lentilSoup: [
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
  ],
  // Starters / salads
  salad: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800&q=80',
  ],
  somsa: [
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80',
  ],
  // Desserts
  dessertCake: [
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80',
    'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&q=80',
  ],
  tiramisu: [
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80',
  ],
  iceCream: [
    'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=800&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
  ],
  fruit: [
    'https://images.unsplash.com/photo-1610917040803-1fccf9623064?w=800&q=80',
    'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=800&q=80',
  ],
  baklava: [
    'https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=800&q=80',
    'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800&q=80',
  ],
  halva: [
    'https://images.unsplash.com/photo-1505253213348-cd54c92b37ef?w=800&q=80',
  ],
  // Bread
  bread: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80',
    'https://images.unsplash.com/photo-1568471173242-461f0a730452?w=800&q=80',
  ],
  pastry: [
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  ],
  // Sides
  fries: [
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80',
    'https://images.unsplash.com/photo-1630431341973-02e1b662ec35?w=800&q=80',
  ],
  mash: [
    'https://images.unsplash.com/photo-1604908554175-2a05f8a85ea3?w=800&q=80',
  ],
  veggies: [
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
  ],
  // Drinks
  coffee: [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
    'https://images.unsplash.com/photo-1517663154410-bb1ea4910dba?w=800&q=80',
  ],
  espresso: [
    'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=800&q=80',
  ],
  cappuccino: [
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80',
  ],
  latte: [
    'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=800&q=80',
    'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&q=80',
  ],
  iceCoffee: [
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80',
  ],
  tea: [
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80',
    'https://images.unsplash.com/photo-1597318236837-46f99b3a5dfd?w=800&q=80',
  ],
  greenTea: [
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
  ],
  juice: [
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80',
    'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800&q=80',
  ],
  lemonade: [
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
    'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=800&q=80',
  ],
  yogurt: [
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
    'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=800&q=80',
  ],
  // Generic fallbacks
  mainPlate: [
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
    'https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=800&q=80',
  ],
  starter: [
    'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800&q=80',
    'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80',
  ],
  drink: [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
    'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=800&q=80',
  ],
};

function pickByKeyword(name, category) {
  const n = name.toLowerCase();
  // Specific keyword matches (Turkmen / English)
  if (/(steýk|steak|ribeye|t-bone|filet|biftek|tatar)/.test(n)) return POOLS.steak;
  if (/(palaw|pilaf|tüwi|tuwi|rice)/.test(n)) return POOLS.pilaf;
  if (/(manty|mantı|işlekli|isle|börek|borek|chebureki)/.test(n)) return POOLS.manty;
  if (/(kebap|kebab|şaşlyk|saşlyk|saslyk|gril (et|towuk|goýun|guzy)|tikka)/.test(n)) return POOLS.kebab;
  if (/(balyk|fish|losos|salmon|tunet|tuna)/.test(n)) return POOLS.fish;
  if (/(krewet|shrimp|prawn|kalmar|squid)/.test(n)) return POOLS.shrimp;
  if (/(pasta|spagetti|fettuc|makaron|lasanya|lasagna|raviol)/.test(n)) return POOLS.pasta;
  if (/(pizza|piza)/.test(n)) return POOLS.pizza;
  if (/(burger|gamburger)/.test(n)) return POOLS.burger;
  if (/(sendwiç|sendwich|sandwich|tost)/.test(n)) return POOLS.sandwich;
  if (/(merci?mek|nohut|lentil)/.test(n)) return POOLS.lentilSoup;
  if (/(çorba|şurpa|dograma|soup|şülpe|sülpe|borsh)/.test(n)) return POOLS.soup;
  if (/(salat|salad|sezar|caesar|tabule|tabbouleh)/.test(n)) return POOLS.salad;
  if (/(somsa|gutap|samsa)/.test(n)) return POOLS.somsa;
  if (/(tamdyr|nan|lavaş|lavash|çörek|chorek|bread)/.test(n)) return POOLS.bread;
  if (/(tiramisu)/.test(n)) return POOLS.tiramisu;
  if (/(fondan|brownie|şokolad torty|chocolate cake)/.test(n)) return POOLS.dessertCake;
  if (/(doňdurma|dondurma|ice cream|mors|sorbet|gelato)/.test(n)) return POOLS.iceCream;
  if (/(gawun|garpyz|fruit|miwe|alma|apple|melon|watermelon)/.test(n)) return POOLS.fruit;
  if (/(baklawa|baklava|pahlawa)/.test(n)) return POOLS.baklava;
  if (/(halwa|halva)/.test(n)) return POOLS.halva;
  if (/(pişme|pisme|piske|gawurma desert|donut|pampus|şeker|şerbet|kompot desert)/.test(n)) return POOLS.pastry;
  if (/(kartof fri|fri|frites|french fries)/.test(n)) return POOLS.fries;
  if (/(pýure|pyure|mash|purée|kartof)/.test(n)) return POOLS.mash;
  if (/(gök önüm|gok onum|veggie|veget|gril gök|salatk)/.test(n)) return POOLS.veggies;
  if (/(espresso)/.test(n)) return POOLS.espresso;
  if (/(kapuçino|cappuccino)/.test(n)) return POOLS.cappuccino;
  if (/(latte|raf|moçça|mocha|moca|flat white|kakao|hot chocolate)/.test(n)) return POOLS.latte;
  if (/(buzly kofe|iced|cold brew|frappuccino|frappuçino)/.test(n)) return POOLS.iceCoffee;
  if (/(amerikan|americano|kofe|coffee|kapcin)/.test(n)) return POOLS.coffee;
  if (/(gök çaý|gok cay|green tea|matcha)/.test(n)) return POOLS.greenTea;
  if (/(çaý|cay|tea|herbal)/.test(n)) return POOLS.tea;
  if (/(şire|sok|juice|fresh|smoothie|milkshake|şugar)/.test(n)) return POOLS.juice;
  if (/(limonad|lemonade)/.test(n)) return POOLS.lemonade;
  if (/(gatyk|aýran|ayran|kefir|yogurt|joghurt|doogh)/.test(n)) return POOLS.yogurt;
  if (/(kompot|sok|sherbet|şerbet)/.test(n)) return POOLS.juice;
  // Category fallbacks
  switch (category) {
    case 'Esasy': return POOLS.mainPlate;
    case 'Nahar': return POOLS.mainPlate;
    case 'Başlangyç': return POOLS.starter;
    case 'Goşmaça': return POOLS.veggies;
    case 'Çorba': return POOLS.soup;
    case 'Çörek': return POOLS.bread;
    case 'Desert': return POOLS.dessertCake;
    case 'Kofe': return POOLS.coffee;
    case 'Çaý': return POOLS.tea;
    case 'Içgi': return POOLS.drink;
    default: return POOLS.mainPlate;
  }
}

const items = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
// Round-robin per pool reference so different items mapping to the same pool
// (e.g. ribeye / filet / t-bone all go to POOLS.steak) cycle through varied images.
const poolUsage = new Map();

for (const item of items) {
  const pool = pickByKeyword(item.name, item.category);
  const idx = poolUsage.get(pool) ?? 0;
  item.image_url = pool[idx % pool.length];
  poolUsage.set(pool, idx + 1);
}

fs.writeFileSync(dataPath, JSON.stringify(items, null, 2));
console.log(`Updated ${items.length} menu items with images.`);
