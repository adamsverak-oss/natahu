# NaTahu MVP

## Proc zrovna tenhle projekt

NaTahu je dost prakticke, aby to rodina opravdu pouzivala, ale zaroven dostatecne zajimave, aby to pusobilo jako skutecny software projekt.

## Produktovy smer

Aplikace je urcena pro malou uzavrenou skupinu uzivatelu. V tomto pripade jde o 4 cleny rodiny. Nepotrebujeme slozite registrace, emaily ani verejne pozvanky.

## Uzivatelske role

### Admin

- spravuje rodinne ucty
- resetuje hesla
- pridava a upravuje ukoly
- vidi vsechny seznamy a statistiky

### Clen rodiny

- vidi sve ukoly
- vidi spolecne ukoly
- muze pridavat nakupni polozky
- muze oznacovat splnene ukoly

## Hlavni moduly

### 1. Dashboard

Ukazuje:

- dnesni datum
- seznam dnesnich povinnosti
- cloveka, ktery je dnes na tahu
- rychle tlacitko pro pridani ukolu
- nahled nakupniho seznamu

### 2. Kalendar

Umoznuje:

- zobrazit ukoly po dnech
- vytvaret jednorazove ukoly
- nastavit opakovani
- filtrovat podle clena rodiny

### 3. Rodina

Umoznuje:

- zobrazit cleny rodiny
- zobrazit pocet splnenych ukolu
- zobrazit aktualni rozdeleni zodpovednosti

### 4. Nakupni seznam

Umoznuje:

- pridat polozku
- priradit nakup osobe
- oznacit polozku jako koupenou
- zobrazit aktivni a hotove polozky

## MVP datovy model

### User

- id
- name
- username
- password_hash
- role
- color

### Task

- id
- title
- notes
- assigned_user_id
- due_date
- status
- repeat_rule
- created_by_user_id

### ShoppingItem

- id
- title
- assigned_user_id
- status
- created_by_user_id

## Hosting zdarma

### Co budeme pouzivat

- Vercel: hostovani aplikace zdarma
- Neon: Postgres databaze zdarma

### Co to znamena v praxi

- aplikace bude online pres odkaz
- na `localhost` ji budes poustet jen pri vyvoji
- rodina bude chodit na verejnou adresu po nasazeni

## Bezpecnost jednoduse

- zadne emaily
- zadne verejne registrace
- pouze predem vytvorene rodinne ucty
- admin umi heslo zmenit, ne precist puvodni heslo

## Doporucena prvni implementace

1. Postavit prihlaseni
2. Udelat dashboard
3. Pridat tasky
4. Pridat kalendar
5. Pridat rodinu a statistiky
6. Pridat nakupni seznam
