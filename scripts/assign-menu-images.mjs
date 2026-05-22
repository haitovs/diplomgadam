import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'menu-items.json');

const Q = '?w=800&q=80&auto=format&fit=crop';
const U = (id) => `https://images.unsplash.com/photo-${id}${Q}`;

// Each pool now has 12+ images so cycling produces real variety even when
// dozens of items map to the same pool.
const POOLS = {
  steak: [
    U('1558030006-450675393462'),
    U('1544025162-d76694265947'),
    U('1600891964092-4316c288032e'),
    U('1546964124-0cce460f38ef'),
    U('1607623814075-e51df1bdc82f'),
    U('1606664515524-ed2f786a0bd6'),
    U('1615937657715-bc7b4b7962fd'),
    U('1633237308525-cd587cf71926'),
    U('1574484184081-afea8a62f9d6'),
    U('1607013251379-e6eecfffe234'),
    U('1551028150-64b9f398f678'),
    U('1432139509613-5c4255815697'),
  ],
  pilaf: [
    U('1565557623262-b51c2513a641'),
    U('1596797038530-2c107229654b'),
    U('1604152135912-04a022e23696'),
    U('1626777552726-4a6b54c97e46'),
    U('1631515243349-e0cb75fb8d3a'),
    U('1589302168068-964664d93dc0'),
    U('1543339494-b4cd4f7ba686'),
    U('1551326844-4df70f78d0e9'),
    U('1551183053-bf91a1d81141'),
    U('1547928576-b822bcced286'),
  ],
  manty: [
    U('1625938145744-533e82c4eb35'),
    U('1496116218417-1a781b1c416c'),
    U('1625944230945-1b7dd3b949ab'),
    U('1626804475297-41608ea09aeb'),
    U('1626844131082-256783844137'),
    U('1626777553635-5f0f1d4ae2c4'),
    U('1614545006005-e3b2fa5d4f50'),
    U('1601050690597-df0568f70950'),
  ],
  kebab: [
    U('1599487488170-d11ec9c172f0'),
    U('1529193591184-b1d58069ecdd'),
    U('1633237308525-cd587cf71926'),
    U('1599487487752-b13e0afe1d7f'),
    U('1606755962773-d324e0a13086'),
    U('1607013251379-e6eecfffe234'),
    U('1555939594-58d7cb561ad1'),
    U('1544025162-d76694265947'),
    U('1546833999-b9f581a1996d'),
    U('1574484184081-afea8a62f9d6'),
  ],
  fish: [
    U('1535140728325-a4d3707eee94'),
    U('1519708227418-c8fd9a32b7a2'),
    U('1485921325833-c519f76c4927'),
    U('1467003909585-2f8a72700288'),
    U('1580959375944-abd7e991f971'),
    U('1599487487895-3001d3f5a05c'),
    U('1611599537845-1c7aca0091c0'),
    U('1535399831218-d5bd36d1a6b3'),
  ],
  shrimp: [
    U('1625944525200-4d4f1d29c9c1'),
    U('1565680018434-b513d5e5fd47'),
    U('1559339352-11d035aa65de'),
    U('1611599538835-b52a8c2af7fe'),
    U('1565299585323-38d6b0865b47'),
    U('1626778035893-9e0f4dba29b6'),
  ],
  pasta: [
    U('1551183053-bf91a1d81141'),
    U('1473093226795-af9932fe5856'),
    U('1621996346565-e3dbc646d9a9'),
    U('1546549032-9571cd6b27df'),
    U('1572441713132-51c75654db73'),
    U('1556761175-b413da4baf72'),
    U('1563379091339-03b21ab4a4f8'),
    U('1572695157366-5e585ab2b69f'),
    U('1612874742237-6526221588e3'),
    U('1601312378427-822b2b41da35'),
  ],
  pizza: [
    U('1513104890138-7c749659a591'),
    U('1565299624946-b28f40a0ae38'),
    U('1574071318508-1cdbab80d002'),
    U('1571066811602-716837d681de'),
    U('1604068549290-dea0e4a305ca'),
    U('1593560708920-61dd98c46a4e'),
    U('1590947132387-155cc02f3212'),
    U('1565299507177-b0ac66763828'),
  ],
  burger: [
    U('1568901346375-23c9450c58cd'),
    U('1571091718767-18b5b1457add'),
    U('1586190848861-99aa4a171e90'),
    U('1550317138-10000687a72b'),
    U('1607013251379-e6eecfffe234'),
    U('1551782450-a2132b4ba21d'),
    U('1572802419224-296b0aeee0d9'),
    U('1606131731446-5568d87113aa'),
  ],
  sandwich: [
    U('1528735602780-2552fd46c7af'),
    U('1539252554935-80c8cb1fb0d5'),
    U('1481070414801-51fd732d7184'),
    U('1521986329282-0436c1f1e212'),
    U('1554433607-66b5efe9d304'),
    U('1509722747041-616f39b57569'),
  ],
  soup: [
    U('1547592180-85f173990554'),
    U('1547308283-b75f6a9a3296'),
    U('1604152135912-04a022e23696'),
    U('1583608205776-bfd35f0d9f83'),
    U('1547308283-b75f6a9a3296'),
    U('1606756790138-261d2b21cd75'),
    U('1539252554935-80c8cb1fb0d5'),
    U('1569718212165-3a8278d5f624'),
    U('1605379399642-870262d3d051'),
    U('1604908554175-2a05f8a85ea3'),
  ],
  lentilSoup: [
    U('1583608205776-bfd35f0d9f83'),
    U('1547592180-85f173990554'),
    U('1547308283-b75f6a9a3296'),
    U('1604908554175-2a05f8a85ea3'),
    U('1604152135912-04a022e23696'),
  ],
  salad: [
    U('1546069901-ba9599a7e63c'),
    U('1512621776951-a57141f2eefd'),
    U('1505253758473-96b7015fcd40'),
    U('1540420773420-3366772f4999'),
    U('1490645935967-10de6ba17061'),
    U('1607532941433-304659e8198a'),
    U('1551248429-40975aa4de74'),
    U('1623428187969-5da2dcea5ebf'),
    U('1607013251379-e6eecfffe234'),
    U('1604152135912-04a022e23696'),
  ],
  somsa: [
    U('1601050690597-df0568f70950'),
    U('1626074353765-517a681e40be'),
    U('1625938145744-533e82c4eb35'),
    U('1496116218417-1a781b1c416c'),
    U('1614545006005-e3b2fa5d4f50'),
  ],
  dessertCake: [
    U('1551024601-bec78aea704b'),
    U('1565958011703-44f9829ba187'),
    U('1606890737304-57a1ca8a5b62'),
    U('1571877227200-a0d98ea607e9'),
    U('1565299624946-b28f40a0ae38'),
    U('1488477181946-6428a0291777'),
    U('1505253213348-cd54c92b37ef'),
    U('1606313564200-e75d5e30476c'),
    U('1567206563064-6f60f40a2b57'),
    U('1599785209707-a456fc1337c1'),
    U('1612203985729-70726954388c'),
    U('1602080858427-90fee736dde0'),
  ],
  tiramisu: [
    U('1571877227200-a0d98ea607e9'),
    U('1606313564200-e75d5e30476c'),
    U('1551024601-bec78aea704b'),
    U('1606890737304-57a1ca8a5b62'),
  ],
  iceCream: [
    U('1567206563064-6f60f40a2b57'),
    U('1488477181946-6428a0291777'),
    U('1563805042-7684c019e1cb'),
    U('1501443762994-82bd5dace89a'),
    U('1576506295286-5cda18df43e7'),
    U('1505253213348-cd54c92b37ef'),
  ],
  fruit: [
    U('1610917040803-1fccf9623064'),
    U('1571575173700-afb9492e6a50'),
    U('1546630392-7adbbed9c5e1'),
    U('1490474504059-bf2db5ab2348'),
    U('1502741338009-cac2772e18bc'),
    U('1572635196237-14b3f281503f'),
  ],
  baklava: [
    U('1598110750624-207050c4f28c'),
    U('1519676867240-f03562e64548'),
    U('1606313564200-e75d5e30476c'),
    U('1565958011703-44f9829ba187'),
    U('1571877227200-a0d98ea607e9'),
  ],
  halva: [
    U('1505253213348-cd54c92b37ef'),
    U('1488477181946-6428a0291777'),
    U('1606313564200-e75d5e30476c'),
    U('1598110750624-207050c4f28c'),
  ],
  bread: [
    U('1509440159596-0249088772ff'),
    U('1586444248902-2f64eddc13df'),
    U('1568471173242-461f0a730452'),
    U('1549931319-a545dcf3bc73'),
    U('1597314213421-fd2c5b87b0a4'),
    U('1567593810070-7a3d471af022'),
    U('1591985666643-1ecc67616216'),
    U('1574085733277-851d9d856a3a'),
  ],
  pastry: [
    U('1555507036-ab1f4038808a'),
    U('1509440159596-0249088772ff'),
    U('1568471173242-461f0a730452'),
    U('1606313564200-e75d5e30476c'),
    U('1565958011703-44f9829ba187'),
    U('1567593810070-7a3d471af022'),
  ],
  fries: [
    U('1573080496219-bb080dd4f877'),
    U('1630431341973-02e1b662ec35'),
    U('1576107232684-1279f390859f'),
    U('1606755962773-d324e0a13086'),
    U('1607013284055-92cd6ad2c8b9'),
  ],
  mash: [
    U('1604908554175-2a05f8a85ea3'),
    U('1551183053-bf91a1d81141'),
    U('1604152135912-04a022e23696'),
    U('1547592180-85f173990554'),
  ],
  veggies: [
    U('1540420773420-3366772f4999'),
    U('1512058564366-18510be2db19'),
    U('1546069901-ba9599a7e63c'),
    U('1607532941433-304659e8198a'),
    U('1490645935967-10de6ba17061'),
    U('1623428187969-5da2dcea5ebf'),
    U('1604908554175-2a05f8a85ea3'),
  ],
  coffee: [
    U('1509042239860-f550ce710b93'),
    U('1497935586351-b67a49e012bf'),
    U('1517663154410-bb1ea4910dba'),
    U('1572442388796-11668a67e53d'),
    U('1510707577719-ae7c14805e3a'),
    U('1561882468-9110e03e0f78'),
    U('1561047029-3000c68339ca'),
    U('1517701604599-bb29b565090c'),
    U('1556679343-c7306c1976bc'),
    U('1495474472287-4d71bcdd2085'),
  ],
  espresso: [
    U('1510707577719-ae7c14805e3a'),
    U('1572442388796-11668a67e53d'),
    U('1497935586351-b67a49e012bf'),
    U('1509042239860-f550ce710b93'),
    U('1495474472287-4d71bcdd2085'),
  ],
  cappuccino: [
    U('1572442388796-11668a67e53d'),
    U('1561882468-9110e03e0f78'),
    U('1509042239860-f550ce710b93'),
    U('1561047029-3000c68339ca'),
    U('1517663154410-bb1ea4910dba'),
    U('1495474472287-4d71bcdd2085'),
  ],
  latte: [
    U('1561882468-9110e03e0f78'),
    U('1561047029-3000c68339ca'),
    U('1517701604599-bb29b565090c'),
    U('1497935586351-b67a49e012bf'),
    U('1572442388796-11668a67e53d'),
    U('1509042239860-f550ce710b93'),
    U('1517663154410-bb1ea4910dba'),
    U('1495474472287-4d71bcdd2085'),
  ],
  iceCoffee: [
    U('1517701604599-bb29b565090c'),
    U('1556679343-c7306c1976bc'),
    U('1561047029-3000c68339ca'),
    U('1561882468-9110e03e0f78'),
    U('1572442388796-11668a67e53d'),
  ],
  tea: [
    U('1564890369478-c89ca6d9cde9'),
    U('1597318236837-46f99b3a5dfd'),
    U('1556679343-c7306c1976bc'),
    U('1576092768241-dec231879fc3'),
    U('1597481499666-fcaa3b03ee87'),
    U('1545665225-b23b99e4d45e'),
  ],
  greenTea: [
    U('1556679343-c7306c1976bc'),
    U('1564890369478-c89ca6d9cde9'),
    U('1597318236837-46f99b3a5dfd'),
    U('1576092768241-dec231879fc3'),
  ],
  juice: [
    U('1600271886742-f049cd451bba'),
    U('1622597467836-f3285f2131b8'),
    U('1623428187969-5da2dcea5ebf'),
    U('1437418747212-8d9709afab22'),
    U('1546630392-7adbbed9c5e1'),
    U('1502741338009-cac2772e18bc'),
    U('1572635196237-14b3f281503f'),
  ],
  lemonade: [
    U('1523677011781-c91d1bbe2f9e'),
    U('1556679343-c7306c1976bc'),
    U('1546630392-7adbbed9c5e1'),
    U('1622597467836-f3285f2131b8'),
    U('1600271886742-f049cd451bba'),
  ],
  yogurt: [
    U('1488477181946-6428a0291777'),
    U('1571212515416-fef01fc43637'),
    U('1505253213348-cd54c92b37ef'),
    U('1563805042-7684c019e1cb'),
  ],
  mainPlate: [
    U('1546833999-b9f581a1996d'),
    U('1565299624946-b28f40a0ae38'),
    U('1559054663-e8d23213f55c'),
    U('1544025162-d76694265947'),
    U('1546069901-ba9599a7e63c'),
    U('1551183053-bf91a1d81141'),
    U('1604152135912-04a022e23696'),
    U('1565557623262-b51c2513a641'),
    U('1604908554175-2a05f8a85ea3'),
    U('1607013251379-e6eecfffe234'),
    U('1485921325833-c519f76c4927'),
    U('1551028150-64b9f398f678'),
    U('1574484184081-afea8a62f9d6'),
    U('1546549032-9571cd6b27df'),
    U('1563379091339-03b21ab4a4f8'),
  ],
  starter: [
    U('1541014741259-de529411b96a'),
    U('1551782450-a2132b4ba21d'),
    U('1546069901-ba9599a7e63c'),
    U('1505253758473-96b7015fcd40'),
    U('1512621776951-a57141f2eefd'),
    U('1490645935967-10de6ba17061'),
    U('1607532941433-304659e8198a'),
    U('1623428187969-5da2dcea5ebf'),
  ],
  drink: [
    U('1551024709-8f23befc6f87'),
    U('1437418747212-8d9709afab22'),
    U('1600271886742-f049cd451bba'),
    U('1622597467836-f3285f2131b8'),
    U('1546630392-7adbbed9c5e1'),
    U('1556679343-c7306c1976bc'),
    U('1502741338009-cac2772e18bc'),
  ],
};

