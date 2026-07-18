const shadarKaiLore = [
 {type:"section", name:"Shadar-kai", entries:[
  "W mroku Cienistej Otchłani żyją shadar-kai, elfy, których przodkowie służyli Krucej Królowej, bogini śmierci i pamięci. Zostali sprowadzeni do tej krainy w dawnych wiekach, tak dawno temu, że są teraz przystosowani do jej ponurego środowiska, zarówno fizycznie, jak i psychicznie.",
  "Eony wystawienia na wpływ Cienistej Otchłani uczyniły shadar-kai często pozbawionymi radości i żałobnymi. W tej krainie mają blade włosy, pomarszczoną szarą skórę i spuchnięte stawy, które nadają im trupi wygląd. Wyglądają młodziej na innych płaszczyznach, lecz ich skóra zawsze zachowuje śmiertelnie popielaty odcień. Będąc w Cienistej Otchłani, nienawidzą luster i unikają trzymania rzeczy przypominających im o ich wieku.",
  "Shadar-kai Krucej Królowej czuwają zarówno nad Cienistą Otchłanią, jak i Płaszczyzną Materialną, wypatrując wybranych dusz i tragedii, które mogłyby zadowolić ich boginię. Krążą plotki, że potrafią kierować światowymi wydarzeniami ku tragicznym ścieżkom dla jej rozrywki. Kruca Królowa jest jednak notorycznie zagadkowa nawet wobec swych najbardziej oddanych wyznawców; ich wysiłki są wynagradzane jedynie niejasnymi omenami, które interpretują najlepiej, jak potrafią.",
  {name:"Forteca Wspomnień", type:"entries", entries:[
   "Shadar-kai najbardziej oddani Krucej Królowej służą jej w Fortecy Wspomnień, jej wykrzywionym zamku w Cienistej Otchłani. Forteca to żałobne miejsce, pełne nieustannych ech przeszłości. Stada kruków, które działają jako oczy i uszy Krucej Królowej, zaciemniają niebo wokół niej, gdy wyłaniają się z jej wnętrza, niosąc jej zagadkowe wiadomości i omeny daleko i szeroko po multiwersum.",
   "Wewnątrz fortecy znajdują się przedmioty, które Kruca Królowa uważa za nieodparte: obiekty przesiąknięte głębokim uczuciem smutku, tęsknoty lub żalu. Te przedmioty są jej przynoszone jako dary od shadar-kai i obejmują meble, zegary, lustra, klejnoty i zabawki. Widmowe wizje ludzi, miejsc i zwierząt domowych również pojawiają się w fortecy. Każda z tych rzeczy może spontanicznie pojawić się w jej legowisku, każdy przedmiot i zjawa będące metaforyczną reprezentacją jakiejś historii - wielkiej lub małej - przesiąkniętej surowymi emocjami.",
   "Shadar-kai napotykani poza Cienistą Otchłanią często są w trakcie misji poszukiwania najbardziej przesiąkniętych smutkiem przedmiotów, jakie mogą znaleźć, by przynieść je z powrotem do ponurego zamku swej królowej."
  ]}
 ]}
];

