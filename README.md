# NaTahu

NaTahu je jednoducha rodinna webova aplikace pro rozpis povinnosti, kalendar, nakupni seznam a prehled toho, kdo je zrovna na tahu.

## Cil projektu

Udelat moderni webovou aplikaci, kterou budou moct pouzivat 4 clenove rodiny:

- odkudkoliv pres telefon nebo pocitac
- zdarma na free hostingu
- bez emailu, jen pres jmeno a heslo
- s adminem, ktery muze ostatnim resetovat heslo

## Prvni verze

Prvni verze bude obsahovat:

- prihlaseni pres jmeno a heslo
- domovskou stranku s dnesnimi povinnostmi
- kartu "Kdo je dnes na tahu"
- rychle pridani ukolu
- kalendar ukolu podle dni
- opakovane povinnosti
- stranku Rodina s prehledem clenu a poctem splnenych ukolu
- nakupni seznam s prirazeni osoby

## Doporuceny stack zdarma

### Frontend a aplikace

- Next.js
- TypeScript
- Tailwind CSS

### Prihlaseni

- vlastni prihlaseni pres username + password
- hesla ulozena bezpecne jako hash
- session pres secure cookies

### Databaze

- Neon Postgres free plan

### Hosting

- Vercel free plan

To znamena:

- web pobezi online na verejne adrese
- databaze bude online zdarma
- pro malou rodinnou appku by to melo stacit

## Pro vas dulezite rozhodnuti

Nebudeme ukladat hesla tak, aby sla precist. To by nebylo bezpecne.

Misto toho bude fungovat:

- kazdy ma sve jmeno a heslo
- ty budes admin
- kdyz nekdo heslo zapomene, nastavis mu nove

## Jaka bude struktura aplikace

### Hlavni stranka

- dnesni povinnosti
- kdo je dnes na tahu
- rychle pridani ukolu
- kratky prehled nakupu

### Kalendar

- mesicni a tydenni pohled
- ukoly podle dnu
- opakovane ulohy

### Rodina

- seznam 4 clenu
- statistika splnenych ukolu
- poradi podle aktivity

### Nakupni seznam

- polozky k nakupu
- kdo je koupi
- odskrtavani hotovych veci

## Co bude pozdeji

- notifikace
- body a odmeny
- vtipne badge typu "Kral domacnosti"
- barevne profily clenu rodiny
- instalace na mobil jako PWA

## Dalsi krok

Dalsi faze je zalozit samotnou aplikaci a pripravit:

- uvodni obrazovku
- prihlaseni
- databazovy model
- prvni funkcni dashboard

## Spusteni lokalne

Po nainstalovani Node.js staci:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Pak otevres:

- `http://localhost:3000` na tomto pocitaci
- `http://IP_ADRESA_TVEHO_MACU:3000` na druhem pocitaci nebo mobilu ve stejne siti

## Prihlasovaci udaje

- `adam / natahu123`
- `veronika / rodina123`
- `gustav / domov123`
- `daniel / ukol123`

## Bezpecne nasazeni na internet

Pro verejnou verzi pouzivame:

- `Vercel` na hosting zdarma
- `Neon Postgres` na databazi zdarma
- hesla ulozena jako hash
- session cookie na serveru
- zadna verejna registrace

### Co nastavit

1. V Neonu vytvor projekt a zkopiruj `DATABASE_URL`
2. V projektu vytvor `.env.local` a vloz tam:

```bash
DATABASE_URL="sem-vloz-neon-connection-string"
```

3. Spust databazovy setup:

```bash
npm run setup-db
```

4. Pak spust aplikaci:

```bash
npm run dev
```

5. Ve Vercelu nastav stejnou promennou `DATABASE_URL`

## Aktualni stav

Prvni verze uz obsahuje:

- prihlaseni pres jmeno a heslo
- domovskou obrazovku
- dnesni povinnosti
- prehled clenu rodiny
- blizici se ukoly
- nakupni seznam
- sdilena data ulozena na serveru v `data/natahu.json`