function pickByKeyword(name, category) {
  const n = name.toLowerCase();
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
  if (/(kompot|sherbet|şerbet)/.test(n)) return POOLS.juice;
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

// Deterministic hash for stable per-restaurant offsets
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const items = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
// Per-pool counter so items in the same pool cycle through all images before repeating.
const poolUsage = new Map();

for (const item of items) {
  const pool = pickByKeyword(item.name, item.category);
  const counter = poolUsage.get(pool) ?? 0;
  // Per-restaurant offset: same dish name in different restaurants lands on
  // different photos. Same dish twice in the same restaurant still rotates
  // via the counter.
  const offset = hashStr(item.restaurant_id);
  item.image_url = pool[(counter + offset) % pool.length];
  poolUsage.set(pool, counter + 1);
}

fs.writeFileSync(dataPath, JSON.stringify(items, null, 2));

// Quick stats so we can see the spread.
const counts = new Map();
for (const it of items) counts.set(it.image_url, (counts.get(it.image_url) ?? 0) + 1);
const sorted = [...counts.values()].sort((a, b) => b - a);
console.log(`Updated ${items.length} menu items.`);
console.log(`Unique images: ${counts.size}. Worst repeat: ${sorted[0]}. Median: ${sorted[Math.floor(sorted.length / 2)]}.`);