module.exports = {
"shadar-kai-shadow-dancer": {
 name: "Shadar-kai Cienista Tancerka",
 skills: "Skradanie +6",
 senses: "widzenie w ciemności 60 stóp, Bierna Percepcja 11",
 languages: "Wspólny, Elficki",
 traits: [
  {name: "Dziedzictwo Fey", entries: ["Shadar-kai ma przewagę w rzutach obronnych przeciw {@condition charmed}, a magia nie może go uśpić."]}
 ],
 actions: [
  {name: "Wieloatak", entries: [
   "Shadar-kai wykonuje trzy ataki Kolczastym Łańcuchem.",
   "Może użyć Cienistego Skoku po jednym z tych ataków."
  ]},
  {name: "Kolczasty Łańcuch", entries: [
   "{@atk mw} {@hit 6} do trafienia, zasięg 10 stóp, jeden cel. {@h}10 ({@damage 2d6 + 3}) obrażeń kłutych. Cel musi wykonać udany rzut obronny Zręczności {@dc 14} lub doznać jednego z poniższych efektów (wybierz jeden lub rzuć {@dice d6}):",
   {type:"list", style:"list-hang-notitle", items:[
    {name:"1-2: Rozkład", type:"item", entries:["Cel otrzymuje 22 ({@damage 4d10}) obrażeń nekrotycznych."]},
    {name:"3-4: Chwyt", type:"item", entries:["Cel zostaje {@condition grappled} (ucieczka {@dc 14}), jeśli jest Średnim lub mniejszym stworzeniem. Dopóki chwyt trwa, cel jest {@condition restrained}, a shadar-kai nie może chwycić innego celu."]},
    {name:"5-6: Powalenie", type:"item", entries:["Cel zostaje powalony."]}
   ]}
  ]}
 ],
 bonusActions: [
  {name: "Cienisty Skok", entries: ["Shadar-kai teleportuje się, wraz z całym noszonym lub niesionym ekwipunkiem, na odległość do 30 stóp do widzianej wolnej przestrzeni. Zarówno przestrzeń, z której się teleportuje, jak i przestrzeń, do której się teleportuje, muszą być w półmroku lub ciemności."]}
 ],
 lore: shadarKaiLore
},
"shadar-kai-soul-monger": {
 name: "Shadar-kai Handlarz Dusz",
 skills: "Percepcja +7",
 senses: "widzenie w ciemności 60 stóp, Bierna Percepcja 17",
 languages: "Wspólny, Elficki",
 traits: [
  {name: "Dziedzictwo Fey", entries: ["Shadar-kai ma przewagę w rzutach obronnych przeciw {@condition charmed}, a magia nie może go uśpić."]},
  {name: "Odporność na Magię", entries: ["Shadar-kai ma przewagę w rzutach obronnych przeciw czarom i innym magicznym efektom."]},
  {name: "Pragnienie Dusz", entries: ["Gdy zredukuje stworzenie do 0 punktów wytrzymałości, shadar-kai może zyskać tymczasowe punkty wytrzymałości równe połowie maksimum punktów wytrzymałości tego stworzenia. Dopóki shadar-kai ma tymczasowe punkty wytrzymałości z tej cechy, ma przewagę w rzutach na trafienie."]},
  {name: "Brzemię Wieków", entries: ["Dowolna Bestia lub Humanoid (poza elfem), który rozpoczyna swoją turę w promieniu 5 stóp od shadar-kai, ma prędkość zmniejszoną o 20 stóp do początku swojej następnej tury."]}
 ],
 spellcasting: [
  {name: "Rzucanie Czarów", entries: [
   "Shadar-kai rzuca jeden z poniższych czarów, bez komponentów materialnych, używając Inteligencji jako zdolności zaklinania (RO czaru {@dc 16}):",
   "1/dzień każdy: {@spell bestow curse}, {@spell finger of death}, {@spell gaseous form}, {@spell seeming}"
  ]}
 ],
 actions: [
  {name: "Wieloatak", entries: ["Shadar-kai wykonuje dwa ataki Cienistym Sztyletem."]},
  {name: "Cienisty Sztylet", entries: ["{@atk mw,rw} {@hit 7} do trafienia, zasięg 5 stóp lub dystans 20/60 stóp, jeden cel. {@h}13 ({@damage 4d4 + 3}) obrażeń kłutych plus 19 ({@damage 3d12}) obrażeń nekrotycznych, a cel ma utrudnienie w rzutach obronnych do końca następnej tury shadar-kai. {@hom}Sztylet magicznie wraca do dłoni shadar-kai zaraz po ataku dystansowym."]},
  {name: "Fala Znużenia {@recharge 4}", entries: ["Shadar-kai wydziela znużenie w 60-stopowym sześcianie. Każde stworzenie w tym obszarze musi wykonać rzut obronny Kondycji {@dc 16}. Przy porażce stworzenie otrzymuje 45 ({@damage 10d8}) obrażeń psychicznych i doznaje 1 poziomu {@condition exhaustion}. Przy sukcesie otrzymuje połowę obrażeń i nie zyskuje poziomu {@condition exhaustion}."]}
 ],
 lore: shadarKaiLore
},
"shadow": {
 name: "Cień",
 skills: "Skradanie +6",
 senses: "Widzenie w Ciemności 60 stóp, Bierna Percepcja 10",
 traits: [
  {name: "Amorficzny", entries: ["Cień może poruszać się przez przestrzeń tak wąską jak 1 cal, nie wydatkując na to dodatkowego ruchu."]},
  {name: "Słabość na Światło Słoneczne", entries: ["Przebywając w świetle słonecznym, cień ma {@variantrule Disadvantage|XPHB} w {@variantrule D20 Test|XPHB|Testach K20}."]}
 ],
 actions: [
  {name: "Wysysające Machnięcie", entries: ["{@atkr m} {@hit 4}, zasięg 5 stóp. {@h}5 ({@damage 1d6 + 2}) obrażeń nekrotycznych, a wartość Siły celu zmniejsza się o {@dice 1d4}. Cel umiera, jeśli redukuje to tę wartość do 0. Jeśli Humanoid zostanie zabity tym atakiem, Cień powstaje ze zwłok {@dice 1d4} godzin później."]}
 ],
 bonusActions: [
  {name: "Cienista Skrytość", entries: ["Będąc w {@variantrule Dim Light|XPHB} lub {@variantrule Darkness|XPHB}, cień wykonuje akcję {@action Hide|XPHB}."]}
 ],
 lore: [
  {type:"section", name:"Cień", entries:[
   "{@i Bezcielesny, Wysysający Życie Cień}",
   {type:"list", style:"list-hang-notitle", items:[
    {type:"item", name:"Siedlisko:", entry:"{@filter Płaszczyznowy (Cienista Otchłań)|bestiary|environment=planar, shadowfell}, {@filter Podmrok|bestiary|environment=underdark}, {@filter Miasto|bestiary|environment=urban}"},
    {type:"item", name:"Skarb:", entry:"Brak"}
   ]},
   "Cienie to bezcielesne Nieumarłe, które żywią się życiem. Nienawidzą żywych za posiadanie potencjału i witalności, których same utraciły.",
   "Cienie czają się w mrocznych, samotnych miejscach, zwykle w miejscach, które były dla nich znaczące za życia, lub w przeklętych miejscach związanych ze śmiercią, złowrogą magią lub Cienistą Otchłanią. Ich ofiary powstają jako nowe cienie i żerują na żywych.",
   "Cienie mogą przypominać sylwetki tego, kim były za życia, lub przybierać bardziej groźne formy. Rzuć kością lub wybierz wynik z tabeli Kształtów Cienia, by zainspirować się formą cienia i jego nawiedzeniem.",
   {type:"table", caption:"Kształty Cienia", colLabels:["k6","Cień Pojawia Się Jako..."], colStyles:["col-2 text-center","col-10"], rows:[
    ["1","Zniekształcony prześladowca czający się w lesie."],
    ["2","Czart zamieszkujący w pobliżu miejsca niegodziwego rytuału."],
    ["3","Chwytające dłonie nawiedzające dom skąpca."],
    ["4","Ponura postać z bajki, śledząca tych, którzy wypowiadają jej imię."],
    ["5","Jego cel, działający w niesamowitej pantomimie."],
    ["6","Złowrogi kapłan nawiedzający zbezczeszczone miejsce."]
   ]}
  ]}
 ]
},
"shadow-mm": {
 name: "Cień",
 skills: "Skradanie +4",
 senses: "widzenie w ciemności 60 stóp, Bierna Percepcja 10",
 traits: [
  {name: "Amorficzny", entries: ["Cień może poruszać się przez przestrzeń tak wąską jak 1 cal, bez konieczności przeciskania się."]},
  {name: "Cienista Skrytość", entries: ["Będąc w półmroku lub ciemności, cień może wykonać akcję {@action Hide} jako akcję dodatkową. Jego premia do skradania jest też zwiększona do +6."]},
  {name: "Słabość na Światło Słoneczne", entries: ["Przebywając w świetle słonecznym, cień ma utrudnienie w rzutach na trafienie, testach cech i rzutach obronnych."]}
 ],
 actions: [
  {name: "Wysysanie Siły", entries: ["{@atk mw} {@hit 4} do trafienia, zasięg 5 stóp, jedno stworzenie. {@h}9 ({@damage 2d6 + 2}) obrażeń nekrotycznych, a wartość Siły celu zostaje zmniejszona o {@dice 1d4}. Cel umiera, jeśli redukuje to jego Siłę do 0. W przeciwnym razie redukcja trwa, dopóki cel nie zakończy krótkiego lub długiego odpoczynku.",
   "Jeśli nie-zły humanoid umiera od tego ataku, nowy {@creature shadow} powstaje ze zwłok {@dice 1d4} godzin później."]}
 ],
 lore: [
  {type:"entries", entries:[
   {type:"entries", entries:[
    "Cienie to nieumarli przypominający mroczne wyolbrzymienia humanoidalnych cieni.",
    {name:"Mroczne Usposobienie", type:"entries", entries:[
     "Z ciemności cień sięga, by żywić się witalnością żywych stworzeń. Mogą pochłaniać dowolne żywe stworzenie, lecz szczególnie przyciągają ich stworzenia nieskażone złem. Stworzenie żyjące życiem dobroci i pobożności zsyła swoje najniższe impulsy i najsilniejsze pokusy w ciemność, gdzie łakną cienie. Gdy cień wysysa siłę i formę fizyczną ofiary, cień ofiary ciemnieje i zaczyna poruszać się z własnej woli. W śmierci cień stworzenia uwalnia się, stając się nowym nieumarłym cieniem, głodnym kolejnego życia do pochłonięcia.",
     "Jeśli stworzenie, z którego powstał cień, w jakiś sposób powraca do życia, jego nieumarły cień wyczuwa ten powrót. Cień może szukać swojego \"rodzica\", by go dręczyć lub zabić. Bez względu na to, czy cień ściga swój żywy odpowiednik, stworzenie, które zrodziło cień, nie rzuca już cienia, dopóki potwór nie zostanie zniszczony."
    ]},
    {name:"Natura Nieumarłego", type:"entries", entries:["Cień nie potrzebuje powietrza, jedzenia, picia ani snu"]}
   ]}
  ]}
 ]
},
"shadow-dancer": {
 name: "Cienista Tancerka",
 skills: "Skradanie +6",
 senses: "widzenie w ciemności 60 stóp, Bierna Percepcja 11",
 languages: "Wspólny, Elficki",
 traits: [
  {name: "Dziedzictwo Fey", entries: ["Cienista tancerka ma przewagę w rzutach obronnych przeciw {@condition charmed}, a magia nie może jej uśpić."]},
  {name: "Cienisty Skok", entries: ["Jako akcję dodatkową, cienista tancerka może teleportować się na odległość do 30 stóp do widzianej wolnej przestrzeni. Zarówno przestrzeń, z której się teleportuje, jak i przestrzeń, do której się teleportuje, muszą być w półmroku lub ciemności. Cienista tancerka może użyć tej zdolności między atakami bronią innej wykonywanej akcji."]}
 ],
 actions: [
  {name: "Wieloatak", entries: ["Cienista tancerka wykonuje trzy ataki kolczastym łańcuchem."]},
  {name: "Kolczasty Łańcuch", entries: [
   "{@atk mw} {@hit 6} do trafienia, zasięg 10 stóp, jeden cel. {@h}10 ({@damage 2d6 + 3}) obrażeń kłutych, a cel musi wykonać udany rzut obronny Zręczności {@dc 14} lub doznać jednego dodatkowego efektu wedle wyboru cienistej tancerki:",
   {type:"list", items:[
    "Cel zostaje {@condition grappled} (ucieczka {@dc 14}), jeśli jest Średnim lub mniejszym stworzeniem. Dopóki chwyt trwa, cel jest {@condition restrained}, a cienista tancerka nie może chwycić innego celu.",
    "Cel zostaje powalony.",
    "Cel otrzymuje 22 ({@damage 4d10}) obrażeń nekrotycznych."
   ]}
  ]}
 ],
 lore: [
  {type:"section", name:"Cienista Tancerka", entries:["Ci, którzy walczyli z cienistymi tancerkami, opisują to doświadczenie jako podobne do walki z żywą ciemnością. Każdy mroczny zaułek i przyciemniony kącik to miejsce, z którego zwinne i akrobatyczne cieniste tancerki mogą wyłonić się, by zasadzić się na swą zdobycz. Używając tej taktyki, atakują swoich wrogów ze wszystkich kątów gradem oplatających łańcuchów, które trzymają mocno i korumpują ciało. Gdy ich zdobycz jest bezradna, inne dołączają, by pomóc dobić ofiarę. Następnie plądrują zwłoki w poszukiwaniu drobiazgów, czegokolwiek kolorowego i żywego, na co można patrzeć po powrocie do mroku Cienistej Otchłani."]},
  {type:"section", name:"Shadar-kai", entries:[
   "W wiecznym mroku Cienistej Otchłani żyje społeczeństwo służące Krucej Królowej. Zostali sprowadzeni do tej mrocznej krainy w dawnych wiekach, tak dawno temu, że są teraz doskonale przystosowani do tego ponurego środowiska, zarówno fizycznie, jak i psychicznie.",
   {type:"entries", entries:[
    {type:"entries", entries:[
     {name:"Strażnicy Dusz", type:"entries", entries:["Shadar-kai czuwają zarówno nad Cienistą Otchłanią, jak i światem materialnym, wypatrując wybranych dusz i tragedii, które mogłyby zadowolić ich boginię. Krążą plotki, że potrafią kierować światowymi wydarzeniami ku tragicznym ścieżkom dla jej rozrywki. Kruca Królowa jest jednak notorycznie zagadkowa nawet wobec swych najbardziej oddanych wyznawców. Wysiłki shadar-kai są wynagradzane jedynie niejasnymi omenami, które interpretują najlepiej, jak potrafią."]},
     {name:"Zwiędnięte Elfy", type:"entries", entries:["Shadar-kai byli niegdyś elfami, lecz eony wystawienia na osłabiający wpływ Cienistej Otchłani uczyniły ich pozbawionymi radości i żałobnymi. W tej krainie mają wygląd uschniętych elfów: blade włosy, pomarszczoną szarą skórę i spuchnięte stawy, które nadają im trupi wygląd. Wyglądają młodziej na innych płaszczyznach, lecz ich skóra zawsze zachowuje swą śmiertelną bladość. Ubierają się w mroczne płaszcze i ciężkie welony, nienawidzą luster i unikają trzymania rzeczy przypominających im o ich wieku."]}
    ]}
   ]}
  ]}
 ]
},
"shadow-demon": {
 name: "Cienisty Demon",
 skills: "Skradanie +7",
 senses: "Widzenie w Ciemności 120 stóp, Bierna Percepcja 11",
 languages: "Otchłanny; telepatia 120 stóp",
 traits: [
  {name: "Demoniczne Odrodzenie", entries: ["Jeśli demon umiera poza Otchłanią, jego ciało rozpuszcza się w ichor, i natychmiast zyskuje nowe ciało, odradzając się ze wszystkimi {@variantrule Hit Points|XPHB} gdzieś w Otchłani."]},
  {name: "Ruch Bezcielesny", entries: ["Demon może poruszać się przez inne stworzenia i przedmioty, jakby były {@variantrule Difficult Terrain|XPHB}. Otrzymuje 5 ({@damage 1d10}) obrażeń siłowych, jeśli zakończy swoją turę wewnątrz przedmiotu."]},
  {name: "Wrażliwość na Światło", entries: ["Będąc w {@variantrule Bright Light|XPHB}, demon ma {@variantrule Disadvantage|XPHB} w testach cech i rzutach na trafienie."]}
 ],
 actions: [
  {name: "Mroczny Pazur", entries: ["{@atkr m} {@hit 5}, zasięg 5 stóp. {@h}16 ({@damage 3d8 + 3}) obrażeń psychicznych."]}
 ],
 bonusActions: [
  {name: "Cienista Skrytość", entries: ["Będąc w {@variantrule Dim Light|XPHB} lub {@variantrule Darkness|XPHB}, demon wykonuje akcję {@action Hide|XPHB}."]}
 ],
 lore: [
  {type:"section", name:"Cienisty Demon", entries:[
   "{@i Pozostałość Zła}",
   {type:"list", style:"list-hang-notitle", items:[
    {type:"item", name:"Siedlisko:", entry:"{@filter Płaszczyznowy (Otchłań)|bestiary|environment=planar, abyss}"},
    {type:"item", name:"Skarb:", entry:"Brak"}
   ]},
   "Cieniste demony powstają, gdy wyjątkowo niegodziwe demony zostają zniszczone i uniemożliwione odtworzenie swych fizycznych form w Otchłani. Może się to zdarzyć z powodu boskiej interwencji, gdy demon zostaje zniszczony w Otchłani, lub w bardziej niezwykłych okolicznościach. Cieniste demony to bezcielesne pozostałości zła tych zniszczonych demonów. Zwykle niewyraźnie przypominają swoje dawne kształty, lecz niektóre przybierają celowo zwodnicze formy. Wiele czai się w mrocznych miejscach lub wychodzi tylko nocą, by ukryć swoje prawdziwe formy przed tymi, którymi manipulują.",
   "Cieniste demony szukają sposobów, by odzyskać swą dawną moc i zemścić się na tych, którzy je zniszczyli. Często przypochlebiają się potężniejszym demonom lub śmiertelnym zaklinaczom, targując się i zmuszając innych, by przywrócili im moc. Wiele stara się przejąć lub skorumpować dusze, by przywrócić swe czartowskie formy, podczas gdy niektóre cieniste demony szukają niegodziwych reliktów lub węzłów bezbożnej magii. Zwykle zajmuje cienistym demonom wieki, by odzyskać swą demoniczną moc, jeśli w ogóle im się to uda.",
   "Szczególnie potężne demony mogą powrócić jako wiele cienistych demonów po pokonaniu. Te czartowskie istoty każda uważa się za prawdziwą manifestację swego dawnego ja i polują na siebie nawzajem, by odzyskać moc.",
   "W rzadkich przypadkach Czarty inne niż demony mogą przyjąć formy podobne do cienistych demonów.",
   {type:"insetReadaloud", entries:[
    {type:"quote", entries:["Istnieją trzy zasady zakończeń. Po pierwsze, dobro zawsze zwycięża. Po drugie, zło zawsze powraca. Po trzecie, pierwsza zasada nie zawsze jest prawdziwa."]-splice, by:"Tarsheva Longreach, Podróżniczka Płaszczyzn"}
   ]}
  ]}
 ]
}
};
