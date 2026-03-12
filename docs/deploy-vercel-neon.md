# Nasazeni NaTahu zdarma

## 1. Ziskani DATABASE_URL z Neonu

1. Otevri Neon dashboard.
2. Vytvor novy project.
3. V detailu projektu otevri connection details.
4. Zkopiruj `DATABASE_URL`.

## 2. Lokalni nastaveni

V koreni projektu vytvor `.env.local`:

```bash
DATABASE_URL="sem-vloz-neon-url"
```

Pak spust:

```bash
npm install
npm run setup-db
npm run dev
```

## 3. Co setup udela

- vytvori tabulky `users`, `tasks`, `shopping_items`, `sessions`
- vlozi 4 rodinne ucty
- hesla ulozi bezpecne jako hash

## 4. Prihlasovaci udaje

- `adam / natahu123`
- `veronika / rodina123`
- `gustav / domov123`
- `daniel / ukol123`

## 5. Nasazeni na Vercel

1. Nahraj projekt do GitHub repozitare.
2. Ve Vercelu klikni na `Add New...` a `Project`.
3. Importuj GitHub repozitar.
4. V sekci Environment Variables pridej:

```bash
DATABASE_URL=sem-vloz-neon-url
```

5. Klikni na Deploy.

## 6. Bezpecnost

- zadna verejna registrace
- bez prihlaseni nejsou rodinna data dostupna
- hesla nejsou ulozena citelne
- session je v `httpOnly` cookie
- `Daniel` nema prava pro pridavani ukolu a nakupu
